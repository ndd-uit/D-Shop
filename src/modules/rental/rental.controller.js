import { cancelPendingPaymentOrder } from "./rental.repository.js";
import { createRental, getRentalOrders, getRentalOrderDetail, getRentalOrderHistory, startPreparingRentalOrder, prepareReservation, handoverRentalOrder, receiveRentalReturn, inspectRentalOrderItem, settleRentalOrder, changeRentalUnitStatus, decideFeeApproval, markOverdueRentalOrders, requestCancellation, rejectCancellationRequest, approveCancellationRequest, getPendingCancellationRequests, expirePendingPaymentOrders, replaceRentalUnit, cancelOrderByStore } from "./rental.service.js"

const handleGatewayRequestError = (error, res) => {
    if (error.message !== "GATEWAY_REQUEST_FAILED") {
        return null;
    }

    return res.status(502).json({
        success: false,
        message:
            "Không thể gửi yêu cầu tới cổng thanh toán",
    });
};

const createRentalOrder = async (req, res) => {
    try {
        const customerId = req.user.userId;
        const { pickupInfo, returnInfo } = req.body ?? {};
        const result = await createRental(customerId, pickupInfo, returnInfo);
        return res.status(201).json({

            success: true,
            data: result
        }
        );

    } catch (error) {
        if (error.message === "CART_EMPTY") {
            return res.status(400).json({
                success: false,
                message: "Giỏ hàng đang trống",
            });
        }
        if (error.message === "CART_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giỏ hàng",
            });
        }
        if (error.message === "RENTAL_PERIOD_REQUIRED") {
            return res.status(400).json({
                success: false,
                message: "Cần cung cấp thời gian thuê",
            });
        }
        if (error.message === "RENTAL_INFO_REQUIRED") {
            return res.status(400).json({
                success: false,
                message: "Cần cung cấp thông tin nhận và trả hàng",
            });
        }
        if (error.message === "AVAILABILITY_CONFLICT") {
            return res.status(409).json({
                success: false,
                message: "Không đủ sản phẩm cho thuê khả dụng cho một hoặc nhiều mặt hàng trong giỏ",
            });
        }
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ nội bộ",
        });
    }
}

const getRentalOrdersController = async (
    req,
    res
) => {
    try {
        const data = await getRentalOrders({
            userId: req.user.userId,
            role: req.user.role,
        });

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        if (error.message === "FORBIDDEN") {
            return res.status(403).json({
                success: false,
                message:
                    "Bạn không có quyền xem danh sách đơn thuê",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể tải danh sách đơn thuê",
        });
    }
};

const getRentalOrderDetailController = async (
    req,
    res
) => {
    try {
        const data = await getRentalOrderDetail({
            orderId: req.params.id,
            userId: req.user.userId,
            role: req.user.role,
        });

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        if (
            error.message ===
            "RENTAL_ORDER_NOT_FOUND"
        ) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy đơn thuê",
            });
        }

        if (
            error.message ===
            "RENTAL_ORDER_FORBIDDEN"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Bạn không có quyền xem đơn thuê này",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể tải chi tiết đơn thuê",
        });
    }
};

const getRentalOrderHistoryController = async (
    req,
    res
) => {
    try {
        const data = await getRentalOrderHistory({
            orderId: req.params.id,
            userId: req.user.userId,
            role: req.user.role,
        });

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        if (
            error.message ===
            "RENTAL_ORDER_NOT_FOUND"
        ) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy đơn thuê",
            });
        }

        if (
            error.message ===
            "RENTAL_ORDER_FORBIDDEN"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Bạn không có quyền xem lịch sử đơn thuê này",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể tải lịch sử đơn thuê",
        });
    }
};

