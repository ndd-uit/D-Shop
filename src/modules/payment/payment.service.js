import prisma from "../../config/prisma.js";
import {
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
    findRefunds,
    findUpfrontPaymentByStatus,
    findExpiredHoldReconciliationPayments,
    findExpiredHoldPaymentForRefund,
    findRefundForCallback,
} from "./payment.repository.js";

import {
    PaymentPurpose,
    PaymentStatus,
    RentalOrderStatus,
    ReservationStatus,
    RefundType,
    RefundStatus,
    CancellationRequestStatus,
} from "../../generated/prisma/client.ts";

import {
    createOrderStatusHistory,
} from "../rental/rental.repository.js";
import { completeRentalOrderIfReady } from "../rental/rental.service.js";
import {
    validateAndNormalizeTransactionRef,
    validateUuidValue,
} from "../../utils/validation.js";
import {
    createPaymentRequest,
    createRefundRequest,
} from "./gateway/paymentGateway.js";

const attachPaymentGatewayRequest = async (
    result,
    description
) => {
    if (
        !result?.payment ||
        result.payment.status !== PaymentStatus.PENDING
    ) {
        return result;
    }

    const gatewayRequest = await createPaymentRequest({
        paymentId: result.payment.paymentId,
        orderId: result.payment.rentalOrderId,
        amount: result.payment.amount,
        purpose: result.payment.purpose,
        description,
    });

    return {
        ...result,
        ...gatewayRequest,
    };
};

const attachRefundGatewayRequest = async (result) => {
    if (
        !result?.refund ||
        result.refund.status !== RefundStatus.PENDING
    ) {
        return result;
    }

    const gatewayRequest = await createRefundRequest({
        refundId: result.refund.refundId,
        paymentId: result.refund.paymentId,
        amount: result.refund.amount,
        type: result.refund.type,
        reason: result.refund.reason,
    });

    return {
        ...result,
        ...gatewayRequest,
    };
};

const processUpfrontPaymentSuccess = async (paymentId, transactionRef) => {
    validateUuidValue(paymentId);
    const normalizedTransactionRef =
        validateAndNormalizeTransactionRef(transactionRef);

    try {
        return await prisma.$transaction(
            async (tx) => {
                //Tim Payment
                const payment = await findPaymentById(paymentId, tx);

                if (!payment) {
                    throw new Error("PAYMENT_NOT_FOUND");
                }

                if (payment.purpose !== PaymentPurpose.UPFRONT) {
                    throw new Error("PAYMENT_NOT_UPFRONT");
                }
                // Callback nay da xu ly roi
                if (payment.status === PaymentStatus.SUCCESS) {
                    if (
                        payment.transactionRef ===
                        normalizedTransactionRef
                    ) {
                        return {
                            payment,
                            alreadyProcessed: true,
                        };
                    }

                    throw new Error("PAYMENT_ALREADY_PROCESSED");
                }

                if (payment.status === PaymentStatus.FAILED) {
                    throw new Error("PAYMENT_ALREADY_PROCESSED");
                }

                if (payment.status !== PaymentStatus.PENDING) {
                    throw new Error("INVALID_PAYMENT_STATUS");
                }
                // Kiểm tra transactionRef có bị payment khác dùng chưa
                const existingPayment =
                    await findPaymentByTransactionRef(
                        normalizedTransactionRef,
                        tx
                    );

                if (
                    existingPayment &&
                    existingPayment.paymentId !== paymentId
                ) {
                    throw new Error("TRANSACTION_REF_CONFLICT");
                }

                const order = payment.rentalOrder;
                const now = new Date();
                // Kiểm tra tất cả item còn hold hợp lệ
                const hasValidHold = order.items.every((item) =>
                    item.reservations.some(
                        (reservation) =>
                            reservation.status ===
                            ReservationStatus.TEMPORARY_HOLD &&
                            reservation.holdExpiresAt &&
                            reservation.holdExpiresAt > now,
                    ),
                );
                // Gateway báo thành công → payment phải được ghi nhận
                const successfulPayment = await markPaymentSuccess(
                    payment.paymentId,
                    normalizedTransactionRef,
                    now,
                    tx,
                );
                // Cập nhật tổng số tiền thanh toán và tổng số tiền đặt cọc trong đơn hàng
                await addPaymentToOrderTotals(
                    order.orderId,
                    payment.amount,
                    tx,
                );
                // Hold hết hạn hoặc Order không còn chờ thanh toán
                if (
                    !hasValidHold ||
                    order.status !== RentalOrderStatus.PENDING_PAYMENT
                ) {
                    return {
                        payment: successfulPayment,
                        orderConfirmed: false,
                        requiresReconciliation: true,
                    };
                }
                // Xac nhan order
                await confirmRentalOrder(order.orderId, tx);
                // Lay cac orderItemId de xac nhan reservation
                const orderItemIds = order.items.map(
                    (item) => item.orderItemId,
                );
                // Xac nhan reservation
                await confirmReservations(orderItemIds, tx);
                // Tạo lịch sử thay đổi trạng thái đơn hàng
                await createOrderStatusHistory(
                    {
                        rentalOrderId: order.orderId,
                        oldStatus: RentalOrderStatus.PENDING_PAYMENT,
                        newStatus: RentalOrderStatus.CONFIRMED,
                        changedBy: null,
                        changedAt: now,
                        reason: "Upfront payment succeeded",
                    },
                    tx,
                );

                return {
                    payment: successfulPayment,
                    orderConfirmed: true,
                    requiresReconciliation: false,
                };
            },
            {
                isolationLevel: "Serializable",
            },
        );
    } catch (error) {
        if (error.code === "P2034") {
            throw new Error("PAYMENT_CONFLICT");
        }

        throw error;
    }
};

