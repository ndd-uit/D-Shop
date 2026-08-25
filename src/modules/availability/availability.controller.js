import {
    cancelAvailabilityBlockService,
    checkPublicAvailability,
    createAvailabilityBlockService,
    endAvailabilityBlockService,
    getAvailabilityBlocksService,
} from "./availability.service.js";

const checkAvailabilityController = async (
    req,
    res
) => {
    try {
        const data = await checkPublicAvailability({
            garmentId: req.query.garmentId,
            size: req.query.size,
            quantity: req.query.quantity,
            rentalStartAt: req.query.rentalStartAt,
            returnDueAt: req.query.returnDueAt,
        });

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        if (
            error.message === "INVALID_UUID" ||
            error.message ===
                "INVALID_AVAILABILITY_QUERY" ||
            error.message === "INVALID_QUANTITY" ||
            error.message === "INVALID_RENTAL_PERIOD"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Thông tin kiểm tra khả dụng không hợp lệ",
            });
        }

        if (error.message === "RENTAL_POLICY_NOT_FOUND") {
            return res.status(409).json({
                success: false,
                message:
                    "Không tìm thấy chính sách thuê đang có hiệu lực",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể kiểm tra tình trạng khả dụng",
        });
    }
};

const getAvailabilityBlocksController = async (
    req,
    res
) => {
    try {
        const data = await getAvailabilityBlocksService();

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể lấy danh sách khoảng thời gian bị khóa",
        });
    }
};

const createAvailabilityBlockController = async (
    req,
    res
) => {
    try {
        const block =
            await createAvailabilityBlockService(
                req.body
            );

        return res.status(201).json({
            success: true,
            data: block,
        });
    } catch (error) {
        const badRequestErrors = {
            INVALID_RENTAL_UNIT_ID:
                "Mã RentalUnit không hợp lệ",
            INVALID_AVAILABILITY_BLOCK_TYPE:
                "Loại khóa lịch không hợp lệ",
            INVALID_AVAILABILITY_BLOCK_TIME:
                "Khoảng thời gian khóa lịch không hợp lệ",
            AVAILABILITY_BLOCK_REASON_REQUIRED:
                "Cần cung cấp lý do khóa lịch",
        };

        if (badRequestErrors[error.message]) {
            return res.status(400).json({
                success: false,
                message: badRequestErrors[error.message],
            });
        }

        if (error.message === "RENTAL_UNIT_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy RentalUnit",
            });
        }

        if (
            error.message ===
            "AVAILABILITY_BLOCK_CONFLICT"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Khoảng thời gian khóa lịch bị trùng với đơn thuê hiện có",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Không thể tạo khoảng thời gian khóa lịch",
        });
    }
};

const endAvailabilityBlockController = async (
    req,
    res
) => {
    try {
        const { blockId } = req.params;
        const block = await endAvailabilityBlockService(
            blockId
        );

        return res.status(200).json({
            success: true,
            data: block,
        });
    } catch (error) {
        if (
            error.message ===
            "AVAILABILITY_BLOCK_NOT_FOUND"
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Không tìm thấy khoảng thời gian khóa lịch",
            });
        }

        if (
            error.message ===
                "AVAILABILITY_BLOCK_NOT_STARTED" ||
            error.message ===
                "AVAILABILITY_BLOCK_ALREADY_ENDED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    error.message ===
                    "AVAILABILITY_BLOCK_NOT_STARTED"
                        ? "Khoảng thời gian khóa lịch chưa bắt đầu"
                        : "Khoảng thời gian khóa lịch đã kết thúc",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể kết thúc khoảng thời gian khóa lịch",
        });
    }
};

const cancelAvailabilityBlockController = async (
    req,
    res
) => {
    try {
        const { blockId } = req.params;
        const block =
            await cancelAvailabilityBlockService(
                blockId
            );

        return res.status(200).json({
            success: true,
            data: block,
        });
    } catch (error) {
        if (
            error.message ===
            "AVAILABILITY_BLOCK_NOT_FOUND"
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Không tìm thấy khoảng thời gian khóa lịch",
            });
        }

        if (
            error.message ===
            "AVAILABILITY_BLOCK_ALREADY_STARTED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Khoảng thời gian khóa lịch đã bắt đầu",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể hủy khoảng thời gian khóa lịch",
        });
    }
};

export {
    checkAvailabilityController,
    getAvailabilityBlocksController,
    createAvailabilityBlockController,
    endAvailabilityBlockController,
    cancelAvailabilityBlockController,
};
