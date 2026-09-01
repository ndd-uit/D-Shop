const createPaymentRequest = async ({
    paymentId,
    orderId,
    amount,
    purpose,
    description,
}) => {
    if (process.env.MOCK_PAYMENT_GATEWAY_FAILURE === "true") {
        throw new Error("MOCK_GATEWAY_UNAVAILABLE");
    }

    return {
        gateway: "MOCK",
        paymentUrl:
            `https://mock-payment.dshop.test/payments/${paymentId}`,
        gatewayReference: `MOCK-PAYMENT-${paymentId}`,
        request: {
            orderId,
            amount: String(amount),
            purpose,
            description,
        },
    };
};

const createRefundRequest = async ({
    refundId,
    paymentId,
    amount,
    type,
    reason,
}) => {
    if (process.env.MOCK_PAYMENT_GATEWAY_FAILURE === "true") {
        throw new Error("MOCK_GATEWAY_UNAVAILABLE");
    }

    return {
        gateway: "MOCK",
        gatewayReference: `MOCK-REFUND-${refundId}`,
        request: {
            paymentId,
            amount: String(amount),
            type,
            reason,
        },
    };
};

export {
    createPaymentRequest,
    createRefundRequest,
};
