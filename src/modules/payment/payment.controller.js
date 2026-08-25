import { createDepositRefund, createUpfrontPayment, processDepositRefundSuccess, processUpfrontPaymentSuccess, createAdditionalPayment, createCancellationRefund, processCancellationRefundSuccess, processAdditionalPaymentSuccess, processPaymentFailed, processRefundFailed, createStoreCancellationRefund, getExpiredHoldReconciliations, createExpiredHoldRefund, processExpiredHoldRefundSuccess, getRefunds, retryFailedRefund } from "./payment.service.js";

const handlePaymentInputError = (error, res) => {
    if (error.message === "GATEWAY_REQUEST_FAILED") {
        return res.status(502).json({
            success: false,
            message:
                "Không thể gửi yêu cầu tới cổng thanh toán",
        });
    }

    if (error.message === "INVALID_UUID") {
        return res.status(400).json({
            success: false,
            message: "Mã định danh không hợp lệ",
        });
    }

    if (error.message === "TRANSACTION_REF_REQUIRED") {
        return res.status(400).json({
            success: false,
            message: "Cần cung cấp mã tham chiếu giao dịch",
        });
    }

    if (error.message === "INVALID_TRANSACTION_REF") {
        return res.status(400).json({
            success: false,
            message: "Mã tham chiếu giao dịch không hợp lệ",
        });
    }

    return null;
};

const createUpfrontPaymentController = async (req, res) => {
    try {
        const customerId = req.user.userId;
        const { orderId } = req.body ?? {};

        const payment = await createUpfrontPayment(orderId, customerId);

        return res.status(201).json({
            success: true,
            data: payment,
        });
    } catch (error) {
        const inputError = handlePaymentInputError(error, res);
        if (inputError) return inputError;

        if (error.message === "ORDER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy đơn thuê",
            });
        }

        if (error.message === "ORDER_NOT_PAYABLE") {
            return res.status(409).json({
                success: false,
                message: "Đơn thuê không thể thanh toán",
            });
        }

        if (error.message === "HOLD_EXPIRED") {
            return res.status(409).json({
                success: false,
                message: "Thời gian giữ chỗ đã hết hạn",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Không thể tạo thanh toán",
        });
    }
};

const mockPaymentSuccess = async (req, res) => {
    try {
        const {
            paymentId,
            transactionRef,
        } = req.body ?? {};

        const result = await processUpfrontPaymentSuccess(
            paymentId,
            transactionRef
        );

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        const inputError = handlePaymentInputError(error, res);
        if (inputError) return inputError;

        if (error.message === "PAYMENT_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy thanh toán",
            });
        }

        if (error.message === "PAYMENT_NOT_UPFRONT") {
            return res.status(400).json({
                success: false,
                message: "Mục đích thanh toán không hợp lệ",
            });
        }

        if (error.message === "PAYMENT_ALREADY_PROCESSED") {
            return res.status(409).json({
                success: false,
                message: "Thanh toán đã được xử lý trước đó",
            });
        }

        if (error.message === "INVALID_PAYMENT_STATUS") {
            return res.status(409).json({
                success: false,
                message: "Trạng thái thanh toán không hợp lệ",
            });
        }

        if (error.message === "TRANSACTION_REF_CONFLICT") {
            return res.status(409).json({
                success: false,
                message: "Mã tham chiếu giao dịch đã tồn tại",
            });
        }

        if (error.message === "PAYMENT_CONFLICT") {
            return res.status(409).json({
                success: false,
                message: "Xung đột khi xử lý thanh toán",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Không thể xử lý thanh toán",
        });
    }
};

// Controller để tạo một bản ghi hoàn tiền đặt cọc mới
const createDepositRefundController = async (
    req,
    res
) => {
    try {
        const { orderId } = req.params;

        const refund =
            await createDepositRefund(orderId);

        return res.status(201).json({
            success: true,
            data: refund,
        });
    } catch (error) {
        const inputError = handlePaymentInputError(error, res);
        if (inputError) return inputError;

        if (error.message === "ORDER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Rental order not found",
            });
        }

        if (
            error.message ===
            "NO_REFUND_REQUIRED"
        ) {
            return res.status(409).json({
                success: false,
                message: "No deposit refund required",
            });
        }

        if (
            error.message ===
            "UPFRONT_PAYMENT_NOT_FOUND"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Successful upfront payment not found",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to create deposit refund",
        });
    }
};

