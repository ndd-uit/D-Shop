import {
    createPaymentRequest as createMockPaymentRequest,
    createRefundRequest as createMockRefundRequest,
} from "./mockPaymentGateway.js";

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

const createPaymentRequest = async (data) =>
    runGatewayRequest(() =>
        createMockPaymentRequest(data)
    );

const createRefundRequest = async (data) =>
    runGatewayRequest(() =>
        createMockRefundRequest(data)
    );

export {
    createPaymentRequest,
    createRefundRequest,
};
