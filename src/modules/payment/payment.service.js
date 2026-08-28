import prisma from "../../config/prisma.js";
import {
    PaymentPurpose,
    PaymentStatus,
    RefundStatus,
    RefundType,
    RentalOrderStatus,
    ReservationStatus,
} from "../../generated/prisma/client.ts";
import { validateUuidValue } from "../../utils/validation.js";
import { createOrderStatusHistory } from "../rental/rental.repository.js";
import { completeRentalOrderIfReady } from "../rental/rental.service.js";
import {
    createPaymentRequest,
    createRefundRequest,
} from "./gateway/paymentGateway.js";
import {
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
} from "./payment.repository.js";

const transactionOptions = {
    isolationLevel: "Serializable",
    maxWait: 10000,
    timeout: 30000,
};

const withTransactionRetry = async (operation) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            return await prisma.$transaction(
                operation,
                transactionOptions
            );
        } catch (error) {
            if (
                error?.code === "P2034" &&
                attempt < 2
            ) {
                continue;
            }

            throw error;
        }
    }

    throw new Error("TRANSACTION_CONFLICT");
};

const normalizeTransactionRef = (transactionRef) => {
    if (
        typeof transactionRef !== "string" ||
        !transactionRef.trim() ||
        transactionRef.trim().length > 255
    ) {
        throw new Error("TRANSACTION_REF_REQUIRED");
    }

    return transactionRef.trim();
};

const attachPaymentGatewayRequest = async (result) => {
    const gatewayRequest = await createPaymentRequest({
        paymentId: result.payment.paymentId,
        orderId: result.payment.rentalOrderId,
        purpose: result.payment.purpose,
        amount: result.payment.amount,
    });

    return { ...result, ...gatewayRequest };
};

const attachRefundGatewayRequest = async (result) => {
    const gatewayRequest = await createRefundRequest({
        refundId: result.refund.refundId,
        orderId: result.refund.rentalOrderId,
        paymentId: result.refund.paymentId,
        type: result.refund.type,
        amount: result.refund.amount,
        reason: result.refund.reason,
    });

    return { ...result, ...gatewayRequest };
};

const hasValidTemporaryHolds = (order, now) =>
    order.items.length > 0 &&
    order.items.every((item) =>
        item.reservations.some((reservation) =>
            reservation.status ===
                ReservationStatus.TEMPORARY_HOLD &&
            reservation.holdExpiresAt &&
            reservation.holdExpiresAt > now
        )
    );

const createPaymentAttempt = async ({
    orderId,
    customerId = null,
    purpose,
}) => {
    validateUuidValue(orderId);

    const result = await withTransactionRetry(
        async (tx) => {
            const order = await findOrderForPayment(
                orderId,
                customerId,
                tx
            );

            if (!order) {
                throw new Error("ORDER_NOT_FOUND");
            }

            const succeeded =
                await findPaymentByPurposeAndStatus(
                    orderId,
                    purpose,
                    PaymentStatus.SUCCEEDED,
                    tx
                );

            if (succeeded) {
                return {
                    payment: succeeded,
                    alreadyCreated: true,
                };
            }

            const pending =
                await findPaymentByPurposeAndStatus(
                    orderId,
                    purpose,
                    PaymentStatus.PENDING,
                    tx
                );

            if (pending) {
                return {
                    payment: pending,
                    alreadyCreated: true,
                };
            }

            if (
                purpose === PaymentPurpose.RENTAL &&
                order.status !==
                    RentalOrderStatus.PENDING_PAYMENT
            ) {
                throw new Error("ORDER_NOT_PAYABLE");
            }

            if (
                purpose === PaymentPurpose.DEPOSIT &&
                order.status !==
                    RentalOrderStatus.READY_FOR_PICKUP
            ) {
                throw new Error("ORDER_NOT_READY_FOR_DEPOSIT");
            }

            const amount = Number(
                purpose === PaymentPurpose.RENTAL
                    ? order.upfrontAmount
                    : order.depositAmount
            );

            if (!Number.isFinite(amount) || amount <= 0) {
                throw new Error("PAYMENT_NOT_REQUIRED");
            }

            if (purpose === PaymentPurpose.RENTAL) {
                if (!hasValidTemporaryHolds(order, new Date())) {
                    throw new Error("HOLD_EXPIRED");
                }
            } else if (
                Number(order.collectedDepositAmount) >= amount
            ) {
                throw new Error("DEPOSIT_ALREADY_COLLECTED");
            }

            const payment = await createPayment(
                {
                    rentalOrderId: orderId,
                    purpose,
                    amount,
                    status: PaymentStatus.PENDING,
                },
                tx
            );

            return {
                payment,
                alreadyCreated: false,
            };
        }
    );

    if (result.payment.status !== PaymentStatus.PENDING) {
        return result;
    }

    return attachPaymentGatewayRequest(result);
};

