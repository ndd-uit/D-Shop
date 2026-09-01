import {
    createDepositPayment,
    createDepositRefund,
    createRentalPayment,
    createRentalRefund,
    getExpiredHoldReconciliations,
    getRefunds,
    processPaymentFailed,
    processPaymentSucceeded,
    processSePayPaymentIpn,
    processRefundFailed,
    processRefundSucceeded,
    retryFailedRefund,
} from "./payment.service.js";

const errorStatus = new Map([
    ["INVALID_UUID", 400],
    ["TRANSACTION_REF_REQUIRED", 400],
    ["ORDER_NOT_FOUND", 404],
    ["PAYMENT_NOT_FOUND", 404],
    ["REFUND_NOT_FOUND", 404],
    ["ORDER_NOT_PAYABLE", 409],
    ["ORDER_NOT_READY_FOR_DEPOSIT", 409],
    ["ORDER_NOT_REFUNDABLE", 409],
    ["HOLD_EXPIRED", 409],
    ["PAYMENT_NOT_REQUIRED", 409],
    ["DEPOSIT_ALREADY_COLLECTED", 409],
    ["NO_REFUND_REQUIRED", 409],
    ["PAYMENT_ALREADY_PROCESSED", 409],
    ["REFUND_ALREADY_PROCESSED", 409],
    ["REFUND_NOT_FAILED", 409],
    ["TRANSACTION_REF_CONFLICT", 409],
    ["TRANSACTION_CONFLICT", 409],
    ["GATEWAY_REQUEST_FAILED", 502],
    ["SEPAY_WEBHOOK_UNAUTHORIZED", 401],
    ["SEPAY_WEBHOOK_INVALID", 400],
    ["SEPAY_REFERENCE_INVALID", 400],
    ["SEPAY_CURRENCY_MISMATCH", 422],
    ["SEPAY_AMOUNT_MISMATCH", 422],
    ["SEPAY_PURPOSE_MISMATCH", 422],
    ["SEPAY_INVALID_AMOUNT", 422],
    ["PAYMENT_CALLBACK_DISABLED", 409],
]);

const errorMessages = new Map([
    ["INVALID_UUID", "Mã định danh không hợp lệ"],
    ["TRANSACTION_REF_REQUIRED", "Cần cung cấp mã giao dịch"],
    ["ORDER_NOT_FOUND", "Không tìm thấy đơn thuê"],
    ["PAYMENT_NOT_FOUND", "Không tìm thấy thanh toán"],
    ["REFUND_NOT_FOUND", "Không tìm thấy yêu cầu hoàn tiền"],
    ["ORDER_NOT_PAYABLE", "Đơn thuê không thể thanh toán"],
    ["ORDER_NOT_READY_FOR_DEPOSIT", "Đơn chưa sẵn sàng thu tiền cọc"],
    ["ORDER_NOT_REFUNDABLE", "Đơn thuê không thuộc luồng hoàn tiền này"],
    ["HOLD_EXPIRED", "Thời gian giữ chỗ đã hết hạn"],
    ["PAYMENT_NOT_REQUIRED", "Không có khoản cần thanh toán"],
    ["DEPOSIT_ALREADY_COLLECTED", "Tiền cọc đã được thu đủ"],
    ["NO_REFUND_REQUIRED", "Không có khoản cần hoàn"],
    ["PAYMENT_ALREADY_PROCESSED", "Thanh toán đã được xử lý"],
    ["REFUND_ALREADY_PROCESSED", "Hoàn tiền đã được xử lý"],
    ["REFUND_NOT_FAILED", "Chỉ có thể thử lại hoàn tiền thất bại"],
    ["TRANSACTION_REF_CONFLICT", "Mã giao dịch đã được sử dụng"],
    ["TRANSACTION_CONFLICT", "Xung đột giao dịch, vui lòng thử lại"],
    ["GATEWAY_REQUEST_FAILED", "Không thể kết nối cổng thanh toán"],
    ["SEPAY_WEBHOOK_UNAUTHORIZED", "Webhook SePay không được xác thực"],
    ["SEPAY_WEBHOOK_INVALID", "Dữ liệu webhook SePay không hợp lệ"],
    ["SEPAY_REFERENCE_INVALID", "Mã tham chiếu SePay không hợp lệ"],
    ["SEPAY_CURRENCY_MISMATCH", "Loại tiền webhook không khớp"],
    ["SEPAY_AMOUNT_MISMATCH", "Số tiền webhook không khớp"],
    ["SEPAY_PURPOSE_MISMATCH", "Mục đích thanh toán không khớp"],
    ["SEPAY_INVALID_AMOUNT", "Số tiền SePay không hợp lệ"],
    ["PAYMENT_CALLBACK_DISABLED", "Thanh toán SePay chỉ được xử lý qua IPN đã xác thực"],
]);

