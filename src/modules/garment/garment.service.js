import prisma from "../../config/prisma.js";
import {
    RentalUnitStatus,
} from "../../generated/prisma/client.ts";
import {
    createCategory,
    createGarment,
    createManagedRentalUnit,
    createManagedRentalUnitStatusHistory,
    findAllActiveGarments,
    findAllCategories,
    findCategoryById,
    findGarmentById,
    findGarmentForManagementById,
    findGarmentsForManagement,
    findEffectiveReservationsForRentalUnit,
    findRentalUnitByAssetCode,
    findRentalUnitForManagementById,
    findRentalUnitsForManagement,
    updateCategory,
    updateGarment,
    updateManagedRentalUnit,
} from './garment.repository.js'
import { checkAvailability } from "../availability/availability.service.js";
import { validateUuidValue } from "../../utils/validation.js";
import { normalizeRentalPeriod } from "../../utils/rentalPeriod.js";

const normalizeOptionalSearchText = (
    value,
    errorCode = "INVALID_GARMENT_SEARCH"
) => {
    if (value === undefined) {
        return null;
    }

    if (typeof value !== "string") {
        throw new Error(errorCode);
    }

    return value.trim() || null;
};

const normalizeOptionalPrice = (value) => {
    if (value === undefined) {
        return null;
    }

    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        throw new Error("INVALID_GARMENT_SEARCH");
    }

    const price = Number(value);

    if (!Number.isFinite(price) || price < 0) {
        throw new Error("INVALID_GARMENT_SEARCH");
    }

    return price;
};

const getGarments = async (query = {}) => {
    if (
        !query ||
        typeof query !== "object" ||
        Array.isArray(query)
    ) {
        throw new Error("INVALID_GARMENT_SEARCH");
    }

    const keyword = normalizeOptionalSearchText(
        query.keyword
    );
    const categoryId = normalizeOptionalSearchText(
        query.categoryId
    );
    const size = normalizeOptionalSearchText(query.size);
    const minPrice = normalizeOptionalPrice(
        query.minPrice
    );
    const maxPrice = normalizeOptionalPrice(
        query.maxPrice
    );

    if (categoryId) {
        validateUuidValue(categoryId);
    }

    if (
        minPrice !== null &&
        maxPrice !== null &&
        minPrice > maxPrice
    ) {
        throw new Error("INVALID_GARMENT_SEARCH");
    }

    const hasRentalStartAt =
        query.rentalStartAt !== undefined;
    const hasReturnDueAt =
        query.returnDueAt !== undefined;

    if (hasRentalStartAt !== hasReturnDueAt) {
        throw new Error("INVALID_RENTAL_PERIOD");
    }

    let rentalStartAt = null;
    let returnDueAt = null;

    if (hasRentalStartAt && hasReturnDueAt) {
        if (
            typeof query.rentalStartAt !== "string" ||
            !query.rentalStartAt.trim() ||
            typeof query.returnDueAt !== "string" ||
            !query.returnDueAt.trim()
        ) {
            throw new Error("INVALID_RENTAL_PERIOD");
        }

        ({
            rentalStartAt,
            returnDueAt,
        } = normalizeRentalPeriod(
            query.rentalStartAt,
            query.returnDueAt
        ));
    }

    const garments = await findAllActiveGarments({
        keyword,
        categoryId,
        size,
        minPrice,
        maxPrice,
    });

    if (!rentalStartAt || !returnDueAt) {
        return garments;
    }

    const availabilityResults = await Promise.all(
        garments.map(async (garment) => {
            const availability = await checkAvailability({
                garmentId: garment.garmentId,
                requestedSize: size ?? undefined,
                quantity: 1,
                rentalStartAt,
                returnDueAt,
            });

            return availability.available
                ? garment
                : null;
        })
    );

    return availabilityResults.filter(Boolean);
};

const getGarmentById = async (garmentId) => {
    const garment = await findGarmentById(garmentId)
    if (!garment) {
        throw new Error('GARMENT_NOT_FOUND')
    }
    return garment
}

const getCategories = async () => {
    return findAllCategories();
};