// Controller to start preparing a rental order
const startPreparingOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const staffId = req.user.userId; // Assuming the staff ID is stored in req.user.userId
        const order = await startPreparingRentalOrder(id, staffId);

        return res.status(200).json({
            success: true,
            data: order
        });
    }
    catch (error) {
        if (error.message === "ORDER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy đơn thuê",
            });
        }

        if (error.message === "INVALID_ORDER_STATUS") {
            return res.status(409).json({
                success: false,
                message: "Đơn thuê phải ở trạng thái đã xác nhận trước khi chuẩn bị",
            });
        }

        if (error.message === "CANCELLATION_PENDING") {
            return res.status(409).json({
                success: false,
                message: "Đơn thuê có yêu cầu hủy đang chờ xử lý",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Không thể bắt đầu chuẩn bị đơn thuê",
        });
    }
};

// Controller to prepare a rental reservation
const prepareRentalReservation = async (req, res) => {
    try {
        const staffId = req.user.userId;

        const {
            orderId,
            reservationId,
        } = req.params;

        const {
            preparationCondition,
            preparationNotes,
            preparationImages,
        } = req.body ?? {};

        const result = await prepareReservation(
            orderId,
            reservationId,
            staffId,
            preparationCondition,
            preparationNotes,
            preparationImages
        );

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        if (error.message === "INVALID_PREPARATION_DATA") {
            return res.status(400).json({
                success: false,
                message: "Thông tin chuẩn bị không hợp lệ",
            });
        }

        if (error.message === "ORDER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy đơn thuê",
            });
        }

        if (error.message === "RESERVATION_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy đặt chỗ",
            });
        }

        if (error.message === "INVALID_ORDER_STATUS") {
            return res.status(409).json({
                success: false,
                message: "Đơn thuê phải ở trạng thái đang chuẩn bị",
            });
        }

        if (error.message === "INVALID_RESERVATION_STATUS") {
            return res.status(409).json({
                success: false,
                message: "Đặt chỗ phải ở trạng thái đã xác nhận",
            });
        }

        if (error.message === "CANCELLATION_PENDING") {
            return res.status(409).json({
                success: false,
                message: "Đơn thuê có yêu cầu hủy đang chờ xử lý",
            });
        }

        if (
            error.message ===
            "INVALID_RENTAL_UNIT_STATUS"
        ) {
            return res.status(409).json({
                success: false,
                message: "Đơn vị cho thuê phải ở trạng thái sẵn sàng",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Không thể chuẩn bị mặt hàng thuê",
        });
    }
};

// Controller to hand over a rental order
const handoverOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const staffId = req.user.userId;
        const { nationalId, items } = req.body ?? {};

        const order = await handoverRentalOrder(
            id,
            staffId,
            nationalId,
            items
        );

        return res.status(200).json({
            success: true,
            data: order,
        });
    } catch (error) {
        if (error.message === "ORDER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy đơn thuê",
            });
        }

        if (error.message === "INVALID_ORDER_STATUS") {
            return res.status(409).json({
                success: false,
                message: "Đơn thuê phải ở trạng thái sẵn sàng để nhận",
            });
        }

        if (error.message === "CANCELLATION_PENDING") {
            return res.status(409).json({
                success: false,
                message: "Đơn thuê có yêu cầu hủy đang chờ xử lý",
            });
        }

        if (error.message === "NATIONAL_ID_REQUIRED") {
            return res.status(400).json({
                success: false,
                message: "CCCD của khách hàng là bắt buộc",
            });
        }

        if (error.message === "NATIONAL_ID_MISMATCH") {
            return res.status(400).json({
                success: false,
                message: "CCCD của nhân viên nhập không khớp với CCCD của khách hàng",
            });
        }

        if (error.message === "ITEM_NOT_READY") {
            return res.status(409).json({
                success: false,
                message: "Mặt hàng thuê chưa sẵn sàng",
            });
        }

        if (error.message === "INVALID_HANDOVER_ITEMS") {
            return res.status(400).json({
                success: false,
                message:
                    "Danh sách mặt hàng bàn giao không hợp lệ",
            });
        }

        if (
            error.message ===
            "INVALID_HANDOVER_CONFIRMATION"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Phải xác nhận đầy đủ phụ kiện khi bàn giao",
            });
        }

        if (error.message === "HANDOVER_ITEM_MISMATCH") {
            return res.status(409).json({
                success: false,
                message:
                    "Danh sách mặt hàng không khớp đơn thuê",
            });
        }

        if (error.message === "HANDOVER_UNIT_MISMATCH") {
            return res.status(409).json({
                success: false,
                message:
                    "Đơn vị cho thuê không khớp với mặt hàng đã chuẩn bị",
            });
        }

        if (
            error.message ===
            "INVALID_RENTAL_UNIT_STATUS"
        ) {
            return res.status(409).json({
                success: false,
                message: "Đơn vị cho thuê phải ở trạng thái đang chuẩn bị trước khi bàn giao",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to hand over rental order",
        });
    }
};