const createUpfrontPayment = async (
    orderId,
    customerId
) => {
    validateUuidValue(orderId);

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const result = await prisma.$transaction(
                async (tx) => {
                    const order =
                        await findOrderForPayment(
                            orderId,
                            customerId,
                            tx
                        );

                    if (!order) {
                        throw new Error(
                            "ORDER_NOT_FOUND"
                        );
                    }

                    if (
                        order.status !==
                        RentalOrderStatus.PENDING_PAYMENT
                    ) {
                        throw new Error(
                            "ORDER_NOT_PAYABLE"
                        );
                    }

                    const now = new Date();

                    const hasValidHold =
                        order.items.length > 0 &&
                        order.items.every((item) =>
                            item.reservations.some(
                                (reservation) =>
                                    reservation.status ===
                                    ReservationStatus.TEMPORARY_HOLD &&
                                    reservation.holdExpiresAt &&
                                    new Date(
                                        reservation.holdExpiresAt
                                    ) > now
                            )
                        );

                    if (!hasValidHold) {
                        throw new Error(
                            "HOLD_EXPIRED"
                        );
                    }

                    // 1. Ưu tiên Payment SUCCESS
                    const successfulPayment =
                        await findUpfrontPaymentByStatus(
                            orderId,
                            PaymentStatus.SUCCESS,
                            tx
                        );

                    if (successfulPayment) {
                        return {
                            payment: successfulPayment,
                            alreadyCreated: true,
                        };
                    }

                    // 2. Sau đó tìm Payment PENDING
                    const pendingPayment =
                        await findUpfrontPaymentByStatus(
                            orderId,
                            PaymentStatus.PENDING,
                            tx
                        );

                    if (pendingPayment) {
                        return {
                            payment: pendingPayment,
                            alreadyCreated: true,
                        };
                    }

                    // FAILED không tìm
                    // → cho phép tạo attempt mới
                    const payment =
                        await createPayment(
                            {
                                rentalOrderId: orderId,
                                purpose:
                                    PaymentPurpose.UPFRONT,
                                amount:
                                    order.upfrontAmount,
                                status:
                                    PaymentStatus.PENDING,
                            },
                            tx
                        );

                    return {
                        payment,
                        alreadyCreated: false,
                    };
                },
                {
                    isolationLevel: "Serializable",
                    maxWait: 10000,
                    timeout: 30000,
                }
            );

            return await attachPaymentGatewayRequest(
                result,
                "Thanh toán trước cho đơn thuê"
            );
        } catch (error) {
            if (
                error.code === "P2034" &&
                attempt < 2
            ) {
                continue;
            }

            throw error;
        }
    }
};

// Tạo một khoản hoàn tiền đặt cọc nếu cần thiết
const createDepositRefund = async (orderId) => {
    validateUuidValue(orderId);

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const result = await prisma.$transaction(
                async (tx) => {
                    const order =
                        await findOrderForRefund(
                            orderId,
                            tx
                        );

                    if (!order) {
                        throw new Error("ORDER_NOT_FOUND");
                    }

                    const refundAmount =
                        Number(order.depositRefundAmount);

                    if (refundAmount <= 0) {
                        throw new Error(
                            "NO_REFUND_REQUIRED"
                        );
                    }

                    const payment =
                        await findSuccessfulUpfrontPayment(
                            orderId,
                            tx
                        );

                    if (!payment) {
                        throw new Error(
                            "UPFRONT_PAYMENT_NOT_FOUND"
                        );
                    }

                    // 1. Ưu tiên Refund SUCCESS
                    const successfulRefund =
                        await findRefundByTypeAndStatus(
                            payment.paymentId,
                            RefundType.DEPOSIT_RETURN,
                            RefundStatus.SUCCESS,
                            tx
                        );

                    if (successfulRefund) {
                        return {
                            refund: successfulRefund,
                            alreadyCreated: true,
                        };
                    }

                    // 2. Sau đó tìm Refund PENDING
                    const pendingRefund =
                        await findRefundByTypeAndStatus(
                            payment.paymentId,
                            RefundType.DEPOSIT_RETURN,
                            RefundStatus.PENDING,
                            tx
                        );

                    if (pendingRefund) {
                        return {
                            refund: pendingRefund,
                            alreadyCreated: true,
                        };
                    }

                    // FAILED không tìm
                    // → cho phép tạo attempt mới
                    const refund = await createRefund(
                        {
                            paymentId: payment.paymentId,
                            type: RefundType.DEPOSIT_RETURN,
                            amount: refundAmount,
                            reason: "Refund rental deposit",
                            status: RefundStatus.PENDING,
                        },
                        tx
                    );

                    return {
                        refund,
                        alreadyCreated: false,
                    };
                },
                {
                    isolationLevel: "Serializable",
                    maxWait: 10000,
                    timeout: 30000,
                }
            );

            return await attachRefundGatewayRequest(
                result
            );
        } catch (error) {
            if (
                error.code === "P2034" &&
                attempt < 2
            ) {
                continue;
            }

            throw error;
        }
    }
};