const createCategoryService = async ({
    name,
    description,
}) => {
    const normalizedName =
        typeof name === "string"
            ? name.trim()
            : "";

    if (
        !normalizedName ||
        normalizedName.length > 150 ||
        (
            description !== null &&
            description !== undefined &&
            typeof description !== "string"
        )
    ) {
        throw new Error("INVALID_CATEGORY_DATA");
    }

    return createCategory({
        name: normalizedName,
        description:
            typeof description === "string"
                ? description.trim() || null
                : null,
    });
};

const updateCategoryService = async (
    categoryId,
    body
) => {
    const category = await findCategoryById(
        categoryId
    );

    if (!category) {
        throw new Error("CATEGORY_NOT_FOUND");
    }

    if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body)
    ) {
        throw new Error("INVALID_CATEGORY_DATA");
    }

    const allowedFields = new Set([
        "name",
        "description",
    ]);
    const fields = Object.keys(body);

    if (
        fields.some(
            (field) => !allowedFields.has(field)
        )
    ) {
        throw new Error("CATEGORY_FIELD_NOT_ALLOWED");
    }

    if (fields.length === 0) {
        throw new Error("NO_CATEGORY_CHANGES");
    }

    const data = {};

    if (fields.includes("name")) {
        const name =
            typeof body.name === "string"
                ? body.name.trim()
                : "";

        if (!name || name.length > 150) {
            throw new Error("INVALID_CATEGORY_DATA");
        }

        data.name = name;
    }

    if (fields.includes("description")) {
        if (
            body.description !== null &&
            typeof body.description !== "string"
        ) {
            throw new Error("INVALID_CATEGORY_DATA");
        }

        data.description =
            body.description?.trim() || null;
    }

    try {
        return await updateCategory(
            categoryId,
            data
        );
    } catch (error) {
        if (error?.code === "P2025") {
            throw new Error("CATEGORY_NOT_FOUND");
        }

        throw error;
    }
};

const updateCategoryStatusService = async (
    categoryId,
    isActive
) => {
    if (typeof isActive !== "boolean") {
        throw new Error("INVALID_CATEGORY_STATUS");
    }

    const category = await findCategoryById(
        categoryId
    );

    if (!category) {
        throw new Error("CATEGORY_NOT_FOUND");
    }

    try {
        return await updateCategory(
            categoryId,
            {
                isActive,
            }
        );
    } catch (error) {
        if (error?.code === "P2025") {
            throw new Error("CATEGORY_NOT_FOUND");
        }

        throw error;
    }
};

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeGarmentImages = (imageUrls) => {
    if (imageUrls === null || imageUrls === undefined) {
        return null;
    }

    if (
        !Array.isArray(imageUrls) ||
        imageUrls.some(
            (url) =>
                typeof url !== "string" ||
                !url.trim()
        )
    ) {
        throw new Error("INVALID_GARMENT_IMAGES");
    }

    return JSON.stringify(
        imageUrls.map((url) => url.trim())
    );
};

const normalizeGarmentFinancialValue = (
    value,
    allowZero
) => {
    if (
        value === null ||
        value === undefined ||
        (
            typeof value === "string" &&
            !value.trim()
        )
    ) {
        throw new Error(
            "INVALID_GARMENT_FINANCIAL_DATA"
        );
    }

    const amount = Number(value);

    if (
        !Number.isFinite(amount) ||
        (allowZero ? amount < 0 : amount <= 0)
    ) {
        throw new Error(
            "INVALID_GARMENT_FINANCIAL_DATA"
        );
    }

    return amount;
};

const normalizeGarmentName = (name) => {
    const normalizedName =
        typeof name === "string"
            ? name.trim()
            : "";

    if (
        !normalizedName ||
        normalizedName.length > 200
    ) {
        throw new Error("INVALID_GARMENT_DATA");
    }

    return normalizedName;
};

const normalizeGarmentText = (
    value,
    maxLength = null
) => {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value !== "string") {
        throw new Error("INVALID_GARMENT_DATA");
    }

    const normalized = value.trim();

    if (
        maxLength !== null &&
        normalized.length > maxLength
    ) {
        throw new Error("INVALID_GARMENT_DATA");
    }

    return normalized || null;
};

