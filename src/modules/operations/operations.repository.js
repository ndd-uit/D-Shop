import prisma from "../../config/prisma.js";
import {
    RentalOrderStatus,
    RentalUnitStatus,
} from "../../generated/prisma/client.ts";

const OPERATIONAL_UNIT_STATUSES = [
    RentalUnitStatus.RENTED,
    RentalUnitStatus.CLEANING,
    RentalUnitStatus.MAINTENANCE,
    RentalUnitStatus.RETIRED,
];

const findOverdueOrders = async (
    db = prisma
) => {
    return db.rentalOrder.findMany({
        where: {
            status: RentalOrderStatus.OVERDUE,
        },
        select: {
            orderId: true,
            rentalStartAt: true,
            returnDueAt: true,
            actualPickupAt: true,
            actualReturnAt: true,
            status: true,
            customer: {
                select: {
                    userId: true,
                    fullName: true,
                    email: true,
                    phone: true,
                },
            },
            items: {
                select: {
                    orderItemId: true,
                    requestedSize: true,
                    garment: {
                        select: {
                            garmentId: true,
                            name: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            returnDueAt: "asc",
        },
    });
};

const findOperationalRentalUnits = async (
    db = prisma
) => {
    return db.rentalUnit.findMany({
        where: {
            status: {
                in: OPERATIONAL_UNIT_STATUSES,
            },
        },
        select: {
            rentalUnitId: true,
            assetCode: true,
            size: true,
            condition: true,
            status: true,
            garment: {
                select: {
                    garmentId: true,
                    name: true,
                    color: true,
                    category: {
                        select: {
                            categoryId: true,
                            name: true,
                        },
                    },
                },
            },
        },
        orderBy: [
            {
                status: "asc",
            },
            {
                assetCode: "asc",
            },
        ],
    });
};

export {
    OPERATIONAL_UNIT_STATUSES,
    findOverdueOrders,
    findOperationalRentalUnits,
};