const createRentalPayment = async (
    orderId,
    customerId
) => createPaymentAttempt({
    orderId,
    customerId,
    purpose: PaymentPurpose.RENTAL,
});

const createDepositPayment = async (orderId) =>
    createPaymentAttempt({
        orderId,
        purpose: PaymentPurpose.DEPOSIT,
    });

const createRentalRefundInsideTransaction = async ({
    order,
    payment,
    amount,
    reason,
    db,
}) => {
    const existing = await findLatestRefundByOrderAndType(
        order.orderId,
        RefundType.RENTAL_REFUND,
        db
    );

    if (existing) {
        return {
            refund: existing,
            alreadyCreated: true,
        };
    }

    const refund = await createRefund(
        {
            rentalOrderId: order.orderId,
            paymentId: payment?.paymentId ?? null,
            type: RefundType.RENTAL_REFUND,
            amount,
            reason,
            status: RefundStatus.PENDING,
        },
        db
    );

    return { refund, alreadyCreated: false };
};

const processPaymentSucceeded = async (
    paymentId,
    transactionRef
) => {
    validateUuidValue(paymentId);
    const normalizedRef = normalizeTransactionRef(
        transactionRef
    );

    const result = await withTransactionRetry(
        async (tx) => {
            const payment = await findPaymentById(
                paymentId,
                tx
            );

            if (!payment) {
                throw new Error("PAYMENT_NOT_FOUND");
            }

            if (
                payment.status === PaymentStatus.SUCCEEDED &&
                payment.transactionRef === normalizedRef
            ) {
                return {
                    payment,
                    alreadyProcessed: true,
                    rentalRefund: null,
                };
            }

            if (payment.status !== PaymentStatus.PENDING) {
                throw new Error("PAYMENT_ALREADY_PROCESSED");
            }

            const conflicting =
                await findPaymentByTransactionRef(
                    normalizedRef,
                    tx
                );

            if (
                conflicting &&
                conflicting.paymentId !== paymentId
            ) {
                throw new Error("TRANSACTION_REF_CONFLICT");
            }

            const now = new Date();
            const succeededPayment =
                await markPaymentSucceeded(
                    paymentId,
                    normalizedRef,
                    now,
                    tx
                );
            const order = payment.rentalOrder;

            if (payment.purpose === PaymentPurpose.DEPOSIT) {
                if (
                    order.status !==
                    RentalOrderStatus.READY_FOR_PICKUP
                ) {
                    throw new Error(
                        "ORDER_NOT_READY_FOR_DEPOSIT"
                    );
                }

                await recordGatewayDeposit(
                    order.orderId,
                    payment.amount,
                    now,
                    tx
                );

                return {
                    payment: succeededPayment,
                    alreadyProcessed: false,
                    rentalRefund: null,
                };
            }

            if (payment.purpose !== PaymentPurpose.RENTAL) {
                throw new Error("INVALID_PAYMENT_PURPOSE");
            }

            await addRentalPaymentToOrderTotals(
                order.orderId,
                payment.amount,
                tx
            );

            const validHolds = hasValidTemporaryHolds(
                order,
                now
            );

            if (
                validHolds &&
                order.status ===
                    RentalOrderStatus.PENDING_PAYMENT
            ) {
                await confirmRentalOrder(order.orderId, tx);
                await confirmReservations(
                    order.items.map((item) => item.orderItemId),
                    tx
                );
                await createOrderStatusHistory(
                    {
                        rentalOrderId: order.orderId,
                        oldStatus:
                            RentalOrderStatus.PENDING_PAYMENT,
                        newStatus:
                            RentalOrderStatus.CONFIRMED,
                        changedBy: null,
                        changedAt: now,
                        reason: "Thanh toán tiền thuê thành công",
                    },
                    tx
                );

                return {
                    payment: succeededPayment,
                    alreadyProcessed: false,
                    rentalRefund: null,
                };
            }

            if (
                order.status ===
                RentalOrderStatus.PENDING_PAYMENT
            ) {
                await tx.rentalOrder.update({
                    where: { orderId: order.orderId },
                    data: {
                        status: RentalOrderStatus.EXPIRED,
                    },
                });
                await tx.reservation.updateMany({
                    where: {
                        rentalOrderItem: {
                            orderId: order.orderId,
                        },
                        status:
                            ReservationStatus.TEMPORARY_HOLD,
                    },
                    data: {
                        status: ReservationStatus.EXPIRED,
                    },
                });
                await createOrderStatusHistory(
                    {
                        rentalOrderId: order.orderId,
                        oldStatus:
                            RentalOrderStatus.PENDING_PAYMENT,
                        newStatus: RentalOrderStatus.EXPIRED,
                        changedBy: null,
                        changedAt: now,
                        reason:
                            "Thanh toán đến sau khi thời gian giữ chỗ hết hạn",
                    },
                    tx
                );
            }

            const rentalRefund =
                await createRentalRefundInsideTransaction({
                    order,
                    payment: succeededPayment,
                    amount: payment.amount,
                    reason:
                        "Hoàn tiền thuê do thanh toán sau khi giữ chỗ hết hạn",
                    db: tx,
                });

            return {
                payment: succeededPayment,
                alreadyProcessed: false,
                rentalRefund,
            };
        }
    );

    if (
        result.rentalRefund?.refund?.status ===
        RefundStatus.PENDING
    ) {
        return {
            ...result,
            rentalRefund: await attachRefundGatewayRequest(
                result.rentalRefund
            ),
        };
    }

    return result;
};