// Xử lý callback thành công từ cổng thanh toán cho khoản hoàn tiền đặt cọc
const processDepositRefundSuccess = async (
    refundId,
    transactionRef
) => {
    validateUuidValue(refundId);
    const normalizedTransactionRef =
        validateAndNormalizeTransactionRef(transactionRef);

    const result = await prisma.$transaction(
        async (tx) => {
            const refund = await findRefundById(
                refundId,
                tx
            );

            if (!refund) {
                throw new Error("REFUND_NOT_FOUND");
            }

            if (
                refund.type !==
                RefundType.DEPOSIT_RETURN
            ) {
                throw new Error("INVALID_REFUND_TYPE");
            }

            // Callback lặp lại cùng transaction
            if (
                refund.status === RefundStatus.SUCCESS &&
                refund.transactionRef === normalizedTransactionRef
            ) {
                return {
                    refund,
                    orderId:
                        refund.payment.rentalOrderId,
                    alreadyProcessed: true,
                };
            }

            if (
                refund.status === RefundStatus.SUCCESS
            ) {
                throw new Error(
                    "REFUND_ALREADY_PROCESSED"
                );
            }

            if (refund.status === RefundStatus.FAILED) {
                throw new Error("REFUND_ALREADY_PROCESSED");
            }

            if (refund.status !== RefundStatus.PENDING) {
                throw new Error("INVALID_REFUND_STATUS");
            }

            const existingRefund =
                await findRefundByTransactionRef(
                    normalizedTransactionRef,
                    tx
                );

            if (
                existingRefund &&
                existingRefund.refundId !== refundId
            ) {
                throw new Error(
                    "TRANSACTION_REF_CONFLICT"
                );
            }

            const successfulRefund =
                await markRefundSuccess(
                    refundId,
                    normalizedTransactionRef,
                    tx
                );

            await addRefundToOrderTotals(
                refund.payment.rentalOrderId,
                Number(refund.amount),
                tx
            );

            return {
                refund: successfulRefund,
                orderId:
                    refund.payment.rentalOrderId,
                alreadyProcessed: false,
            };
        }
    );

    // Refund transaction đã commit rồi mới kiểm tra Order
    const completion =
        await completeRentalOrderIfReady(
            result.orderId
        );

    return {
        refund: result.refund,
        alreadyProcessed:
            result.alreadyProcessed,
        completion,
    };
};

const createAdditionalPayment = async (
    orderId,
    customerId
) => {
    validateUuidValue(orderId);

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const result = await prisma.$transaction(
                async (tx) => {
                    const order =
                        await findOrderForAdditionalPayment(
                            orderId,
                            customerId,
                            tx
                        );

                    if (!order) {
                        throw new Error("ORDER_NOT_FOUND");
                    }

                    if (
                        order.status !==
                        RentalOrderStatus.SETTLEMENT_PENDING
                    ) {
                        throw new Error(
                            "INVALID_ORDER_STATUS"
                        );
                    }

                    const amount =
                        Number(order.additionalPayment);

                    if (amount <= 0) {
                        throw new Error(
                            "NO_ADDITIONAL_PAYMENT_REQUIRED"
                        );
                    }

                    const successfulPayment =
                        await findAdditionalPaymentByStatus(
                            orderId,
                            PaymentStatus.SUCCESS,
                            tx
                        );

                    if (successfulPayment) {
                        return {
                            payment: successfulPayment,
                            alreadyCreated: true,
                        };
                    }

                    const pendingPayment =
                        await findAdditionalPaymentByStatus(
                            orderId,
                            PaymentStatus.PENDING,
                            tx
                        );

                    if (pendingPayment) {
                        return {
                            payment: pendingPayment,
                            alreadyCreated: true,
                        };
                    }

                    const payment = await createPayment(
                        {
                            rentalOrderId: orderId,
                            purpose:
                                PaymentPurpose.ADDITIONAL,
                            amount,
                            status:
                                PaymentStatus.PENDING,
                        },
                        tx
                    );

                    return {
                        payment,
                        alreadyCreated: false,
                    };
                },
                {
                    isolationLevel: "Serializable",
                    maxWait: 10000,
                    timeout: 30000,
                }
            );

            return await attachPaymentGatewayRequest(
                result,
                "Thanh toán bổ sung cho đơn thuê"
            );
        } catch (error) {
            if (
                error.code === "P2034" &&
                attempt < 2
            ) {
                continue;
            }

            throw error;
        }
    }
};