const requireActiveCategory = async (
    categoryId
) => {
    if (
        typeof categoryId !== "string" ||
        !UUID_REGEX.test(categoryId)
    ) {
        throw new Error("INVALID_GARMENT_DATA");
    }

    const category = await findCategoryById(
        categoryId
    );

    if (!category) {
        throw new Error("CATEGORY_NOT_FOUND");
    }

    if (!category.isActive) {
        throw new Error("CATEGORY_INACTIVE");
    }

    return category;
};

const getGarmentsForManagement = async () => {
    return findGarmentsForManagement();
};

const createGarmentService = async (body) => {
    if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body)
    ) {
        throw new Error("INVALID_GARMENT_DATA");
    }

    const {
        categoryId,
        name,
        description,
        color,
        imageUrls,
        rentalPrice,
        depositAmount,
    } = body;
    const normalizedName = normalizeGarmentName(name);
    const normalizedDescription =
        normalizeGarmentText(description);
    const normalizedColor = normalizeGarmentText(
        color,
        100
    );
    const normalizedImages =
        normalizeGarmentImages(imageUrls);
    const normalizedRentalPrice =
        normalizeGarmentFinancialValue(
            rentalPrice,
            false
        );
    const normalizedDepositAmount =
        normalizeGarmentFinancialValue(
            depositAmount,
            true
        );

    await requireActiveCategory(categoryId);

    return createGarment({
        categoryId,
        name: normalizedName,
        description: normalizedDescription,
        color: normalizedColor,
        imageUrls: normalizedImages,
        rentalPrice: normalizedRentalPrice,
        depositAmount: normalizedDepositAmount,
        isActive: true,
    });
};

const updateGarmentService = async (
    garmentId,
    body
) => {
    const garment =
        await findGarmentForManagementById(
            garmentId
        );

    if (!garment) {
        throw new Error("GARMENT_NOT_FOUND");
    }

    if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body)
    ) {
        throw new Error("INVALID_GARMENT_DATA");
    }

    const allowedFields = new Set([
        "categoryId",
        "name",
        "description",
        "color",
        "imageUrls",
        "rentalPrice",
        "depositAmount",
    ]);
    const fields = Object.keys(body);

    if (
        fields.some(
            (field) => !allowedFields.has(field)
        )
    ) {
        throw new Error("GARMENT_FIELD_NOT_ALLOWED");
    }

    if (fields.length === 0) {
        throw new Error("NO_GARMENT_CHANGES");
    }

    const data = {};

    if (fields.includes("categoryId")) {
        await requireActiveCategory(body.categoryId);
        data.categoryId = body.categoryId;
    }

    if (fields.includes("name")) {
        data.name = normalizeGarmentName(body.name);
    }

    if (fields.includes("description")) {
        data.description = normalizeGarmentText(
            body.description
        );
    }

    if (fields.includes("color")) {
        data.color = normalizeGarmentText(
            body.color,
            100
        );
    }

    if (fields.includes("imageUrls")) {
        data.imageUrls = normalizeGarmentImages(
            body.imageUrls
        );
    }

    if (fields.includes("rentalPrice")) {
        data.rentalPrice =
            normalizeGarmentFinancialValue(
                body.rentalPrice,
                false
            );
    }

    if (fields.includes("depositAmount")) {
        data.depositAmount =
            normalizeGarmentFinancialValue(
                body.depositAmount,
                true
            );
    }

    try {
        return await updateGarment(
            garmentId,
            data
        );
    } catch (error) {
        if (error?.code === "P2025") {
            throw new Error("GARMENT_NOT_FOUND");
        }

        throw error;
    }
};

const updateGarmentStatusService = async (
    garmentId,
    isActive
) => {
    if (typeof isActive !== "boolean") {
        throw new Error("INVALID_GARMENT_STATUS");
    }

    const garment =
        await findGarmentForManagementById(
            garmentId
        );

    if (!garment) {
        throw new Error("GARMENT_NOT_FOUND");
    }

    try {
        return await updateGarment(
            garmentId,
            {
                isActive,
            }
        );
    } catch (error) {
        if (error?.code === "P2025") {
            throw new Error("GARMENT_NOT_FOUND");
        }

        throw error;
    }
};