const processPaymentFailed = async (
    paymentId,
    transactionRef
) => {
    validateUuidValue(paymentId);
    const normalizedRef = normalizeTransactionRef(
        transactionRef
    );

    const result = await withTransactionRetry(async (tx) => {
        const payment = await findPaymentById(paymentId, tx);

        if (!payment) {
            throw new Error("PAYMENT_NOT_FOUND");
        }

        if (
            payment.status === PaymentStatus.FAILED &&
            payment.transactionRef === normalizedRef
        ) {
            return { payment, alreadyProcessed: true };
        }

        if (payment.status !== PaymentStatus.PENDING) {
            throw new Error("PAYMENT_ALREADY_PROCESSED");
        }

        const conflicting =
            await findPaymentByTransactionRef(
                normalizedRef,
                tx
            );

        if (
            conflicting &&
            conflicting.paymentId !== paymentId
        ) {
            throw new Error("TRANSACTION_REF_CONFLICT");
        }

        return {
            payment: await markPaymentFailed(
                paymentId,
                normalizedRef,
                tx
            ),
            alreadyProcessed: false,
        };
    });

    return result;
};

const createOrderRefund = async ({
    orderId,
    type,
    amount,
    reason,
    paymentId = null,
    allowedStatuses,
}) => {
    validateUuidValue(orderId);

    const result = await withTransactionRetry(
        async (tx) => {
            const order = await findOrderForRefund(
                orderId,
                tx
            );

            if (!order) {
                throw new Error("ORDER_NOT_FOUND");
            }

            if (!allowedStatuses.includes(order.status)) {
                throw new Error("ORDER_NOT_REFUNDABLE");
            }

            const refundAmount = Number(amount(order));

            if (
                !Number.isFinite(refundAmount) ||
                refundAmount <= 0
            ) {
                throw new Error("NO_REFUND_REQUIRED");
            }

            const existing =
                await findLatestRefundByOrderAndType(
                    orderId,
                    type,
                    tx
                );

            if (existing) {
                return {
                    refund: existing,
                    alreadyCreated: true,
                };
            }

            let relatedPaymentId = paymentId;

            if (!relatedPaymentId && type === RefundType.RENTAL_REFUND) {
                const rentalPayment =
                    await findSuccessfulRentalPayment(
                        orderId,
                        tx
                    );
                relatedPaymentId =
                    rentalPayment?.paymentId ?? null;
            }

            const refund = await createRefund(
                {
                    rentalOrderId: orderId,
                    paymentId: relatedPaymentId,
                    type,
                    amount: refundAmount,
                    reason,
                    status: RefundStatus.PENDING,
                },
                tx
            );

            return {
                refund,
                alreadyCreated: false,
            };
        }
    );

    if (result.refund.status !== RefundStatus.PENDING) {
        return result;
    }

    return attachRefundGatewayRequest(result);
};