const createCancellationRefund = async (
    cancellationRequestId
) => {
    validateUuidValue(cancellationRequestId);

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const result = await prisma.$transaction(
                async (tx) => {
                    const request =
                        await findCancellationRequestForRefund(
                            cancellationRequestId,
                            tx
                        );

                    if (!request) {
                        throw new Error(
                            "CANCELLATION_REQUEST_NOT_FOUND"
                        );
                    }

                    if (
                        request.status !==
                        CancellationRequestStatus.APPROVED
                    ) {
                        throw new Error(
                            "CANCELLATION_NOT_APPROVED"
                        );
                    }

                    const refundAmount =
                        Number(request.refundAmount);

                    if (refundAmount <= 0) {
                        throw new Error(
                            "NO_CANCELLATION_REFUND_REQUIRED"
                        );
                    }

                    const payment =
                        await findSuccessfulUpfrontPayment(
                            request.rentalOrderId,
                            tx
                        );

                    if (!payment) {
                        throw new Error(
                            "UPFRONT_PAYMENT_NOT_FOUND"
                        );
                    }

                    // Ưu tiên SUCCESS
                    const successfulRefund =
                        await findRefundByTypeAndStatus(
                            payment.paymentId,
                            RefundType.CANCELLATION_REFUND,
                            RefundStatus.SUCCESS,
                            tx
                        );

                    if (successfulRefund) {
                        return {
                            refund: successfulRefund,
                            alreadyCreated: true,
                        };
                    }

                    // Sau đó PENDING
                    const pendingRefund =
                        await findRefundByTypeAndStatus(
                            payment.paymentId,
                            RefundType.CANCELLATION_REFUND,
                            RefundStatus.PENDING,
                            tx
                        );

                    if (pendingRefund) {
                        return {
                            refund: pendingRefund,
                            alreadyCreated: true,
                        };
                    }

                    // FAILED bị bỏ qua → cho retry
                    const refund = await createRefund(
                        {
                            paymentId: payment.paymentId,
                            type:
                                RefundType.CANCELLATION_REFUND,
                            amount: refundAmount,
                            reason: request.reason,
                            status: RefundStatus.PENDING,
                        },
                        tx
                    );

                    return {
                        refund,
                        alreadyCreated: false,
                    };
                },
                {
                    isolationLevel: "Serializable",
                    maxWait: 10000,
                    timeout: 30000,
                }
            );

            return await attachRefundGatewayRequest(
                result
            );
        } catch (error) {
            if (
                error.code === "P2034" &&
                attempt < 2
            ) {
                continue;
            }

            throw error;
        }
    }
};
const processCancellationRefundSuccess = async ( // Xử lý callback thành công từ cổng thanh toán cho khoản hoàn tiền hủy đơn hàng
    refundId,
    transactionRef
) => {
    validateUuidValue(refundId);
    const normalizedTransactionRef =
        validateAndNormalizeTransactionRef(transactionRef);

    return prisma.$transaction(async (tx) => {
        const refund = await findRefundById(
            refundId,
            tx
        );

        if (!refund) {
            throw new Error("REFUND_NOT_FOUND");
        }

        if (
            refund.type !==
            RefundType.CANCELLATION_REFUND
        ) {
            throw new Error("INVALID_REFUND_TYPE");
        }

        // Callback lặp lại cùng transaction
        if (
            refund.status === RefundStatus.SUCCESS &&
            refund.transactionRef === normalizedTransactionRef
        ) {
            return {
                refund,
                alreadyProcessed: true,
            };
        }

        if (
            refund.status === RefundStatus.SUCCESS
        ) {
            throw new Error(
                "REFUND_ALREADY_PROCESSED"
            );
        }

        if (refund.status === RefundStatus.FAILED) {
            throw new Error("REFUND_ALREADY_PROCESSED");
        }

        if (refund.status !== RefundStatus.PENDING) {
            throw new Error("INVALID_REFUND_STATUS");
        }

        const existingRefund =
            await findRefundByTransactionRef(
                normalizedTransactionRef,
                tx
            );

        if (
            existingRefund &&
            existingRefund.refundId !== refundId
        ) {
            throw new Error(
                "TRANSACTION_REF_CONFLICT"
            );
        }

        const successfulRefund =
            await markRefundSuccess(
                refundId,
                normalizedTransactionRef,
                tx
            );

        await addRefundToOrderTotals(
            refund.payment.rentalOrderId,
            Number(refund.amount),
            tx
        );

        return {
            refund: successfulRefund,
            alreadyProcessed: false,
        };
    });
};