// Controller to receive a rental return
const receiveReturn = async (req, res) => {
    try {
        const { id } = req.params;
        const staffId = req.user.userId;

        const order = await receiveRentalReturn(
            id,
            staffId
        );

        return res.status(200).json({
            success: true,
            data: order,
        });
    } catch (error) {
        if (error.message === "ORDER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy đơn thuê",
            });
        }

        if (error.message === "INVALID_ORDER_STATUS") {
            return res.status(409).json({
                success: false,
                message: "Đơn thuê phải ở trạng thái đang thuê hoặc quá hạn",
            });
        }

        if (
            error.message ===
            "ACTIVE_RESERVATION_NOT_FOUND"
        ) {
            return res.status(409).json({
                success: false,
                message: "Không tìm thấy đặt chỗ hoạt động",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Không thể nhận lại đơn thuê",
        });
    }
};

const inspectOrderItem = async (req, res) => {
    try {
        const { id, itemId } = req.params;
        const staffId = req.user.userId;

        const result = await inspectRentalOrderItem(
            id,
            itemId,
            staffId,
            req.body ?? {}
        );

        return res.status(201).json({
            success: true,
            data: result,
        });
    } catch (error) {
        if (error.message === "ORDER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy đơn thuê",
            });
        }

        if (error.message === "ORDER_ITEM_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy mục đơn thuê",
            });
        }

        if (error.message === "INVALID_ORDER_STATUS") {
            return res.status(409).json({
                success: false,
                message: "Đơn thuê phải ở trạng thái đang kiểm tra",
            });
        }

        if (error.message === "ITEM_ALREADY_INSPECTED") {
            return res.status(409).json({
                success: false,
                message: "Mục thuê đã được kiểm tra",
            });
        }

        if (error.message === "ACTIVE_RESERVATION_NOT_FOUND") {
            return res.status(409).json({
                success: false,
                message: "Không tìm thấy đặt chỗ hoạt động",
            });
        }

        if (error.message === "INVALID_RENTAL_UNIT_STATUS") {
            return res.status(409).json({
                success: false,
                message: "Đơn vị cho thuê phải ở trạng thái đang kiểm tra trả",
            });
        }

        if (error.message === "INVALID_PROPOSED_CHARGE") {
            return res.status(400).json({
                success: false,
                message: "Phí đề xuất phải là số không âm",
            });
        }

        if (error.message === "INVALID_ISSUE_TYPE") {
            return res.status(400).json({
                success: false,
                message: "Loại sự cố không hợp lệ",
            });
        }

        if (error.message === "ISSUE_TYPE_REQUIRED") {
            return res.status(400).json({
                success: false,
                message: "Phải cung cấp loại sự cố khi đề xuất phí",
            });
        }

        if (
            error.message ===
            "INSPECTION_DESCRIPTION_REQUIRED"
        ) {
            return res.status(400).json({
                success: false,
                message: "Phải cung cấp mô tả căn cứ khi đề xuất phí",
            });
        }

        if (
            error.message ===
            "INSPECTION_EVIDENCE_REQUIRED"
        ) {
            return res.status(400).json({
                success: false,
                message: "Phải cung cấp ảnh bằng chứng khi đề xuất phí",
            });
        }

        if (error.message === "INVALID_INSPECTION_DATA") {
            return res.status(400).json({
                success: false,
                message: "Thông tin kiểm tra không hợp lệ",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Không thể kiểm tra mục thuê",
        });
    }
};