const assertManualPaymentCallbackAllowed = () => {
    if (
        (process.env.PAYMENT_GATEWAY || "MOCK")
            .trim()
            .toUpperCase() === "SEPAY"
    ) {
        throw new Error("PAYMENT_CALLBACK_DISABLED");
    }
};

const respondError = (error, res) => {
    const status = errorStatus.get(error.message) ?? 500;

    if (status === 500) {
        console.error(error);
    }

    return res.status(status).json({
        success: false,
        message:
            errorMessages.get(error.message) ??
            "Không thể xử lý yêu cầu thanh toán",
    });
};

const createRentalPaymentController = async (req, res) => {
    try {
        const data = await createRentalPayment(
            req.body?.orderId,
            req.user.userId
        );
        return res.status(201).json({ success: true, data });
    } catch (error) {
        return respondError(error, res);
    }
};

const createDepositPaymentController = async (req, res) => {
    try {
        const data = await createDepositPayment(
            req.params.orderId
        );
        return res.status(201).json({ success: true, data });
    } catch (error) {
        return respondError(error, res);
    }
};

const paymentSucceededController = async (req, res) => {
    try {
        assertManualPaymentCallbackAllowed();
        const data = await processPaymentSucceeded(
            req.body?.paymentId,
            req.body?.transactionRef
        );
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return respondError(error, res);
    }
};

const paymentFailedController = async (req, res) => {
    try {
        assertManualPaymentCallbackAllowed();
        const data = await processPaymentFailed(
            req.body?.paymentId,
            req.body?.transactionRef
        );
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return respondError(error, res);
    }
};

const sePayPaymentIpnController = async (req, res) => {
    try {
        const data = await processSePayPaymentIpn(
            req.body,
            req.get("X-Secret-Key")
        );

        return res.status(200).json({ success: true, data });
    } catch (error) {
        return respondError(error, res);
    }
};

const createDepositRefundController = async (req, res) => {
    try {
        const data = await createDepositRefund(
            req.params.orderId
        );
        return res.status(201).json({ success: true, data });
    } catch (error) {
        return respondError(error, res);
    }
};

const createRentalRefundController = async (req, res) => {
    try {
        const data = await createRentalRefund(
            req.params.orderId
        );
        return res.status(201).json({ success: true, data });
    } catch (error) {
        return respondError(error, res);
    }
};

const refundSucceededController = async (req, res) => {
    try {
        const data = await processRefundSucceeded(
            req.body?.refundId,
            req.body?.transactionRef
        );
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return respondError(error, res);
    }
};

const refundFailedController = async (req, res) => {
    try {
        const data = await processRefundFailed(
            req.body?.refundId,
            req.body?.transactionRef
        );
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return respondError(error, res);
    }
};

const retryFailedRefundController = async (req, res) => {
    try {
        const data = await retryFailedRefund(
            req.params.refundId
        );
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return respondError(error, res);
    }
};

const getRefundsController = async (_req, res) => {
    try {
        const data = await getRefunds();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return respondError(error, res);
    }
};

const getExpiredHoldReconciliationsController = async (
    _req,
    res
) => {
    try {
        const data = await getExpiredHoldReconciliations();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return respondError(error, res);
    }
};

export {
    createDepositPaymentController,
    createDepositRefundController,
    createRentalPaymentController,
    createRentalRefundController,
    getExpiredHoldReconciliationsController,
    getRefundsController,
    paymentFailedController,
    paymentSucceededController,
    refundFailedController,
    refundSucceededController,
    retryFailedRefundController,
    sePayPaymentIpnController,
};