// Xử lý callback thành công từ cổng thanh toán cho khoản thanh toán bổ sung
const processAdditionalPaymentSuccess = async (
    paymentId,
    transactionRef
) => {
    validateUuidValue(paymentId);
    const normalizedTransactionRef =
        validateAndNormalizeTransactionRef(transactionRef);

    let result;

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            result = await prisma.$transaction(
                async (tx) => {
                    const payment =
                        await findPaymentById(
                            paymentId,
                            tx
                        );

                    if (!payment) {
                        throw new Error(
                            "PAYMENT_NOT_FOUND"
                        );
                    }

                    if (
                        payment.purpose !==
                        PaymentPurpose.ADDITIONAL
                    ) {
                        throw new Error(
                            "INVALID_PAYMENT_PURPOSE"
                        );
                    }

                    // Callback lặp lại đúng transaction cũ
                    if (
                        payment.status ===
                        PaymentStatus.SUCCESS &&
                        payment.transactionRef ===
                        normalizedTransactionRef
                    ) {
                        return {
                            payment,
                            orderId:
                                payment.rentalOrderId,
                            orderStatus:
                                payment.rentalOrder.status,
                            alreadyProcessed: true,
                        };
                    }

                    // Payment đã SUCCESS nhưng ref khác
                    if (
                        payment.status ===
                        PaymentStatus.SUCCESS
                    ) {
                        throw new Error(
                            "PAYMENT_ALREADY_PROCESSED"
                        );
                    }

                    if (
                        payment.status ===
                        PaymentStatus.FAILED
                    ) {
                        throw new Error(
                            "PAYMENT_ALREADY_PROCESSED"
                        );
                    }

                    if (
                        payment.status !==
                        PaymentStatus.PENDING
                    ) {
                        throw new Error(
                            "INVALID_PAYMENT_STATUS"
                        );
                    }

                    if (
                        payment.rentalOrder.status !==
                        RentalOrderStatus.SETTLEMENT_PENDING
                    ) {
                        throw new Error(
                            "INVALID_ORDER_STATUS"
                        );
                    }

                    if (
                        Number(
                            payment.rentalOrder
                                .additionalPayment
                        ) <= 0 ||
                        Number(payment.amount) !==
                        Number(
                            payment.rentalOrder
                                .additionalPayment
                        )
                    ) {
                        throw new Error(
                            "INVALID_PAYMENT_AMOUNT"
                        );
                    }

                    const existingPayment =
                        await findPaymentByTransactionRef(
                            normalizedTransactionRef,
                            tx
                        );

                    if (
                        existingPayment &&
                        existingPayment.paymentId !==
                        paymentId
                    ) {
                        throw new Error(
                            "TRANSACTION_REF_CONFLICT"
                        );
                    }

                    const successfulPayment =
                        await markPaymentSuccess(
                            paymentId,
                            normalizedTransactionRef,
                            new Date(),
                            tx
                        );

                    await addPaymentToOrderTotals(
                        payment.rentalOrderId,
                        Number(payment.amount),
                        tx
                    );

                    return {
                        payment: successfulPayment,
                        orderId:
                            payment.rentalOrderId,
                        orderStatus:
                            payment.rentalOrder.status,
                        alreadyProcessed: false,
                    };
                },
                {
                    isolationLevel: "Serializable",
                    maxWait: 10000,
                    timeout: 30000,
                }
            );

            break;
        } catch (error) {
            if (
                error.code === "P2034" &&
                attempt < 2
            ) {
                continue;
            }

            throw error;
        }
    }

    // Transaction Payment đã commit rồi mới check completion
    if (
        result.alreadyProcessed &&
        ![
            RentalOrderStatus.SETTLEMENT_PENDING,
            RentalOrderStatus.COMPLETED,
        ].includes(result.orderStatus)
    ) {
        return {
            payment: result.payment,
            alreadyProcessed: true,
            completion: {
                completed: false,
                skipped: true,
                reason:
                    "ORDER_NOT_IN_SETTLEMENT_FLOW",
            },
        };
    }

    const completion =
        await completeRentalOrderIfReady(
            result.orderId
        );

    return {
        payment: result.payment,
        alreadyProcessed:
            result.alreadyProcessed,
        completion,
    };
};