const mockDepositRefundSuccess = async (
    req,
    res
) => {
    try {
        const {
            refundId,
            transactionRef,
        } = req.body ?? {};

        const result =
            await processDepositRefundSuccess(
                refundId,
                transactionRef
            );

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        const inputError = handlePaymentInputError(error, res);
        if (inputError) return inputError;

        if (error.message === "REFUND_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Refund not found",
            });
        }

        if (error.message === "INVALID_REFUND_TYPE") {
            return res.status(409).json({
                success: false,
                message: "Invalid refund type",
            });
        }

        if (
            error.message ===
            "REFUND_ALREADY_PROCESSED"
        ) {
            return res.status(409).json({
                success: false,
                message: "Refund already processed",
            });
        }

        if (error.message === "INVALID_REFUND_STATUS") {
            return res.status(409).json({
                success: false,
                message: "Invalid refund status",
            });
        }

        if (
            error.message ===
            "TRANSACTION_REF_CONFLICT"
        ) {
            return res.status(409).json({
                success: false,
                message: "Transaction reference already used",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to process refund",
        });
    }
};

// Controller để tạo một bản ghi thanh toán bổ sung mới
const createAdditionalPaymentController = async (
    req,
    res
) => {
    try {
        const { orderId } = req.params;
        const customerId = req.user.userId;

        const payment =
            await createAdditionalPayment(
                orderId,
                customerId
            );

        return res.status(201).json({
            success: true,
            data: payment,
        });
    } catch (error) {
        const inputError = handlePaymentInputError(error, res);
        if (inputError) return inputError;

        if (error.message === "ORDER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Rental order not found",
            });
        }

        if (
            error.message ===
            "INVALID_ORDER_STATUS"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Order must be SETTLEMENT_PENDING",
            });
        }

        if (
            error.message ===
            "NO_ADDITIONAL_PAYMENT_REQUIRED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "No additional payment required",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to create additional payment",
        });
    }
};

// Controller để tạo một bản ghi hoàn tiền hủy đơn hàng mới
const createCancellationRefundController = async (
    req,
    res
) => {
    try {
        const { cancellationRequestId } = req.params;

        const result =
            await createCancellationRefund(
                cancellationRequestId
            );

        return res.status(201).json({
            success: true,
            data: result,
        });
    } catch (error) {
        const inputError = handlePaymentInputError(error, res);
        if (inputError) return inputError;

        if (
            error.message ===
            "CANCELLATION_REQUEST_NOT_FOUND"
        ) {
            return res.status(404).json({
                success: false,
                message: "Cancellation request not found",
            });
        }

        if (
            error.message ===
            "CANCELLATION_NOT_APPROVED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Cancellation request has not been approved",
            });
        }

        if (
            error.message ===
            "NO_CANCELLATION_REFUND_REQUIRED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "No cancellation refund required",
            });
        }

        if (
            error.message ===
            "UPFRONT_PAYMENT_NOT_FOUND"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Successful upfront payment not found",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to create cancellation refund",
        });
    }
};

// Controller để mô phỏng thành công hoàn tiền hủy đơn hàng
const mockCancellationRefundSuccess = async (
    req,
    res
) => {
    try {
        const {
            refundId,
            transactionRef,
        } = req.body ?? {};
        if (!refundId || !transactionRef) {
            return res.status(400).json({
                success: false,
                message: "Cần cung cấp refundId và transactionRef",
            });
        }
        const result =
            await processCancellationRefundSuccess(
                refundId,
                transactionRef
            );

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        const inputError = handlePaymentInputError(error, res);
        if (inputError) return inputError;

        if (error.message === "REFUND_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Refund not found",
            });
        }

        if (error.message === "INVALID_REFUND_TYPE") {
            return res.status(409).json({
                success: false,
                message: "Invalid refund type",
            });
        }

        if (
            error.message ===
            "REFUND_ALREADY_PROCESSED"
        ) {
            return res.status(409).json({
                success: false,
                message: "Refund already processed",
            });
        }

        if (error.message === "INVALID_REFUND_STATUS") {
            return res.status(409).json({
                success: false,
                message: "Invalid refund status",
            });
        }

        if (
            error.message ===
            "TRANSACTION_REF_CONFLICT"
        ) {
            return res.status(409).json({
                success: false,
                message: "Transaction reference already used",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to process cancellation refund",
        });
    }
};

