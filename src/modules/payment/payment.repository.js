import prisma from "../../config/prisma.js";
import {
    PaymentPurpose,
    PaymentStatus,
    RentalOrderStatus,
    ReservationStatus,
    RefundType,
    RefundStatus,
} from "../../generated/prisma/client.ts";

// Tìm kiếm đơn hàng để thanh toán
const findOrderForPayment = async (orderId, customerId, db = prisma) => {
    return db.rentalOrder.findFirst({
        where: {
            orderId,
            customerId,
        },
        include: {
            items: {
                include: {
                    reservations: true,
                },
            },
        },
    });
}

const createPayment = async (data, db = prisma) => {
    return db.payment.create({
        data
    });
}

const findPaymentById = async (paymentId, db = prisma) => {
    return db.payment.findUnique({
        where: {
            paymentId,
        },
        include: {
            rentalOrder: {
                include: {
                    items: {
                        include: {
                            reservations: true,
                        }
                    },
                }
            }
        }
    });
}

// Tìm kiếm Payment bằng transactionRef - chuoi tham chieu giao dich
const findPaymentByTransactionRef = async (transactionRef, db = prisma) => {
    return db.payment.findUnique({
        where: {
            transactionRef,
        }
    });
}

// Danh dau Payment la thanh cong
const markPaymentSuccess = async (paymentId, transactionRef, paidAt, db = prisma) => {
    return db.payment.update({
        where: {
            paymentId,
        },
        data: {
            status: "SUCCESS",
            transactionRef,
            paidAt,
        }
    });
}

const markPaymentFailed = async (
    paymentId,
    transactionRef,
    db = prisma
) => {
    return db.payment.update({
        where: {
            paymentId,
        },
        data: {
            status: PaymentStatus.FAILED,
            transactionRef,
        },
    });
};

// Cập nhật tổng số tiền đã thanh toán và tổng số tiền thu được cho đơn hàng
const addPaymentToOrderTotals = async (
    orderId,
    amount,
    db = prisma
) => {
    return db.rentalOrder.update({
        where: {
            orderId,
        },
        data: {
            totalPaid: {
                increment: amount,
            },
            netCollected: {
                increment: amount,
            },
        },
    });
};

// Xác nhận đơn hàng cho thuê
const confirmRentalOrder = async (
    orderId,
    db = prisma
) => {
    return db.rentalOrder.update({
        where: {
            orderId,
        },
        data: {
            status: "CONFIRMED",
        },
    });
};

// Xác nhận các đặt chỗ cho các mục trong đơn hàng
const confirmReservations = async (orderItemIds, db = prisma) => {
    return db.reservation.updateMany({
        where: {
            rentalOrderItemId: {
                in: orderItemIds,
            },
            status: ReservationStatus.TEMPORARY_HOLD,
        },
        data: {
            status: ReservationStatus.CONFIRMED,
        },
    });
};

// Tìm kiếm thanh toán trước thành công cho đơn hàng
const findSuccessfulUpfrontPayment = async (
    orderId,
    db = prisma
) => {
    return db.payment.findFirst({
        where: {
            rentalOrderId: orderId,
            purpose: "UPFRONT",
            status: "SUCCESS",
        },
    });
};

// Tạo một bản ghi hoàn tiền mới
const createRefund = async (
    data,
    db = prisma
) => {
    return db.refund.create({
        data,
    });
};

// Tìm kiếm đơn hàng cùng với các mục và đặt chỗ liên quan để chuẩn bị cho việc hoàn tiền
const findOrderForRefund = async (
    orderId,
    db = prisma
) => {
    return db.rentalOrder.findUnique({
        where: { orderId },

        select: {
            orderId: true,
            status: true,
            depositRefundAmount: true,
            cancellationRefundAmount: true,
        },
    });
};

// Tìm kiếm bản ghi hoàn tiền cùng với thanh toán liên quan
const findRefundById = async (
    refundId,
    db = prisma
) => {
    return db.refund.findUnique({
        where: { refundId },

        include: {
            payment: true,
        },
    });
};

// Tìm kiếm bản ghi hoàn tiền bằng transactionRef
const findRefundByTransactionRef = async (
    transactionRef,
    db = prisma
) => {
    return db.refund.findFirst({
        where: { transactionRef },
    });
};

// Đánh dấu bản ghi hoàn tiền là thành công
const markRefundSuccess = async (
    refundId,
    transactionRef,
    db = prisma
) => {
    return db.refund.update({
        where: { refundId },

        data: {
            status: "SUCCESS",
            transactionRef,
            completedAt: new Date(),
        },
    });
};

// Cập nhật tổng số tiền đã hoàn lại và tổng số tiền thu được cho đơn hàng
const addRefundToOrderTotals = async (
    orderId,
    amount,
    db = prisma
) => {
    return db.rentalOrder.update({
        where: {
            orderId,
        },

        data: {
            totalRefunded: {
                increment: amount,
            },

            netCollected: {
                decrement: amount,
            },
        },
    });
};