// Controller to settle a rental order
const settleOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const staffId = req.user.userId;

        const result = await settleRentalOrder(
            id,
            staffId
        );

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        const gatewayError =
            handleGatewayRequestError(error, res);
        if (gatewayError) return gatewayError;

        if (error.message === "ORDER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy đơn thuê",
            });
        }

        if (error.message === "INVALID_ORDER_STATUS") {
            return res.status(409).json({
                success: false,
                message: "Đơn thuê phải ở trạng thái chờ quyết toán",
            });
        }

        if (
            error.message ===
            "FEE_APPROVAL_ALREADY_PENDING"
        ) {
            return res.status(409).json({
                success: false,
                message: "Đơn thuê đang có đề xuất phí khác chờ phê duyệt",
            });
        }

        if (
            error.message ===
            "UPFRONT_PAYMENT_NOT_FOUND"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Không tìm thấy thanh toán trả trước thành công để hoàn tiền",
            });
        }

        if (
            error.message ===
            "LATE_FEE_POLICY_NOT_FOUND"
        ) {
            return res.status(409).json({
                success: false,
                message: "Đơn thuê không có chính sách phí trả trễ",
            });
        }

        if (
            error.message ===
            "ACTUAL_RETURN_TIME_NOT_FOUND"
        ) {
            return res.status(409).json({
                success: false,
                message: "Đơn thuê chưa có thời gian trả thực tế",
            });
        }

        if (
            error.message === "INVALID_LATE_FEE_POLICY" ||
            error.message === "INVALID_LATE_FEE_INPUT"
        ) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Dữ liệu tính phí trả trễ không hợp lệ",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Không thể quyết toán đơn thuê",
        });
    }
};

const updateRentalUnitStatusController = async (
    req,
    res
) => {
    try {
        const { rentalUnitId } = req.params;
        const { newStatus, reason } = req.body ?? {};
        const staffId = req.user.userId;

        const rentalUnit =
            await changeRentalUnitStatus(
                rentalUnitId,
                newStatus,
                staffId,
                reason
            );

        return res.status(200).json({
            success: true,
            data: rentalUnit,
        });
    } catch (error) {
        if (
            error.message ===
            "RENTAL_UNIT_NOT_FOUND"
        ) {
            return res.status(404).json({
                success: false,
                message: "Rental unit not found",
            });
        }

        if (
            error.message ===
            "INVALID_STATUS_TRANSITION"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Invalid rental unit status transition",
            });
        }

        if (error.message === "INVALID_RENTAL_UNIT_DATA") {
            return res.status(400).json({
                success: false,
                message: "Thông tin đơn vị cho thuê không hợp lệ",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to update rental unit status",
        });
    }
};

const decideFeeApprovalController = async (
    req,
    res
) => {
    try {
        const { feeApprovalRequestId } = req.params;
        const managerId = req.user.userId;

        const {
            decision,
            finalAmount,
            decisionReason,
        } = req.body ?? {};

        const result = await decideFeeApproval(
            feeApprovalRequestId,
            managerId,
            decision,
            finalAmount,
            decisionReason
        );

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        if (
            error.message ===
            "FEE_APPROVAL_NOT_FOUND"
        ) {
            return res.status(404).json({
                success: false,
                message: "Fee approval request not found",
            });
        }

        if (
            error.message ===
            "FEE_APPROVAL_ALREADY_PROCESSED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Fee approval request already processed",
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
            "INVALID_FINAL_AMOUNT"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid final amount",
            });
        }

        if (
            error.message ===
            "DECISION_REASON_REQUIRED"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Decision reason is required",
            });
        }

        if (
            error.message ===
            "INVALID_DECISION"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid decision",
            });
        }

        if (
            error.message ===
            "UPFRONT_PAYMENT_NOT_FOUND"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Không tìm thấy thanh toán trả trước thành công để hoàn tiền",
            });
        }

        if (error.message === "INVALID_DECISION_REASON") {
            return res.status(400).json({
                success: false,
                message: "Lý do quyết định không hợp lệ",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to process fee approval",
        });
    }
};