const createDepositRefund = async (orderId) =>
    createOrderRefund({
        orderId,
        type: RefundType.DEPOSIT_RETURN,
        amount: (order) => order.depositRefundAmount,
        reason: "Hoàn tiền cọc sau quyết toán",
        allowedStatuses: [
            RentalOrderStatus.SETTLEMENT_PENDING,
            RentalOrderStatus.COMPLETED,
        ],
    });

const createRentalRefund = async (orderId) =>
    createOrderRefund({
        orderId,
        type: RefundType.RENTAL_REFUND,
        amount: (order) => order.rentalAmount,
        reason: "Hoàn tiền thuê",
        allowedStatuses: [
            RentalOrderStatus.EXPIRED,
            RentalOrderStatus.FULFILLMENT_FAILED,
        ],
    });

const processRefundSucceeded = async (
    refundId,
    transactionRef
) => {
    validateUuidValue(refundId);
    const normalizedRef = normalizeTransactionRef(
        transactionRef
    );

    const result = await withTransactionRetry(async (tx) => {
        const refund = await findRefundForCallback(
            refundId,
            tx
        );

        if (!refund) {
            throw new Error("REFUND_NOT_FOUND");
        }

        if (
            refund.status === RefundStatus.SUCCEEDED &&
            refund.transactionRef === normalizedRef
        ) {
            return { refund, alreadyProcessed: true };
        }

        if (refund.status !== RefundStatus.PENDING) {
            throw new Error("REFUND_ALREADY_PROCESSED");
        }

        const conflicting =
            await findRefundByTransactionRef(
                normalizedRef,
                tx
            );

        if (
            conflicting &&
            conflicting.refundId !== refundId
        ) {
            throw new Error("TRANSACTION_REF_CONFLICT");
        }

        const completedAt = new Date();
        const succeededRefund =
            await markRefundSucceeded(
                refundId,
                normalizedRef,
                completedAt,
                tx
            );
        await addRefundToOrderTotals(
            refund.rentalOrderId,
            refund.amount,
            tx
        );

        return {
            refund: succeededRefund,
            alreadyProcessed: false,
        };
    });

    if (
        result.refund.type === RefundType.DEPOSIT_RETURN
    ) {
        result.completion =
            await completeRentalOrderIfReady(
                result.refund.rentalOrderId
            );
    }

    return result;
};

const processRefundFailed = async (
    refundId,
    transactionRef
) => {
    validateUuidValue(refundId);
    const normalizedRef = normalizeTransactionRef(
        transactionRef
    );

    return withTransactionRetry(async (tx) => {
        const refund = await findRefundById(refundId, tx);

        if (!refund) {
            throw new Error("REFUND_NOT_FOUND");
        }

        if (
            refund.status === RefundStatus.FAILED &&
            refund.transactionRef === normalizedRef
        ) {
            return { refund, alreadyProcessed: true };
        }

        if (refund.status !== RefundStatus.PENDING) {
            throw new Error("REFUND_ALREADY_PROCESSED");
        }

        const conflicting =
            await findRefundByTransactionRef(
                normalizedRef,
                tx
            );

        if (
            conflicting &&
            conflicting.refundId !== refundId
        ) {
            throw new Error("TRANSACTION_REF_CONFLICT");
        }

        return {
            refund: await markRefundFailed(
                refundId,
                normalizedRef,
                new Date(),
                tx
            ),
            alreadyProcessed: false,
        };
    });
};

const retryFailedRefund = async (refundId) => {
    validateUuidValue(refundId);

    const result = await withTransactionRetry(
        async (tx) => {
            const refund = await findRefundById(
                refundId,
                tx
            );

            if (!refund) {
                throw new Error("REFUND_NOT_FOUND");
            }

            if (refund.status !== RefundStatus.FAILED) {
                throw new Error("REFUND_NOT_FAILED");
            }

            return {
                refund: await resetRefundPending(
                    refundId,
                    tx
                ),
                alreadyCreated: true,
            };
        }
    );

    return attachRefundGatewayRequest(result);
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
                    refund.status === RefundStatus.SUCCEEDED
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
        } else if (refunds.length > 0) {
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

const getRefunds = async () => findRefunds();

export {
    createDepositPayment,
    createDepositRefund,
    createRentalPayment,
    createRentalRefund,
    getExpiredHoldReconciliations,
    getRefunds,
    processPaymentFailed,
    processPaymentSucceeded,
    processRefundFailed,
    processRefundSucceeded,
    retryFailedRefund,
};