// Controller để mô phỏng thành công thanh toán bổ sung
const mockAdditionalPaymentSuccess = async (
    req,
    res
) => {
    try {
        const {
            paymentId,
            transactionRef,
        } = req.body ?? {};

        const result =
            await processAdditionalPaymentSuccess(
                paymentId,
                transactionRef
            );

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        const inputError = handlePaymentInputError(error, res);
        if (inputError) return inputError;

        if (error.message === "PAYMENT_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Payment not found",
            });
        }

        if (
            error.message ===
            "INVALID_PAYMENT_PURPOSE"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Payment must be ADDITIONAL",
            });
        }

        if (
            error.message ===
            "PAYMENT_ALREADY_PROCESSED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Payment already processed",
            });
        }

        if (error.message === "INVALID_PAYMENT_STATUS") {
            return res.status(409).json({
                success: false,
                message: "Invalid payment status",
            });
        }

        if (
            error.message ===
            "TRANSACTION_REF_CONFLICT"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Transaction reference already used",
            });
        }

        if (
            error.message ===
            "INVALID_ORDER_STATUS"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Đơn thuê không ở trạng thái chờ quyết toán",
            });
        }

        if (
            error.message ===
            "INVALID_PAYMENT_AMOUNT"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Số tiền thanh toán bổ sung không hợp lệ",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to process additional payment",
        });
    }
};

// Controller để mô phỏng thất bại thanh toán
const mockPaymentFailed = async (req, res) => {
    try {
        const {
            paymentId,
            transactionRef,
        } = req.body ?? {};

        const result =
            await processPaymentFailed(
                paymentId,
                transactionRef
            );

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        const inputError = handlePaymentInputError(error, res);
        if (inputError) return inputError;

        if (
            error.message ===
            "TRANSACTION_REF_REQUIRED"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Transaction reference is required",
            });
        }

        if (error.message === "PAYMENT_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Payment not found",
            });
        }

        if (
            error.message ===
            "PAYMENT_ALREADY_PROCESSED"
        ) {
            return res.status(409).json({
                success: false,
                message: "Payment already processed",
            });
        }

        if (
            error.message ===
            "TRANSACTION_REF_CONFLICT"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Transaction reference already used",
            });
        }

        if (
            error.message ===
            "INVALID_PAYMENT_STATUS"
        ) {
            return res.status(409).json({
                success: false,
                message: "Invalid payment status",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to process failed payment",
        });
    }
};

const mockRefundFailed = async (req, res) => {
    try {
        const {
            refundId,
            transactionRef,
        } = req.body ?? {};

        const result =
            await processRefundFailed(
                refundId,
                transactionRef
            );

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        const inputError = handlePaymentInputError(error, res);
        if (inputError) return inputError;

        if (
            error.message ===
            "TRANSACTION_REF_REQUIRED"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Transaction reference is required",
            });
        }

        if (error.message === "REFUND_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Refund not found",
            });
        }

        if (
            error.message ===
            "REFUND_ALREADY_PROCESSED"
        ) {
            return res.status(409).json({
                success: false,
                message: "Refund already processed",
            });
        }

        if (
            error.message ===
            "TRANSACTION_REF_CONFLICT"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Transaction reference already used",
            });
        }

        if (
            error.message ===
            "INVALID_REFUND_STATUS"
        ) {
            return res.status(409).json({
                success: false,
                message: "Invalid refund status",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to process failed refund",
        });
    }
};

const createStoreCancellationRefundController = async (
    req,
    res
) => {
    try {
        const { orderId } = req.params;

        const result =
            await createStoreCancellationRefund(
                orderId
            );

        return res.status(201).json({
            success: true,
            data: result,
        });
    } catch (error) {
        const inputError = handlePaymentInputError(error, res);
        if (inputError) return inputError;

        if (error.message === "ORDER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Rental order not found",
            });
        }

        if (
            error.message ===
            "ORDER_NOT_CANCELLED"
        ) {
            return res.status(409).json({
                success: false,
                message: "Order must be CANCELLED",
            });
        }

        if (
            error.message ===
            "NO_CANCELLATION_REFUND_REQUIRED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "No cancellation refund required",
            });
        }

        if (
            error.message ===
            "UPFRONT_PAYMENT_NOT_FOUND"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Successful upfront payment not found",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to create store cancellation refund",
        });
    }
};

