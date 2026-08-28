import prisma from "../../config/prisma.js";
import { BlockType } from "../../generated/prisma/client.ts";
import {
    createAvailabilityBlock,
    deleteAvailabilityBlock,
    endAvailabilityBlock,
    findActiveRentalPolicy,
    findAvailabilityBlockById,
    findAvailabilityBlocks,
    findAvailableRentalUnits,
    findBlockingReservationsForUnit,
    findRentalUnitById,
} from "./availability.repository.js";
import { validateUuidValue } from "../../utils/validation.js";
import {
    getReservationBlockPeriod,
    normalizeRentalPeriod,
} from "../../utils/rentalPeriod.js";

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


// Kiểm tra tính khả dụng của sản phẩm cho thuê
const checkAvailability = async ({ garmentId, requestedSize, quantity, rentalStartAt, returnDueAt, db }) => {
    const {
        rentalStartAt: start,
        returnDueAt: end,
    } = normalizeRentalPeriod(
        rentalStartAt,
        returnDueAt
    );
    if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error("INVALID_QUANTITY");
    }
    // Kiểm tra chính sách thuê hiện tại
    const policy = await findActiveRentalPolicy(new Date(), db);
    // Nếu không có chính sách thuê nào, trả về false
    if (!policy) {
        throw new Error("RENTAL_POLICY_NOT_FOUND");
    }
    const {
        blockedStartAt: blockStartAt,
        blockedEndAt: blockEndAt,
    } = getReservationBlockPeriod(start, end);
    const availableUnits = await findAvailableRentalUnits(garmentId, requestedSize, blockStartAt, blockEndAt, db); // Tìm các đơn vị cho thuê khả dụng trong khoảng thời gian bị chặn
    return {
        available: availableUnits.length >= quantity, // Nếu số lượng đơn vị khả dụng lớn hơn hoặc bằng số lượng yêu cầu, trả về true
        requestedQuantity: quantity, // Số lượng yêu cầu
        availableQuantity: availableUnits.length, // Số lượng khả dụng
        availableUnits: availableUnits, // Danh sách các đơn vị khả dụng
        blockStartAt, // Thời gian bắt đầu bị chặn
        blockEndAt, // Thời gian kết thúc bị chặn
        policy, // Chính sách thuê hiện tại
    }
}

const checkPublicAvailability = async ({
    garmentId,
    size,
    quantity,
    rentalStartAt,
    returnDueAt,
}) => {
    validateUuidValue(garmentId);

    if (
        typeof size !== "string" ||
        !size.trim() ||
        size.trim().length > 50
    ) {
        throw new Error("INVALID_AVAILABILITY_QUERY");
    }

    if (
        typeof quantity !== "string" ||
        !quantity.trim()
    ) {
        throw new Error("INVALID_QUANTITY");
    }

    const requestedQuantity = Number(quantity);

    if (
        !Number.isInteger(requestedQuantity) ||
        requestedQuantity < 1
    ) {
        throw new Error("INVALID_QUANTITY");
    }

    if (
        typeof rentalStartAt !== "string" ||
        !rentalStartAt.trim() ||
        typeof returnDueAt !== "string" ||
        !returnDueAt.trim()
    ) {
        throw new Error("INVALID_RENTAL_PERIOD");
    }

    const result = await checkAvailability({
        garmentId,
        requestedSize: size.trim(),
        quantity: requestedQuantity,
        rentalStartAt,
        returnDueAt,
    });

    return {
        available: result.available,
        availableUnitCount:
            result.availableQuantity,
        requestedQuantity:
            result.requestedQuantity,
    };
};

// Tạo một khối khả dụng mới cho một đơn vị cho thuê
const createAvailabilityBlockService = async ({
    rentalUnitId,
    type,
    startAt,
    endAt,
    reason,
}) => {
    if (
        typeof rentalUnitId !== "string" ||
        !UUID_REGEX.test(rentalUnitId)
    ) {
        throw new Error("INVALID_RENTAL_UNIT_ID");
    }

    const allowedTypes = Object.values(BlockType);

    if (!allowedTypes.includes(type)) {
        throw new Error(
            "INVALID_AVAILABILITY_BLOCK_TYPE"
        );
    }

    const start = new Date(startAt);
    const end = new Date(endAt);

    if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        start >= end
    ) {
        throw new Error(
            "INVALID_AVAILABILITY_BLOCK_TIME"
        );
    }

    const normalizedReason =
        typeof reason === "string"
            ? reason.trim()
            : "";

    if (!normalizedReason) {
        throw new Error(
            "AVAILABILITY_BLOCK_REASON_REQUIRED"
        );
    }

    return prisma.$transaction(
        async (tx) => {
            const unit = await findRentalUnitById(
                rentalUnitId,
                tx
            );

            if (!unit) {
                throw new Error("RENTAL_UNIT_NOT_FOUND");
            }

            const conflicts =
                await findBlockingReservationsForUnit(
                    rentalUnitId,
                    start,
                    end,
                    new Date(),
                    tx
                );

            if (conflicts.length > 0) {
                throw new Error(
                    "AVAILABILITY_BLOCK_CONFLICT"
                );
            }

            return createAvailabilityBlock(
                {
                    rentalUnitId,
                    type,
                    startAt: start,
                    endAt: end,
                    reason: normalizedReason,
                },
                tx
            );
        },
        {
            isolationLevel: "Serializable",
            maxWait: 10000,
            timeout: 30000,
        }
    );
};

const getAvailabilityBlocksService = async () => {
    return findAvailabilityBlocks();
};

const endAvailabilityBlockService = async (
    blockId
) => {
    const block = await findAvailabilityBlockById(
        blockId
    );

    if (!block) {
        throw new Error("AVAILABILITY_BLOCK_NOT_FOUND");
    }

    const now = new Date();

    if (block.startAt > now) {
        throw new Error(
            "AVAILABILITY_BLOCK_NOT_STARTED"
        );
    }

    if (block.endAt <= now) {
        throw new Error(
            "AVAILABILITY_BLOCK_ALREADY_ENDED"
        );
    }

    return endAvailabilityBlock(
        blockId,
        now
    );
};

const cancelAvailabilityBlockService = async (
    blockId
) => {
    const block = await findAvailabilityBlockById(
        blockId
    );

    if (!block) {
        throw new Error("AVAILABILITY_BLOCK_NOT_FOUND");
    }

    const now = new Date();

    if (block.startAt <= now) {
        throw new Error(
            "AVAILABILITY_BLOCK_ALREADY_STARTED"
        );
    }

    return deleteAvailabilityBlock(blockId);
};

export {
    checkAvailability,
    checkPublicAvailability,
    createAvailabilityBlockService,
    getAvailabilityBlocksService,
    endAvailabilityBlockService,
    cancelAvailabilityBlockService,
};