// Controller to mark overdue rental orders
const markOverdueOrdersController = async (
    req,
    res
) => {
    try {
        const result =
            await markOverdueRentalOrders();

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to mark overdue rental orders",
        });
    }
};

// Controller to cancel a pending payment rental order
const cancelPendingPaymentOrderController = async (
    req,
    res
) => {
    try {
        const { id } = req.params;
        const customerId = req.user.userId;
        const { reason } = req.body ?? {};
        let normalizedReason = null;

        if (reason !== null && reason !== undefined) {
            if (typeof reason !== "string") {
                throw new Error(
                    "INVALID_CANCELLATION_REASON"
                );
            }

            normalizedReason = reason.trim() || null;
        }

        const order =
            await cancelPendingPaymentOrder(
                id,
                customerId,
                normalizedReason
            );

        return res.status(200).json({
            success: true,
            data: order,
        });
    } catch (error) {
        const gatewayError =
            handleGatewayRequestError(error, res);
        if (gatewayError) return gatewayError;

        if (
            error.message ===
            "INVALID_CANCELLATION_REASON"
        ) {
            return res.status(400).json({
                success: false,
                message: "Lý do hủy không hợp lệ",
            });
        }

        if (error.message === "ORDER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Rental order not found",
            });
        }

        if (
            error.message ===
            "DIRECT_CANCELLATION_NOT_ALLOWED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Only PENDING_PAYMENT orders can be cancelled directly",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to cancel rental order",
        });
    }
};

const requestCancellationController = async (
    req,
    res
) => {
    try {
        const { id } = req.params;
        const customerId = req.user.userId;
        const { reason } = req.body ?? {};

        const request = await requestCancellation(
            id,
            customerId,
            reason
        );

        return res.status(201).json({
            success: true,
            data: request,
        });
    } catch (error) {
        if (error.message === "ORDER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Rental order not found",
            });
        }

        if (
            error.message ===
            "CANCELLATION_REQUEST_NOT_ALLOWED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Cancellation request is not allowed for this order status",
            });
        }

        if (
            error.message ===
            "CANCELLATION_REASON_REQUIRED"
        ) {
            return res.status(400).json({
                success: false,
                message: "Cancellation reason is required",
            });
        }

        if (
            error.message ===
            "CANCELLATION_ALREADY_REQUESTED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Cancellation has already been requested",
            });
        }

        if (error.message === "POLICY_NOT_FOUND") {
            return res.status(409).json({
                success: false,
                message: "Active rental policy not found",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to request cancellation",
        });
    }
};

const rejectCancellationRequestController = async (
    req,
    res
) => {
    try {
        const { cancellationRequestId } = req.params;
        const managerId = req.user.userId;
        const { decisionReason } = req.body ?? {};

        const request =
            await rejectCancellationRequest(
                cancellationRequestId,
                managerId,
                decisionReason
            );

        return res.status(200).json({
            success: true,
            data: request,
        });
    } catch (error) {
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
            "CANCELLATION_REQUEST_ALREADY_PROCESSED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Cancellation request already processed",
            });
        }

        if (
            error.message ===
            "DECISION_REASON_REQUIRED"
        ) {
            return res.status(400).json({
                success: false,
                message: "Decision reason is required",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to reject cancellation request",
        });
    }
};