const normalizeRentalUnitMetadata = (
    body,
    fields
) => {
    const data = {};

    if (fields.includes("assetCode")) {
        const assetCode =
            typeof body.assetCode === "string"
                ? body.assetCode.trim()
                : "";

        if (!assetCode || assetCode.length > 100) {
            throw new Error("INVALID_RENTAL_UNIT_DATA");
        }

        data.assetCode = assetCode;
    }

    if (fields.includes("size")) {
        const size =
            typeof body.size === "string"
                ? body.size.trim()
                : "";

        if (!size || size.length > 50) {
            throw new Error("INVALID_RENTAL_UNIT_DATA");
        }

        data.size = size;
    }

    if (fields.includes("condition")) {
        if (
            body.condition !== null &&
            body.condition !== undefined &&
            typeof body.condition !== "string"
        ) {
            throw new Error("INVALID_RENTAL_UNIT_DATA");
        }

        const condition =
            body.condition?.trim() || null;

        if (condition && condition.length > 100) {
            throw new Error("INVALID_RENTAL_UNIT_DATA");
        }

        data.condition = condition;
    }

    return data;
};

const getRentalUnitsForManagement = async () => {
    return findRentalUnitsForManagement();
};

const getRentalUnitForManagement = async (
    rentalUnitId
) => {
    const unit = await findRentalUnitForManagementById(
        rentalUnitId
    );

    if (!unit) {
        throw new Error("RENTAL_UNIT_NOT_FOUND");
    }

    return unit;
};

const createRentalUnitService = async (
    body,
    managerId
) => {
    if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body)
    ) {
        throw new Error("INVALID_RENTAL_UNIT_DATA");
    }

    const {
        garmentId,
        assetCode,
        size,
        condition,
    } = body;

    if (
        typeof garmentId !== "string" ||
        !UUID_REGEX.test(garmentId)
    ) {
        throw new Error("INVALID_RENTAL_UNIT_DATA");
    }

    const data = normalizeRentalUnitMetadata(
        {
            assetCode,
            size,
            condition,
        },
        ["assetCode", "size", "condition"]
    );

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            return await prisma.$transaction(
                async (tx) => {
                const garment =
                    await findGarmentForManagementById(
                        garmentId,
                        tx
                    );

                if (!garment) {
                    throw new Error("GARMENT_NOT_FOUND");
                }

                if (!garment.isActive) {
                    throw new Error("GARMENT_INACTIVE");
                }

                const conflict =
                    await findRentalUnitByAssetCode(
                        data.assetCode,
                        null,
                        tx
                    );

                if (conflict) {
                    throw new Error(
                        "RENTAL_UNIT_ASSET_CODE_EXISTS"
                    );
                }

                const now = new Date();
                const unit =
                    await createManagedRentalUnit(
                        {
                            garmentId,
                            ...data,
                            status:
                                RentalUnitStatus.AVAILABLE,
                        },
                        tx
                    );

                await createManagedRentalUnitStatusHistory(
                    {
                        rentalUnitId: unit.rentalUnitId,
                        oldStatus: null,
                        newStatus:
                            RentalUnitStatus.AVAILABLE,
                        changedBy: managerId,
                        changedAt: now,
                        reason: "Khởi tạo RentalUnit",
                    },
                    tx
                );

                return unit;
                },
                {
                    isolationLevel: "Serializable",
                    maxWait: 10000,
                    timeout: 30000,
                }
            );
        } catch (error) {
            if (error?.code === "P2002") {
                throw new Error(
                    "RENTAL_UNIT_ASSET_CODE_EXISTS"
                );
            }

            const isTransactionConflict =
                error?.code === "P2034" ||
                error?.code === "40001" ||
                error?.code ===
                    "TransactionWriteConflict" ||
                error?.cause?.originalCode === "40001";

            if (isTransactionConflict && attempt < 2) {
                continue;
            }

            throw error;
        }
    }
};