const processPaymentFailed = async (
    paymentId,
    transactionRef
) => {
    validateUuidValue(paymentId);
    const normalizedTransactionRef =
        validateAndNormalizeTransactionRef(transactionRef);

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            return await prisma.$transaction(
                async (tx) => {
                    const payment =
                        await findPaymentById(
                            paymentId,
                            tx
                        );

                    if (!payment) {
                        throw new Error(
                            "PAYMENT_NOT_FOUND"
                        );
                    }

                    if (
                        payment.status ===
                        PaymentStatus.FAILED &&
                        payment.transactionRef ===
                        normalizedTransactionRef
                    ) {
                        return {
                            payment,
                            alreadyProcessed: true,
                        };
                    }

                    if (
                        payment.status ===
                        PaymentStatus.FAILED
                    ) {
                        throw new Error(
                            "PAYMENT_ALREADY_PROCESSED"
                        );
                    }

                    if (
                        payment.status ===
                        PaymentStatus.SUCCESS
                    ) {
                        throw new Error(
                            "PAYMENT_ALREADY_PROCESSED"
                        );
                    }

                    if (
                        payment.status !==
                        PaymentStatus.PENDING
                    ) {
                        throw new Error(
                            "INVALID_PAYMENT_STATUS"
                        );
                    }

                    const existingPayment =
                        await findPaymentByTransactionRef(
                            normalizedTransactionRef,
                            tx
                        );

                    if (
                        existingPayment &&
                        existingPayment.paymentId !==
                        paymentId
                    ) {
                        throw new Error(
                            "TRANSACTION_REF_CONFLICT"
                        );
                    }

                    const failedPayment =
                        await markPaymentFailed(
                            paymentId,
                            normalizedTransactionRef,
                            tx
                        );

                    return {
                        payment: failedPayment,
                        alreadyProcessed: false,
                    };
                },
                {
                    isolationLevel: "Serializable",
                    maxWait: 10000,
                    timeout: 30000,
                }
            );
        } catch (error) {
            if (
                error.code === "P2034" &&
                attempt < 2
            ) {
                continue;
            }

            throw error;
        }
    }
};

const processRefundFailed = async (
    refundId,
    transactionRef
) => {
    validateUuidValue(refundId);
    const normalizedTransactionRef =
        validateAndNormalizeTransactionRef(transactionRef);

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            return await prisma.$transaction(
                async (tx) => {
                    const refund =
                        await findRefundById(
                            refundId,
                            tx
                        );

                    if (!refund) {
                        throw new Error(
                            "REFUND_NOT_FOUND"
                        );
                    }

                    // FAILED + cùng transactionRef
                    // → callback lặp
                    if (
                        refund.status ===
                        RefundStatus.FAILED &&
                        refund.transactionRef ===
                        normalizedTransactionRef
                    ) {
                        return {
                            refund,
                            alreadyProcessed: true,
                        };
                    }

                    // FAILED nhưng transactionRef khác
                    if (
                        refund.status ===
                        RefundStatus.FAILED
                    ) {
                        throw new Error(
                            "REFUND_ALREADY_PROCESSED"
                        );
                    }

                    // SUCCESS tuyệt đối không đổi ngược FAILED
                    if (
                        refund.status ===
                        RefundStatus.SUCCESS
                    ) {
                        throw new Error(
                            "REFUND_ALREADY_PROCESSED"
                        );
                    }

                    // Chỉ PENDING mới được fail
                    if (
                        refund.status !==
                        RefundStatus.PENDING
                    ) {
                        throw new Error(
                            "INVALID_REFUND_STATUS"
                        );
                    }

                    const existingRefund =
                        await findRefundByTransactionRef(
                            normalizedTransactionRef,
                            tx
                        );

                    if (
                        existingRefund &&
                        existingRefund.refundId !==
                        refundId
                    ) {
                        throw new Error(
                            "TRANSACTION_REF_CONFLICT"
                        );
                    }

                    const failedRefund =
                        await markRefundFailed(
                            refundId,
                            normalizedTransactionRef,
                            tx
                        );

                    return {
                        refund: failedRefund,
                        alreadyProcessed: false,
                    };
                },
                {
                    isolationLevel: "Serializable",
                    maxWait: 10000,
                    timeout: 30000,
                }
            );
        } catch (error) {
            if (
                error.code === "P2034" &&
                attempt < 2
            ) {
                continue;
            }

            throw error;
        }
    }
};

const createStoreCancellationRefund = async (
    orderId
) => {
    validateUuidValue(orderId);

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const result = await prisma.$transaction(
                async (tx) => {
                    const order =
                        await findOrderForRefund(
                            orderId,
                            tx
                        );

                    if (!order) {
                        throw new Error(
                            "ORDER_NOT_FOUND"
                        );
                    }

                    if (
                        order.status !==
                        RentalOrderStatus.CANCELLED
                    ) {
                        throw new Error(
                            "ORDER_NOT_CANCELLED"
                        );
                    }

                    const refundAmount =
                        Number(
                            order.cancellationRefundAmount
                        );

                    if (refundAmount <= 0) {
                        throw new Error(
                            "NO_CANCELLATION_REFUND_REQUIRED"
                        );
                    }

                    const payment =
                        await findSuccessfulUpfrontPayment(
                            orderId,
                            tx
                        );

                    if (!payment) {
                        throw new Error(
                            "UPFRONT_PAYMENT_NOT_FOUND"
                        );
                    }

                    // SUCCESS trước
                    const successfulRefund =
                        await findRefundByTypeAndStatus(
                            payment.paymentId,
                            RefundType.CANCELLATION_REFUND,
                            RefundStatus.SUCCESS,
                            tx
                        );

                    if (successfulRefund) {
                        return {
                            refund: successfulRefund,
                            alreadyCreated: true,
                        };
                    }

                    // rồi PENDING
                    const pendingRefund =
                        await findRefundByTypeAndStatus(
                            payment.paymentId,
                            RefundType.CANCELLATION_REFUND,
                            RefundStatus.PENDING,
                            tx
                        );

                    if (pendingRefund) {
                        return {
                            refund: pendingRefund,
                            alreadyCreated: true,
                        };
                    }

                    // FAILED bị bỏ qua → retry được
                    const refund = await createRefund(
                        {
                            paymentId: payment.paymentId,
                            type:
                                RefundType.CANCELLATION_REFUND,
                            amount: refundAmount,
                            reason:
                                "Store cancellation refund",
                            status:
                                RefundStatus.PENDING,
                        },
                        tx
                    );

                    return {
                        refund,
                        alreadyCreated: false,
                    };
                },
                {
                    isolationLevel: "Serializable",
                    maxWait: 10000,
                    timeout: 30000,
                }
            );

            return await attachRefundGatewayRequest(
                result
            );
        } catch (error) {
            if (
                error.code === "P2034" &&
                attempt < 2
            ) {
                continue;
            }

            throw error;
        }
    }
};

