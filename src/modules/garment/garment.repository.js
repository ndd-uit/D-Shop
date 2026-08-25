import prisma from "../../config/prisma.js";
import {
    ReservationStatus,
} from "../../generated/prisma/client.ts";

const findAllActiveGarments = async (
    {
        keyword = null,
        categoryId = null,
        size = null,
        minPrice = null,
        maxPrice = null,
    } = {},
    db = prisma
) => {
    return db.garment.findMany({
        where: {
            isActive: true,
            ...(keyword
                ? {
                    OR: [
                        {
                            name: {
                                contains: keyword,
                                mode: "insensitive",
                            },
                        },
                        {
                            description: {
                                contains: keyword,
                                mode: "insensitive",
                            },
                        },
                    ],
                }
                : {}),
            ...(categoryId ? { categoryId } : {}),
            ...(size
                ? {
                    rentalUnits: {
                        some: {
                            size,
                        },
                    },
                }
                : {}),
            ...(
                minPrice !== null ||
                maxPrice !== null
                    ? {
                        rentalPrice: {
                            ...(minPrice !== null
                                ? { gte: minPrice }
                                : {}),
                            ...(maxPrice !== null
                                ? { lte: maxPrice }
                                : {}),
                        },
                    }
                    : {}
            ),
        },
        include: {
            category: {
                select: {
                    categoryId: true,
                    name: true,
                },
            },
            rentalUnits: {
                select: {
                    rentalUnitId: true,
                    size: true,
                    status: true,
                },
            },
        },
        orderBy: {
            name: "asc",
        },
    });
};

const findGarmentById = async (garmentId) => {
    return await prisma.garment.findUnique({
        where: {
            garmentId: garmentId,
        },
        include: {
            category: true,
            rentalUnits: true,
        }
    })
}

const findAllCategories = async (
    db = prisma
) => {
    return db.category.findMany({
        orderBy: {
            name: "asc",
        },
    });
};

const findCategoryById = async (
    categoryId,
    db = prisma
) => {
    return db.category.findUnique({
        where: {
            categoryId,
        },
    });
};

const createCategory = async (
    data,
    db = prisma
) => {
    return db.category.create({
        data,
    });
};

const updateCategory = async (
    categoryId,
    data,
    db = prisma
) => {
    return db.category.update({
        where: {
            categoryId,
        },
        data,
    });
};

const findGarmentsForManagement = async (
    db = prisma
) => {
    return db.garment.findMany({
        include: {
            category: true,
            _count: {
                select: {
                    rentalUnits: true,
                },
            },
        },
        orderBy: {
            name: "asc",
        },
    });
};

const findGarmentForManagementById = async (
    garmentId,
    db = prisma
) => {
    return db.garment.findUnique({
        where: {
            garmentId,
        },
        include: {
            category: true,
        },
    });
};

const createGarment = async (
    data,
    db = prisma
) => {
    return db.garment.create({
        data,
        include: {
            category: true,
        },
    });
};

const updateGarment = async (
    garmentId,
    data,
    db = prisma
) => {
    return db.garment.update({
        where: {
            garmentId,
        },
        data,
        include: {
            category: true,
        },
    });
};

const findRentalUnitsForManagement = async (
    db = prisma
) => {
    return db.rentalUnit.findMany({
        include: {
            garment: {
                include: {
                    category: true,
                },
            },
        },
        orderBy: {
            assetCode: "asc",
        },
    });
};

const findRentalUnitForManagementById = async (
    rentalUnitId,
    db = prisma
) => {
    return db.rentalUnit.findUnique({
        where: {
            rentalUnitId,
        },
        include: {
            garment: {
                include: {
                    category: true,
                },
            },
        },
    });
};

const findRentalUnitByAssetCode = async (
    assetCode,
    excludedRentalUnitId = null,
    db = prisma
) => {
    return db.rentalUnit.findFirst({
        where: {
            assetCode,
            ...(excludedRentalUnitId
                ? {
                    rentalUnitId: {
                        not: excludedRentalUnitId,
                    },
                }
                : {}),
        },
        select: {
            rentalUnitId: true,
            assetCode: true,
        },
    });
};

const createManagedRentalUnit = async (
    data,
    db = prisma
) => {
    return db.rentalUnit.create({
        data,
        include: {
            garment: {
                include: {
                    category: true,
                },
            },
        },
    });
};

const updateManagedRentalUnit = async (
    rentalUnitId,
    data,
    db = prisma
) => {
    return db.rentalUnit.update({
        where: {
            rentalUnitId,
        },
        data,
        include: {
            garment: {
                include: {
                    category: true,
                },
            },
        },
    });
};

const createManagedRentalUnitStatusHistory = async (
    data,
    db = prisma
) => {
    return db.rentalUnitStatusHistory.create({
        data,
    });
};

const findEffectiveReservationsForRentalUnit = async (
    rentalUnitId,
    now = new Date(),
    db = prisma
) => {
    return db.reservation.findFirst({
        where: {
            rentalUnitId,
            OR: [
                {
                    status: {
                        in: [
                            ReservationStatus.CONFIRMED,
                            ReservationStatus.ACTIVE,
                        ],
                    },
                },
                {
                    status:
                        ReservationStatus.TEMPORARY_HOLD,
                    holdExpiresAt: {
                        gt: now,
                    },
                },
            ],
        },
        select: {
            reservationId: true,
            status: true,
            holdExpiresAt: true,
        },
    });
};

export {
    findAllActiveGarments,
    findGarmentById,
    findAllCategories,
    findCategoryById,
    createCategory,
    updateCategory,
    findGarmentsForManagement,
    findGarmentForManagementById,
    createGarment,
    updateGarment,
    findRentalUnitsForManagement,
    findRentalUnitForManagementById,
    findRentalUnitByAssetCode,
    createManagedRentalUnit,
    updateManagedRentalUnit,
    createManagedRentalUnitStatusHistory,
    findEffectiveReservationsForRentalUnit,
}