// Tìm kiếm đơn hàng để thanh toán bổ sung
const findOrderForAdditionalPayment = async (
    orderId,
    customerId,
    db = prisma
) => {
    return db.rentalOrder.findFirst({
        where: {
            orderId,
            customerId,
        },
    });
};

const findAdditionalPaymentByStatus = async (
    orderId,
    status,
    db = prisma
) => {
    return db.payment.findFirst({
        where: {
            rentalOrderId: orderId,
            purpose: PaymentPurpose.ADDITIONAL,
            status,
        },
    });
};

// Tìm kiếm yêu cầu hủy để hoàn tiền
const findCancellationRequestForRefund = async (
    cancellationRequestId,
    db = prisma
) => {
    return db.cancellationRequest.findUnique({
        where: {
            cancellationRequestId,
        },
    });
};

// Tìm kiếm bản ghi hoàn tiền hủy bằng paymentId
const findCancellationRefundByPaymentId = async (
    paymentId,
    db = prisma
) => {
    return db.refund.findFirst({
        where: {
            paymentId,
            type: RefundType.CANCELLATION_REFUND,
        },
    });
};

// Đánh dấu bản ghi hoàn tiền là thất bại
const markRefundFailed = async (
    refundId,
    transactionRef,
    db = prisma
) => {
    return db.refund.update({
        where: {
            refundId,
        },

        data: {
            status: RefundStatus.FAILED,
            transactionRef,
            completedAt: new Date(),
        },
    });
};

const findRefundByTypeAndStatus = async ( // Tim kiếm bản ghi hoàn tiền theo loại và trạng thái
    paymentId,
    type,
    status,
    db = prisma
) => {
    return db.refund.findFirst({
        where: {
            paymentId,
            type,
            status,
        },
    });
};
// Tìm kiếm thanh toán trước theo trạng thái
const findUpfrontPaymentByStatus = async (
    orderId,
    status,
    db = prisma
) => {
    return db.payment.findFirst({
        where: {
            rentalOrderId: orderId,
            purpose: PaymentPurpose.UPFRONT,
            status,
        },
    });
};

const findLatestRefundByPaymentAndType = async (
    paymentId,
    type,
    db = prisma
) => {
    return db.refund.findFirst({
        where: {
            paymentId,
            type,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
};

const findRefunds = async (db = prisma) => {
    return db.refund.findMany({
        select: {
            refundId: true,
            paymentId: true,
            type: true,
            amount: true,
            reason: true,
            status: true,
            transactionRef: true,
            createdAt: true,
            completedAt: true,
            payment: {
                select: {
                    paymentId: true,
                    rentalOrderId: true,
                    purpose: true,
                    amount: true,
                    status: true,
                    paidAt: true,
                    rentalOrder: {
                        select: {
                            orderId: true,
                            status: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
};

const findExpiredHoldReconciliationPayments = async (
    db = prisma
) => {
    return db.payment.findMany({
        where: {
            purpose: PaymentPurpose.UPFRONT,
            status: PaymentStatus.SUCCESS,
            rentalOrder: {
                status: RentalOrderStatus.EXPIRED,
            },
        },
        include: {
            rentalOrder: true,
            refunds: {
                where: {
                    type: RefundType.EXPIRED_HOLD_REFUND,
                },
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
        orderBy: {
            paidAt: "desc",
        },
    });
};

const findExpiredHoldPaymentForRefund = async (
    paymentId,
    db = prisma
) => {
    return db.payment.findUnique({
        where: {
            paymentId,
        },
        include: {
            rentalOrder: true,
        },
    });
};

const findRefundForCallback = async (
    refundId,
    db = prisma
) => {
    return db.refund.findUnique({
        where: {
            refundId,
        },
        include: {
            payment: {
                include: {
                    rentalOrder: true,
                },
            },
        },
    });
};

export {
    findOrderForPayment,
    createPayment,
    findPaymentById,
    findPaymentByTransactionRef,
    markPaymentSuccess,
    markPaymentFailed,
    addPaymentToOrderTotals,
    confirmRentalOrder,
    confirmReservations,
    findSuccessfulUpfrontPayment,
    createRefund,
    findOrderForRefund,
    findRefundById,
    findRefundByTransactionRef,
    markRefundSuccess,
    addRefundToOrderTotals,
    findOrderForAdditionalPayment,
    findAdditionalPaymentByStatus,
    findCancellationRequestForRefund,
    findCancellationRefundByPaymentId,
    markRefundFailed,
    findRefundByTypeAndStatus,
    findLatestRefundByPaymentAndType,
    findRefunds,
    findUpfrontPaymentByStatus,
    findExpiredHoldReconciliationPayments,
    findExpiredHoldPaymentForRefund,
    findRefundForCallback,
}