const getExpiredHoldReconciliations = async () => {
    const payments =
        await findExpiredHoldReconciliationPayments();

    return payments.map((payment) => {
        const refunds = payment.refunds ?? [];

        let reconciliationStatus = "NEEDS_REFUND";

        if (
            refunds.some(
                (refund) =>
                    refund.status === RefundStatus.SUCCESS
            )
        ) {
            reconciliationStatus = "RESOLVED";
        } else if (
            refunds.some(
                (refund) =>
                    refund.status === RefundStatus.PENDING
            )
        ) {
            reconciliationStatus = "REFUND_PENDING";
        } else if (
            refunds.some(
                (refund) =>
                    refund.status === RefundStatus.FAILED
            )
        ) {
            reconciliationStatus = "REFUND_FAILED";
        }

        return {
            paymentId: payment.paymentId,
            rentalOrderId: payment.rentalOrderId,
            amount: payment.amount,
            paidAt: payment.paidAt,
            transactionRef: payment.transactionRef,
            orderStatus: payment.rentalOrder.status,
            reconciliationStatus,
            latestRefund: refunds[0] ?? null,
        };
    });
};

const createExpiredHoldRefund = async (paymentId) => {
    validateUuidValue(paymentId);

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const result = await prisma.$transaction(
                async (tx) => {
                    const payment =
                        await findExpiredHoldPaymentForRefund(
                            paymentId,
                            tx
                        );

                    if (!payment) {
                        throw new Error("PAYMENT_NOT_FOUND");
                    }

                    if (
                        payment.purpose !== PaymentPurpose.UPFRONT ||
                        payment.status !== PaymentStatus.SUCCESS
                    ) {
                        throw new Error(
                            "INVALID_RECONCILIATION_PAYMENT"
                        );
                    }

                    if (
                        payment.rentalOrder.status !==
                        RentalOrderStatus.EXPIRED
                    ) {
                        throw new Error("ORDER_NOT_EXPIRED");
                    }

                    const successfulRefund =
                        await findRefundByTypeAndStatus(
                            paymentId,
                            RefundType.EXPIRED_HOLD_REFUND,
                            RefundStatus.SUCCESS,
                            tx
                        );

                    if (successfulRefund) {
                        return {
                            refund: successfulRefund,
                            alreadyCreated: true,
                        };
                    }

                    const pendingRefund =
                        await findRefundByTypeAndStatus(
                            paymentId,
                            RefundType.EXPIRED_HOLD_REFUND,
                            RefundStatus.PENDING,
                            tx
                        );

                    if (pendingRefund) {
                        return {
                            refund: pendingRefund,
                            alreadyCreated: true,
                        };
                    }

                    const refund = await createRefund(
                        {
                            paymentId,
                            type:
                                RefundType.EXPIRED_HOLD_REFUND,
                            amount: Number(payment.amount),
                            reason:
                                "Hoàn tiền giao dịch thành công sau khi giữ chỗ đã hết hạn",
                            status: RefundStatus.PENDING,
                        },
                        tx
                    );

                    return {
                        refund,
                        alreadyCreated: false,
                    };
                },
                {
                    isolationLevel: "Serializable",
                    maxWait: 10000,
                    timeout: 30000,
                }
            );

            return await attachRefundGatewayRequest(
                result
            );
        } catch (error) {
            const retryable =
                error?.code === "P2034" ||
                error?.code === "40001" ||
                error?.code === "TransactionWriteConflict";

            if (retryable && attempt < 3) {
                continue;
            }

            throw error;
        }
    }
};