const approveCancellationRequestController = async (
    req,
    res
) => {
    try {
        const { cancellationRequestId } = req.params;
        const managerId = req.user.userId;

        const {
            decisionReason,
        } = req.body ?? {};

        const result =
            await approveCancellationRequest(
                cancellationRequestId,
                managerId,
                decisionReason
            );

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        const gatewayError =
            handleGatewayRequestError(error, res);
        if (gatewayError) return gatewayError;

        if (error.message === "INVALID_DECISION_REASON") {
            return res.status(400).json({
                success: false,
                message: "Lý do quyết định không hợp lệ",
            });
        }

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
            "CANCELLATION_REQUEST_ALREADY_PROCESSED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Cancellation request already processed",
            });
        }

        if (
            error.message ===
            "INVALID_ORDER_STATUS"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Order cannot be cancelled in its current status",
            });
        }

        if (
            error.message ===
            "CANCELLATION_POLICY_NOT_FOUND"
        ) {
            return res.status(409).json({
                success: false,
                message: "Cancellation policy not found",
            });
        }

        if (
            error.message ===
            "INVALID_CANCELLATION_POLICY"
        ) {
            return res.status(500).json({
                success: false,
                message:
                    "Invalid cancellation policy configuration",
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

        if (
            error.message ===
            "CANCELLATION_RULE_NOT_FOUND"
        ) {
            return res.status(500).json({
                success: false,
                message: "Cancellation rule not found",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to approve cancellation request",
        });
    }
};

const getPendingCancellationRequestsController = async (
    req,
    res
) => {
    try {
        const data =
            await getPendingCancellationRequests();

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể lấy danh sách yêu cầu hủy đang chờ xử lý",
        });
    }
};

// Controller to expire pending payment orders
const expirePendingPaymentOrdersController = async (
    req,
    res
) => {
    try {
        const result =
            await expirePendingPaymentOrders();

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to expire pending payment orders",
        });
    }
};

// Controller to replace a rental unit in a reservation
const replaceRentalUnitController = async (
    req,
    res
) => {
    try {
        const {
            id,
            reservationId,
        } = req.params;

        const staffId = req.user.userId;
        const { replacementReason } = req.body ?? {};

        const result = await replaceRentalUnit(
            id,
            reservationId,
            staffId,
            replacementReason
        );

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        if (
            error.message ===
            "RESERVATION_NOT_FOUND"
        ) {
            return res.status(404).json({
                success: false,
                message: "Reservation not found",
            });
        }

        if (
            error.message ===
            "REPLACEMENT_REASON_REQUIRED"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Replacement reason is required",
            });
        }

        if (
            error.message ===
            "INVALID_ORDER_STATUS"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Order must be PREPARING",
            });
        }

        if (
            error.message ===
            "CANCELLATION_PENDING"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Order has a pending cancellation request",
            });
        }

        if (
            error.message ===
            "INVALID_RESERVATION_STATUS"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Reservation must be CONFIRMED",
            });
        }

        if (
            error.message ===
            "REPLACEMENT_UNIT_NOT_FOUND"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "No replacement rental unit available",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to replace rental unit",
        });
    }
};
const cancelOrderByStoreController = async (
    req,
    res
) => {
    try {
        const { id } = req.params;
        const managerId = req.user.userId;
        const { reason } = req.body ?? {};

        const result =
            await cancelOrderByStore(
                id,
                managerId,
                reason
            );

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        if (
            error.message ===
            "ORDER_NOT_FOUND"
        ) {
            return res.status(404).json({
                success: false,
                message: "Rental order not found",
            });
        }

        if (
            error.message ===
            "CANCELLATION_REASON_REQUIRED"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Cancellation reason is required",
            });
        }

        if (
            error.message ===
            "STORE_CANCELLATION_NOT_ALLOWED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Order cannot be cancelled by store in current status",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to cancel rental order by store",
        });
    }
};
export { createRentalOrder, getRentalOrdersController, getRentalOrderDetailController, getRentalOrderHistoryController, startPreparingOrder, prepareRentalReservation, handoverOrder, receiveReturn, inspectOrderItem, settleOrder, updateRentalUnitStatusController, decideFeeApprovalController, markOverdueOrdersController, cancelPendingPaymentOrderController, requestCancellationController, rejectCancellationRequestController, approveCancellationRequestController, getPendingCancellationRequestsController, expirePendingPaymentOrdersController, replaceRentalUnitController, cancelOrderByStoreController };
