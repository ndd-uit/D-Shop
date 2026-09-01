import prisma from "../../config/prisma.js";
import {
    PaymentPurpose,
    PaymentStatus,
    RefundType,
    RefundStatus,
    RentalOrderStatus,
    RentalUnitStatus,
} from "../../generated/prisma/client.ts";

const REPORT_ORDER_STATUSES = [
    RentalOrderStatus.PENDING_PAYMENT,
    RentalOrderStatus.CONFIRMED,
    RentalOrderStatus.PREPARING,
    RentalOrderStatus.READY_FOR_PICKUP,
    RentalOrderStatus.RENTING,
    RentalOrderStatus.OVERDUE,
    RentalOrderStatus.COMPLETED,
    RentalOrderStatus.NO_SHOW,
    RentalOrderStatus.FULFILLMENT_FAILED,
];

const REPORT_ATTENTION_STATUSES = [
    RentalOrderStatus.OVERDUE,
    RentalOrderStatus.NO_SHOW,
    RentalOrderStatus.FULFILLMENT_FAILED,
];

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

const findSucceededPaymentsInRange = async (
    startAt,
    endAt,
    db = prisma
) => db.payment.findMany({
    where: {
        status: PaymentStatus.SUCCEEDED,
        paidAt: {
            gte: startAt,
            lte: endAt,
        },
    },
    select: {
        amount: true,
        paidAt: true,
    },
    orderBy: {
        paidAt: "asc",
    },
});

const findSucceededRefundsInRange = async (
    startAt,
    endAt,
    db = prisma
) => db.refund.findMany({
    where: {
        status: RefundStatus.SUCCEEDED,
        completedAt: {
            gte: startAt,
            lte: endAt,
        },
    },
    select: {
        amount: true,
        completedAt: true,
    },
    orderBy: {
        completedAt: "asc",
    },
});

const findReportOrdersInRange = async (
    startAt,
    endAt,
    db = prisma
) => db.rentalOrder.findMany({
    where: {
        createdAt: { gte: startAt, lte: endAt },
    },
    select: {
        orderId: true,
        status: true,
        rentalStartAt: true,
        returnDueAt: true,
        createdAt: true,
        customer: {
            select: {
                fullName: true,
                email: true,
                phone: true,
            },
        },
    },
    orderBy: { createdAt: "desc" },
});

const findSucceededRentalPaymentsInRange = async (
    startAt,
    endAt,
    db = prisma
) => db.payment.findMany({
    where: {
        purpose: PaymentPurpose.RENTAL,
        status: PaymentStatus.SUCCEEDED,
        paidAt: { gte: startAt, lte: endAt },
    },
    select: { amount: true, paidAt: true },
    orderBy: { paidAt: "asc" },
});

const findAdditionalChargesInRange = async (
    startAt,
    endAt,
    db = prisma
) => db.rentalOrder.findMany({
    where: {
        actualReturnAt: { gte: startAt, lte: endAt },
        additionalCharge: { gt: 0 },
    },
    select: {
        additionalCharge: true,
        actualReturnAt: true,
    },
    orderBy: { actualReturnAt: "asc" },
});

const findCollectedDepositsInRange = async (
    startAt,
    endAt,
    db = prisma
) => db.rentalOrder.findMany({
    where: {
        depositCollectedAt: { gte: startAt, lte: endAt },
        collectedDepositAmount: { gt: 0 },
    },
    select: { collectedDepositAmount: true },
});

const findReportRefundsInRange = async (
    startAt,
    endAt,
    db = prisma
) => db.refund.findMany({
    where: {
        status: RefundStatus.SUCCEEDED,
        completedAt: { gte: startAt, lte: endAt },
    },
    select: {
        amount: true,
        type: true,
        completedAt: true,
    },
    orderBy: { completedAt: "asc" },
});

const findReportRentalUnits = async (
    db = prisma
) => db.rentalUnit.groupBy({
    by: ["status"],
    _count: { rentalUnitId: true },
});

const findPopularGarmentItemsInRange = async (
    startAt,
    endAt,
    db = prisma
) => db.rentalOrderItem.findMany({
    where: {
        order: {
            status: {
                in: [
                    RentalOrderStatus.RENTING,
                    RentalOrderStatus.OVERDUE,
                    RentalOrderStatus.RETURNED,
                    RentalOrderStatus.INSPECTING,
                    RentalOrderStatus.SETTLEMENT_PENDING,
                    RentalOrderStatus.COMPLETED,
                ],
            },
            payments: {
                some: {
                    purpose: PaymentPurpose.RENTAL,
                    status: PaymentStatus.SUCCEEDED,
                    paidAt: { gte: startAt, lte: endAt },
                },
            },
        },
    },
    select: {
        orderId: true,
        order: {
            select: { rentalAmount: true },
        },
        garment: {
            select: {
                garmentId: true,
                name: true,
                rentalPrice: true,
            },
        },
        reservations: {
            where: {
                status: { notIn: ["EXPIRED", "RELEASED"] },
            },
            select: { reservationId: true },
        },
    },
});

export {
    OPERATIONAL_UNIT_STATUSES,
    REPORT_ATTENTION_STATUSES,
    REPORT_ORDER_STATUSES,
    findAdditionalChargesInRange,
    findCollectedDepositsInRange,
    findOverdueOrders,
    findOperationalRentalUnits,
    findPopularGarmentItemsInRange,
    findReportOrdersInRange,
    findReportRefundsInRange,
    findReportRentalUnits,
    findSucceededPaymentsInRange,
    findSucceededRentalPaymentsInRange,
    findSucceededRefundsInRange,
};