const processExpiredHoldRefundSuccess = async (
    refundId,
    transactionRef
) => {
    validateUuidValue(refundId);
    const normalizedTransactionRef =
        validateAndNormalizeTransactionRef(transactionRef);

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            return await prisma.$transaction(
                async (tx) => {
                    const refund =
                        await findRefundForCallback(
                            refundId,
                            tx
                        );

                    if (!refund) {
                        throw new Error("REFUND_NOT_FOUND");
                    }

                    if (
                        refund.type !==
                        RefundType.EXPIRED_HOLD_REFUND
                    ) {
                        throw new Error("INVALID_REFUND_TYPE");
                    }

                    if (
                        refund.payment.purpose !==
                            PaymentPurpose.UPFRONT ||
                        refund.payment.status !==
                            PaymentStatus.SUCCESS ||
                        refund.payment.rentalOrder.status !==
                            RentalOrderStatus.EXPIRED
                    ) {
                        throw new Error(
                            "INVALID_EXPIRED_HOLD_REFUND"
                        );
                    }

                    if (
                        refund.status === RefundStatus.SUCCESS
                    ) {
                        if (
                            refund.transactionRef ===
                            normalizedTransactionRef
                        ) {
                            return {
                                refund,
                                alreadyProcessed: true,
                            };
                        }

                        throw new Error(
                            "REFUND_ALREADY_PROCESSED"
                        );
                    }

                    if (
                        refund.status === RefundStatus.FAILED
                    ) {
                        throw new Error(
                            "REFUND_ALREADY_PROCESSED"
                        );
                    }

                    if (
                        refund.status !== RefundStatus.PENDING
                    ) {
                        throw new Error(
                            "INVALID_REFUND_STATUS"
                        );
                    }

                    const refConflict =
                        await findRefundByTransactionRef(
                            normalizedTransactionRef,
                            tx
                        );

                    if (
                        refConflict &&
                        refConflict.refundId !== refundId
                    ) {
                        throw new Error(
                            "TRANSACTION_REF_ALREADY_USED"
                        );
                    }

                    const updatedRefund =
                        await markRefundSuccess(
                            refundId,
                            normalizedTransactionRef,
                            tx
                        );

                    await addRefundToOrderTotals(
                        refund.payment.rentalOrderId,
                        Number(refund.amount),
                        tx
                    );

                    return {
                        refund: updatedRefund,
                        alreadyProcessed: false,
                    };
                },
                {
                    isolationLevel: "Serializable",
                    maxWait: 10000,
                    timeout: 30000,
                }
            );

        } catch (error) {
            const retryable =
                error?.code === "P2034" ||
                error?.code === "40001" ||
                error?.code === "TransactionWriteConflict";

            if (retryable && attempt < 3) {
                continue;
            }

            throw error;
        }
    }
};

const getRefunds = async () => {
    return findRefunds();
};

const retryFailedRefund = async (refundId) => {
    validateUuidValue(refundId);

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const result = await prisma.$transaction(
                async (tx) => {
                    const failedRefund =
                        await findRefundById(
                            refundId,
                            tx
                        );

                    if (!failedRefund) {
                        throw new Error(
                            "REFUND_NOT_FOUND"
                        );
                    }

                    if (
                        failedRefund.status !==
                        RefundStatus.FAILED
                    ) {
                        throw new Error(
                            "REFUND_NOT_FAILED"
                        );
                    }

                    const successfulRefund =
                        await findRefundByTypeAndStatus(
                            failedRefund.paymentId,
                            failedRefund.type,
                            RefundStatus.SUCCESS,
                            tx
                        );

                    if (successfulRefund) {
                        return {
                            refund: successfulRefund,
                            alreadyCreated: true,
                        };
                    }

                    const pendingRefund =
                        await findRefundByTypeAndStatus(
                            failedRefund.paymentId,
                            failedRefund.type,
                            RefundStatus.PENDING,
                            tx
                        );

                    if (pendingRefund) {
                        return {
                            refund: pendingRefund,
                            alreadyCreated: true,
                        };
                    }

                    const refund = await createRefund(
                        {
                            paymentId:
                                failedRefund.paymentId,
                            type: failedRefund.type,
                            amount:
                                Number(failedRefund.amount),
                            reason: failedRefund.reason,
                            status: RefundStatus.PENDING,
                        },
                        tx
                    );

                    return {
                        refund,
                        alreadyCreated: false,
                    };
                },
                {
                    isolationLevel: "Serializable",
                    maxWait: 10000,
                    timeout: 30000,
                }
            );

            return await attachRefundGatewayRequest(
                result
            );
        } catch (error) {
            const retryable =
                error?.code === "P2034" ||
                error?.code === "40001" ||
                error?.code ===
                    "TransactionWriteConflict" ||
                error?.cause?.kind ===
                    "TransactionWriteConflict" ||
                error?.cause?.originalCode === "40001";

            if (retryable && attempt < 2) {
                continue;
            }

            throw error;
        }
    }
};

export { createUpfrontPayment, processUpfrontPaymentSuccess, createDepositRefund, processDepositRefundSuccess, createAdditionalPayment, createCancellationRefund, processCancellationRefundSuccess, processAdditionalPaymentSuccess, processPaymentFailed, processRefundFailed, createStoreCancellationRefund, getExpiredHoldReconciliations, createExpiredHoldRefund, processExpiredHoldRefundSuccess, getRefunds, retryFailedRefund };
