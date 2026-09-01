import {
    createPaymentRequest as createMockPaymentRequest,
    createRefundRequest as createMockRefundRequest,
} from "./mockPaymentGateway.js";
import {
    createPaymentRequest as createSePayPaymentRequest,
    createRefundRequest as createSePayRefundRequest,
} from "./sepayPaymentGateway.js";

const adapters = {
    MOCK: {
        createPaymentRequest: createMockPaymentRequest,
        createRefundRequest: createMockRefundRequest,
    },
    SEPAY: {
        createPaymentRequest: createSePayPaymentRequest,
        createRefundRequest: createSePayRefundRequest,
    },
};

const getAdapter = () => {
    const provider = (
        process.env.PAYMENT_GATEWAY || "MOCK"
    ).trim().toUpperCase();
    const adapter = adapters[provider];

    if (!adapter) {
        throw new Error("PAYMENT_GATEWAY_NOT_SUPPORTED");
    }

    return adapter;
};

const runGatewayRequest = async (request) => {
    try {
        return await request();
    } catch (error) {
        const gatewayError = new Error(
            "GATEWAY_REQUEST_FAILED"
        );
        gatewayError.cause = error;
        throw gatewayError;
    }
};

const createPaymentRequest = async (data) => {
    if (!["RENTAL", "DEPOSIT"].includes(data?.purpose)) {
        throw new Error("INVALID_PAYMENT_PURPOSE");
    }

    return runGatewayRequest(() =>
        getAdapter().createPaymentRequest(data)
    );
};

const createRefundRequest = async (data) => {
    if (!data?.paymentId) {
        return {
            gateway: null,
            refundMode: "DIRECT_RECONCILIATION",
            manualReconciliationRequired: true,
        };
    }

    return runGatewayRequest(() =>
        getAdapter().createRefundRequest(data)
    );
};

export {
    createPaymentRequest,
    createRefundRequest,
};