const updateRentalUnitService = async (
    rentalUnitId,
    body
) => {
    const unit = await findRentalUnitForManagementById(
        rentalUnitId
    );

    if (!unit) {
        throw new Error("RENTAL_UNIT_NOT_FOUND");
    }

    if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body)
    ) {
        throw new Error("INVALID_RENTAL_UNIT_DATA");
    }

    const allowedFields = new Set([
        "assetCode",
        "size",
        "condition",
    ]);
    const fields = Object.keys(body);

    if (
        fields.some(
            (field) => !allowedFields.has(field)
        )
    ) {
        throw new Error("RENTAL_UNIT_FIELD_NOT_ALLOWED");
    }

    if (fields.length === 0) {
        throw new Error("NO_RENTAL_UNIT_CHANGES");
    }

    const data = normalizeRentalUnitMetadata(
        body,
        fields
    );

    if (data.assetCode) {
        const conflict =
            await findRentalUnitByAssetCode(
                data.assetCode,
                rentalUnitId
            );

        if (conflict) {
            throw new Error(
                "RENTAL_UNIT_ASSET_CODE_EXISTS"
            );
        }
    }

    try {
        return await updateManagedRentalUnit(
            rentalUnitId,
            data
        );
    } catch (error) {
        if (error?.code === "P2002") {
            throw new Error(
                "RENTAL_UNIT_ASSET_CODE_EXISTS"
            );
        }

        if (error?.code === "P2025") {
            throw new Error("RENTAL_UNIT_NOT_FOUND");
        }

        throw error;
    }
};

const retireRentalUnitService = async (
    rentalUnitId,
    managerId,
    reason
) => {
    if (typeof reason !== "string" || !reason.trim()) {
        throw new Error("RETIRE_REASON_REQUIRED");
    }

    const allowedStatuses = new Set([
        RentalUnitStatus.AVAILABLE,
        RentalUnitStatus.DAMAGED,
        RentalUnitStatus.MAINTENANCE,
    ]);

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            return await prisma.$transaction(
                async (tx) => {
                    const unit =
                        await findRentalUnitForManagementById(
                            rentalUnitId,
                            tx
                        );

                    if (!unit) {
                        throw new Error(
                            "RENTAL_UNIT_NOT_FOUND"
                        );
                    }

                    if (!allowedStatuses.has(unit.status)) {
                        throw new Error(
                            "RENTAL_UNIT_RETIRE_NOT_ALLOWED"
                        );
                    }

                    const now = new Date();
                    const blockingReservation =
                        await findEffectiveReservationsForRentalUnit(
                            rentalUnitId,
                            now,
                            tx
                        );

                    if (blockingReservation) {
                        throw new Error(
                            "RENTAL_UNIT_HAS_ACTIVE_RESERVATION"
                        );
                    }

                    const retiredUnit =
                        await updateManagedRentalUnit(
                            rentalUnitId,
                            {
                                status:
                                    RentalUnitStatus.RETIRED,
                            },
                            tx
                        );

                    await createManagedRentalUnitStatusHistory(
                        {
                            rentalUnitId,
                            oldStatus: unit.status,
                            newStatus:
                                RentalUnitStatus.RETIRED,
                            changedBy: managerId,
                            changedAt: now,
                            reason: reason.trim(),
                        },
                        tx
                    );

                    return retiredUnit;
                },
                {
                    isolationLevel: "Serializable",
                    maxWait: 10000,
                    timeout: 30000,
                }
            );
        } catch (error) {
            const isTransactionConflict =
                error?.code === "P2034" ||
                error?.code === "40001" ||
                error?.code ===
                    "TransactionWriteConflict" ||
                error?.cause?.originalCode === "40001";

            if (isTransactionConflict && attempt < 2) {
                continue;
            }

            throw error;
        }
    }
};

export {
    getGarments,
    getGarmentById,
    getCategories,
    createCategoryService,
    updateCategoryService,
    updateCategoryStatusService,
    getGarmentsForManagement,
    createGarmentService,
    updateGarmentService,
    updateGarmentStatusService,
    getRentalUnitsForManagement,
    getRentalUnitForManagement,
    createRentalUnitService,
    updateRentalUnitService,
    retireRentalUnitService,
}