const getExpiredHoldReconciliationsController = async (
    req,
    res
) => {
    try {
        const data =
            await getExpiredHoldReconciliations();

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể lấy danh sách giao dịch cần đối soát",
        });
    }
};

const createExpiredHoldRefundController = async (
    req,
    res
) => {
    try {
        const { paymentId } = req.params;

        const result =
            await createExpiredHoldRefund(paymentId);

        return res.status(201).json({
            success: true,
            data: result,
        });
    } catch (error) {
        const inputError = handlePaymentInputError(error, res);
        if (inputError) return inputError;

        if (error.message === "PAYMENT_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giao dịch thanh toán",
            });
        }

        if (
            error.message ===
            "INVALID_RECONCILIATION_PAYMENT"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Giao dịch thanh toán không hợp lệ để đối soát",
            });
        }

        if (error.message === "ORDER_NOT_EXPIRED") {
            return res.status(409).json({
                success: false,
                message: "Đơn thuê chưa hết hạn",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Không thể tạo hoàn tiền đối soát",
        });
    }
};

const mockExpiredHoldRefundSuccessController = async (
    req,
    res
) => {
    try {
        const { refundId, transactionRef } = req.body ?? {};

        const result =
            await processExpiredHoldRefundSuccess(
                refundId,
                transactionRef
            );

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        const inputError = handlePaymentInputError(error, res);
        if (inputError) return inputError;

        if (
            error.message === "TRANSACTION_REF_REQUIRED"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Cần cung cấp mã tham chiếu giao dịch",
            });
        }

        if (error.message === "REFUND_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giao dịch hoàn tiền",
            });
        }

        if (error.message === "INVALID_REFUND_TYPE") {
            return res.status(409).json({
                success: false,
                message:
                    "Loại giao dịch hoàn tiền không hợp lệ",
            });
        }

        if (
            error.message ===
            "INVALID_EXPIRED_HOLD_REFUND"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Giao dịch không hợp lệ để hoàn tiền do hết hạn giữ chỗ",
            });
        }

        if (
            error.message === "REFUND_ALREADY_PROCESSED"
        ) {
            return res.status(409).json({
                success: false,
                message: "Giao dịch hoàn tiền đã được xử lý",
            });
        }

        if (
            error.message ===
            "TRANSACTION_REF_ALREADY_USED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Mã tham chiếu giao dịch đã được sử dụng",
            });
        }

        if (error.message === "INVALID_REFUND_STATUS") {
            return res.status(409).json({
                success: false,
                message: "Trạng thái hoàn tiền không hợp lệ",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể hoàn tất giao dịch hoàn tiền đối soát",
        });
    }
};

const getRefundsController = async (req, res) => {
    try {
        const data = await getRefunds();

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể lấy danh sách giao dịch hoàn tiền",
        });
    }
};

const retryFailedRefundController = async (
    req,
    res
) => {
    try {
        const { refundId } = req.params;
        const result = await retryFailedRefund(refundId);

        return res.status(201).json({
            success: true,
            data: result,
        });
    } catch (error) {
        const inputError = handlePaymentInputError(error, res);
        if (inputError) return inputError;

        if (error.message === "REFUND_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giao dịch hoàn tiền",
            });
        }

        if (error.message === "REFUND_NOT_FAILED") {
            return res.status(409).json({
                success: false,
                message:
                    "Chỉ giao dịch hoàn tiền thất bại mới được thử lại",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể tạo lại giao dịch hoàn tiền",
        });
    }
};

export { createUpfrontPaymentController, mockPaymentSuccess, createDepositRefundController, mockDepositRefundSuccess, createAdditionalPaymentController, createCancellationRefundController, mockCancellationRefundSuccess, mockAdditionalPaymentSuccess, mockPaymentFailed, mockRefundFailed, createStoreCancellationRefundController, getExpiredHoldReconciliationsController, createExpiredHoldRefundController, mockExpiredHoldRefundSuccessController, getRefundsController, retryFailedRefundController };
