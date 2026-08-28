import prisma from "../../config/prisma.js";
import {
    PaymentPurpose,
    PaymentStatus,
    RefundStatus,
    RefundType,
    RentalOrderStatus,
    ReservationStatus,
} from "../../generated/prisma/client.ts";

const findOrderForPayment = async (
    orderId,
    customerId = null,
    db = prisma
) => db.rentalOrder.findFirst({
    where: {
        orderId,
        ...(customerId ? { customerId } : {}),
    },
    include: {
        items: {
            include: { reservations: true },
        },
        payments: true,
    },
});

const createPayment = async (data, db = prisma) =>
    db.payment.create({ data });

const findPaymentById = async (paymentId, db = prisma) =>
    db.payment.findUnique({
        where: { paymentId },
        include: {
            rentalOrder: {
                include: {
                    items: {
                        include: { reservations: true },
                    },
                },
            },
        },
    });

const findPaymentByTransactionRef = async (
    transactionRef,
    db = prisma
) => db.payment.findUnique({ where: { transactionRef } });

const findPaymentByPurposeAndStatus = async (
    orderId,
    purpose,
    status,
    db = prisma
) => db.payment.findFirst({
    where: { rentalOrderId: orderId, purpose, status },
    orderBy: { createdAt: "desc" },
});

const markPaymentSucceeded = async (
    paymentId,
    transactionRef,
    paidAt,
    db = prisma
) => db.payment.update({
    where: { paymentId },
    data: {
        status: PaymentStatus.SUCCEEDED,
        transactionRef,
        paidAt,
    },
});

const markPaymentFailed = async (
    paymentId,
    transactionRef,
    db = prisma
) => db.payment.update({
    where: { paymentId },
    data: {
        status: PaymentStatus.FAILED,
        transactionRef,
    },
});

const addRentalPaymentToOrderTotals = async (
    orderId,
    amount,
    db = prisma
) => db.rentalOrder.update({
    where: { orderId },
    data: {
        totalPaid: { increment: amount },
        netCollected: { increment: amount },
    },
});

const recordGatewayDeposit = async (
    orderId,
    amount,
    collectedAt,
    db = prisma
) => db.rentalOrder.update({
    where: { orderId },
    data: {
        collectedDepositAmount: amount,
        depositCollectionMethod: "PAYMENT_GATEWAY",
        depositCollectedAt: collectedAt,
        totalPaid: { increment: amount },
        netCollected: { increment: amount },
    },
});

const confirmRentalOrder = async (orderId, db = prisma) =>
    db.rentalOrder.update({
        where: { orderId },
        data: { status: RentalOrderStatus.CONFIRMED },
    });

const confirmReservations = async (
    orderItemIds,
    db = prisma
) => db.reservation.updateMany({
    where: {
        rentalOrderItemId: { in: orderItemIds },
        status: ReservationStatus.TEMPORARY_HOLD,
    },
    data: { status: ReservationStatus.CONFIRMED },
});

const findSuccessfulRentalPayment = async (
    orderId,
    db = prisma
) => findPaymentByPurposeAndStatus(
    orderId,
    PaymentPurpose.RENTAL,
    PaymentStatus.SUCCEEDED,
    db
);

const createRefund = async (data, db = prisma) =>
    db.refund.create({ data });

const findOrderForRefund = async (orderId, db = prisma) =>
    db.rentalOrder.findUnique({
        where: { orderId },
        include: { payments: true },
    });

const findRefundById = async (refundId, db = prisma) =>
    db.refund.findUnique({
        where: { refundId },
        include: { payment: true, rentalOrder: true },
    });

const findRefundByTransactionRef = async (
    transactionRef,
    db = prisma
) => db.refund.findUnique({ where: { transactionRef } });

const findLatestRefundByOrderAndType = async (
    rentalOrderId,
    type,
    db = prisma
) => db.refund.findFirst({
    where: { rentalOrderId, type },
    orderBy: { createdAt: "desc" },
});

const markRefundSucceeded = async (
    refundId,
    transactionRef,
    completedAt,
    db = prisma
) => db.refund.update({
    where: { refundId },
    data: {
        status: RefundStatus.SUCCEEDED,
        transactionRef,
        completedAt,
    },
});

const markRefundFailed = async (
    refundId,
    transactionRef,
    completedAt,
    db = prisma
) => db.refund.update({
    where: { refundId },
    data: {
        status: RefundStatus.FAILED,
        transactionRef,
        completedAt,
    },
});

const resetRefundPending = async (
    refundId,
    db = prisma
) => db.refund.update({
    where: { refundId },
    data: {
        status: RefundStatus.PENDING,
        transactionRef: null,
        completedAt: null,
    },
});

const addRefundToOrderTotals = async (
    orderId,
    amount,
    db = prisma
) => db.rentalOrder.update({
    where: { orderId },
    data: {
        totalRefunded: { increment: amount },
        netCollected: { decrement: amount },
    },
});

const findRefunds = async (db = prisma) =>
    db.refund.findMany({
        include: {
            payment: true,
            rentalOrder: {
                select: { orderId: true, status: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });

const findExpiredHoldReconciliationPayments = async (
    db = prisma
) => db.payment.findMany({
    where: {
        purpose: PaymentPurpose.RENTAL,
        status: PaymentStatus.SUCCEEDED,
        rentalOrder: { status: RentalOrderStatus.EXPIRED },
    },
    include: {
        rentalOrder: true,
        refunds: {
            where: { type: RefundType.RENTAL_REFUND },
            orderBy: { createdAt: "desc" },
        },
    },
    orderBy: { paidAt: "desc" },
});

const findRefundForCallback = async (
    refundId,
    db = prisma
) => db.refund.findUnique({
    where: { refundId },
    include: { payment: true, rentalOrder: true },
});

export {
    addRefundToOrderTotals,
    addRentalPaymentToOrderTotals,
    confirmRentalOrder,
    confirmReservations,
    createPayment,
    createRefund,
    findExpiredHoldReconciliationPayments,
    findLatestRefundByOrderAndType,
    findOrderForPayment,
    findOrderForRefund,
    findPaymentById,
    findPaymentByPurposeAndStatus,
    findPaymentByTransactionRef,
    findRefundById,
    findRefundByTransactionRef,
    findRefundForCallback,
    findRefunds,
    findSuccessfulRentalPayment,
    markPaymentFailed,
    markPaymentSucceeded,
    markRefundFailed,
    markRefundSucceeded,
    recordGatewayDeposit,
    resetRefundPending,
};
