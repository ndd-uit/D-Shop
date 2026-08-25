import prisma from "../../config/prisma.js";
import { getCart } from "../cart/cart.service.js"
import { checkAvailability } from "../availability/availability.service.js"
import {
    findRentalOrderForPreparation,
    findReservationForPreparation,
    updateReservationPreparation,
    findRentalOrderById,
    updateRentalOrderStatus,
    createRentalOrder,
    createRentalOrderItem,
    createReservation,
    createOrderStatusHistory,
    findRentalOrderForHandover,
    markOrderAsRenting,
    activateReservations,
    markRentalUnitsAsRented,
    createRentalUnitStatusHistory,
    findRentalOrderForReturn,
    markOrderReturned,
    markRentalUnitsReturnInspection,
    findOrderItemForInspection,
    createInspectionResult,
    findRentalOrderInspectionProgress,
    findRentalOrderForSettlement,
    createFeeApprovalRequest,
    findLatestFeeApprovalRequest,
    updateRentalOrderSettlement,
    completeReservations,
    findRentalOrderForCompletion,
    findRentalUnitById,
    updateRentalUnitStatus,
    markRentalUnitAsPreparing,
    updateFeeApprovalRequest,
    findFeeApprovalRequestById,
    findOverdueRentalOrders,
    findOrderForCancellationRequest,
    createCancellationRequest,
    updateCancellationRequest,
    findCancellationRequestForDecision,
    findPendingCancellationRequests,
    cancelConfirmedReservations,
    cancelRentalOrder,
    findExpiredPendingPaymentOrders,
    expireTemporaryReservations,
    expirePendingPaymentOrder,
    findReservationForReplacement,
    releaseReservationForReplacement,
    findOrderForStoreCancellation,
    findRentalOrders,
    findRentalOrderDetail,
    findRentalOrderOwnership,
    findRentalOrderStatusHistory,
} from "./rental.repository.js";
import {
    RentalOrderStatus,
    ReservationStatus,
    RentalUnitStatus,
    FeeApprovalStatus,
    RefundType,
    RefundStatus,
    PaymentPurpose,
    PaymentStatus,
    CancellationRequestStatus,
    UserRole,
} from "../../generated/prisma/client.ts";
import { findActiveRentalPolicy, findAvailableRentalUnits } from "../availability/availability.repository.js";
import {
    createRefund,
    findLatestRefundByPaymentAndType,
    findSuccessfulUpfrontPayment,
} from "../payment/payment.repository.js";
import {
    createRefundRequest,
} from "../payment/gateway/paymentGateway.js";
import { UUID_REGEX } from "../../utils/validation.js";

const attachAutomaticRefundGatewayRequest = async (
    result,
    resultKey
) => {
    const refundResult = result?.[resultKey];

    if (
        !refundResult?.refund ||
        refundResult.refund.status !== RefundStatus.PENDING
    ) {
        return result;
    }

    const refund = refundResult.refund;
    const gatewayRequest = await createRefundRequest({
        refundId: refund.refundId,
        paymentId: refund.paymentId,
        amount: refund.amount,
        type: refund.type,
        reason: refund.reason,
    });

    return {
        ...result,
        [resultKey]: {
            ...refundResult,
            ...gatewayRequest,
        },
    };
};

const normalizeRequiredString = (
    value,
    errorCode,
    maxLength = null
) => {
    if (typeof value !== "string") {
        throw new Error(errorCode);
    }

    const normalized = value.trim();

    if (
        !normalized ||
        (
            maxLength !== null &&
            normalized.length > maxLength
        )
    ) {
        throw new Error(errorCode);
    }

    return normalized;
};

const normalizeOptionalString = (
    value,
    errorCode,
    maxLength = null
) => {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value !== "string") {
        throw new Error(errorCode);
    }

    const normalized = value.trim();

    if (
        maxLength !== null &&
        normalized.length > maxLength
    ) {
        throw new Error(errorCode);
    }

    return normalized || null;
};

const normalizeOptionalStringArray = (
    value,
    errorCode
) => {
    if (value === null || value === undefined) {
        return null;
    }

    if (
        !Array.isArray(value) ||
        value.some(
            (item) =>
                typeof item !== "string" ||
                !item.trim()
        )
    ) {
        throw new Error(errorCode);
    }

    return value.map((item) => item.trim());
};

const ensureAutomaticRefund = async ({
    orderId,
    paymentId = null,
    type,
    amount,
    reason,
    db,
}) => {
    const refundAmount = Number(amount);

    if (refundAmount <= 0) {
        return null;
    }

    const payment = paymentId
        ? { paymentId }
        : await findSuccessfulUpfrontPayment(
            orderId,
            db
        );

    if (!payment) {
        throw new Error(
            "UPFRONT_PAYMENT_NOT_FOUND"
        );
    }

    const existingRefund =
        await findLatestRefundByPaymentAndType(
            payment.paymentId,
            type,
            db
        );

    if (existingRefund) {
        return {
            refund: existingRefund,
            alreadyCreated: true,
        };
    }

    const refund = await createRefund(
        {
            paymentId: payment.paymentId,
            type,
            amount: refundAmount,
            reason,
            status: RefundStatus.PENDING,
        },
        db
    );

    return {
        refund,
        alreadyCreated: false,
    };
};

const createRental = async (customerId, pickupInfo, returnInfo) => {
    const normalizedPickupInfo = normalizeRequiredString(
        pickupInfo,
        "RENTAL_INFO_REQUIRED"
    );
    const normalizedReturnInfo = normalizeRequiredString(
        returnInfo,
        "RENTAL_INFO_REQUIRED"
    );

    const cart = await getCart(customerId);

    if (!cart) {
        throw new Error("CART_NOT_FOUND");
    }

    if (cart.items.length === 0) {
        throw new Error("CART_EMPTY");
    }

    if (!cart.rentalStartAt || !cart.returnDueAt) {
        throw new Error("RENTAL_PERIOD_REQUIRED");
    }
    // Kiểm tra thong tin nhận và trả hàng
    try {
        return prisma.$transaction(async (tx) => {
            const allocations = []; // Mảng để lưu trữ thông tin về các đơn vị cho thuê được phân bổ cho từng mục trong giỏ hàng

            let rentalAmount = 0; // Biến để tính tổng số tiền thuê
            let depositAmount = 0; // Biến để tính tổng số tiền thuê và tiền đặt cọc
            let policy = null; // Biến để lưu trữ chính sách thuê hiện tại

            for (const item of cart.items) {
                // Kiểm tra tính khả dụng của các đơn vị cho thuê cho từng mục trong giỏ hàng
                const availability = await checkAvailability({
                    garmentId: item.garmentId,
                    requestedSize: item.requestedSize,
                    quantity: item.quantity,
                    rentalStartAt: cart.rentalStartAt,

                    returnDueAt: cart.returnDueAt,
                    db: tx, // Sử dụng transaction để đảm bảo tính nhất quán dữ liệu
                });
                if (!availability.available) {
                    throw new Error("AVAILABILITY_CONFLICT");
                }
                if (!policy) {
                    policy = availability.policy; // Lưu trữ chính sách thuê hiện tại nếu chưa có
                }
                // selectedUnits là danh sách các đơn vị cho thuê được chọn dựa trên số lượng yêu cầu
                const selectedUnits = availability.availableUnits.slice(0, item.quantity); // Chọn các đơn vị cho thuê khả dụng theo số lượng yêu cầu
                for (const unit of selectedUnits) {
                    // Thêm thông tin về các đơn vị cho thuê được phân bổ vào mảng allocations
                    allocations.push({
                        garmentId: item.garmentId,
                        requestedSize: item.requestedSize,
                        rentalUnitId: unit.rentalUnitId,
                        blockedStartAt: availability.blockStartAt,
                        blockedEndAt: availability.blockEndAt,
                    });
                }
                // Tính toán tổng số tiền thuê và tiền đặt cọc dựa trên chính sách thuê hiện tại
                rentalAmount += Number(item.garment.rentalPrice) * item.quantity;
                depositAmount += Number(item.garment.depositAmount) * item.quantity;
            }
            const upfrontAmount = rentalAmount + depositAmount; // Tổng số tiền phải trả trước là tổng số tiền thuê và tiền đặt cọc
            const now = new Date();
            const holdExpireAt = new Date(now.getTime() + policy.holdDuration * 60 * 1000); // Thoi gian het han = thoi diem hien tai + thoi gian hold (phut) * 60 * 1000 (chuyen sang milisecond)
            // Tạo đơn đặt hàng thuê mới trong cơ sở dữ liệu
            const order = await createRentalOrder({
                customerId,
                policyId: policy.policyId, // Lưu trữ ID của chính sách thuê hiện tại
                rentalStartAt: cart.rentalStartAt,
                returnDueAt: cart.returnDueAt,
                pickupInfo: normalizedPickupInfo,
                returnInfo: normalizedReturnInfo,
                status: RentalOrderStatus.PENDING_PAYMENT, // Trạng thái ban đầu của đơn đặt hàng là "Chờ thanh toán"
                rentalAmount,
                depositAmount,
                upfrontAmount,
            }, tx)
            for (const allocation of allocations) {
                const orderItem = await createRentalOrderItem({
                    orderId: order.orderId,
                    garmentId: allocation.garmentId,
                    requestedSize: allocation.requestedSize,
                }, tx)
                await createReservation({
                    rentalOrderItemId: orderItem.orderItemId,
                    rentalUnitId: allocation.rentalUnitId,
                    status: ReservationStatus.TEMPORARY_HOLD,
                    blockedStartAt: allocation.blockedStartAt,
                    blockedEndAt: allocation.blockedEndAt,
                    holdExpiresAt: holdExpireAt,
                }, tx)
            }
            await createOrderStatusHistory({
                rentalOrderId: order.orderId,
                oldStatus: null,
                newStatus: RentalOrderStatus.PENDING_PAYMENT,
                changedAt: now,
                changedBy: customerId,
                reason: "Rental order created",
            }, tx)
            return { order, holdExpiresAt: holdExpireAt };
        }, {
            isolationLevel: "Serializable", // để giảm race condition khi 2 customer cùng giành một RentalUnit
        });
    }
    catch (error) {
        // Truong hop loi P2034 (Conflict) do 2 customer cung muon dat RentalUnit cung luc, tra ve loi AVAILABILITY_CONFLICT
        if (error.code === "P2034") {
            throw new Error("AVAILABILITY_CONFLICT");
        }
        throw error;
    }
}

const startPreparingRentalOrder = async (orderId, staffId) => {
    return prisma.$transaction(async (tx) => {
        const order = await findRentalOrderForPreparation(
            orderId,
            tx
        );

        if (!order) {
            throw new Error("ORDER_NOT_FOUND");
        }

        if (order.status !== RentalOrderStatus.CONFIRMED) {
            throw new Error("INVALID_ORDER_STATUS");
        }

        if (order.cancellationRequests.length > 0) {
            throw new Error("CANCELLATION_PENDING");
        }

        const updateOrder = await updateRentalOrderStatus(orderId, RentalOrderStatus.PREPARING, tx);
        await createOrderStatusHistory({
            rentalOrderId: orderId,
            oldStatus: RentalOrderStatus.CONFIRMED,
            newStatus: RentalOrderStatus.PREPARING,
            changedBy: staffId,
            changedAt: new Date(),
            reason: "Staff started preparing rental order",
        }, tx);
        return updateOrder;
    }, {
        isolationLevel: "Serializable",
        maxWait: 10000,
        timeout: 30000,
    });
}

const prepareReservation = async (
    orderId,
    reservationId,
    staffId,
    preparationCondition,
    preparationNotes,
    preparationImages
) => {
    const normalizedCondition = normalizeOptionalString(
        preparationCondition,
        "INVALID_PREPARATION_DATA",
        100
    );
    const normalizedNotes = normalizeOptionalString(
        preparationNotes,
        "INVALID_PREPARATION_DATA"
    );
    const normalizedImages = normalizeOptionalString(
        preparationImages,
        "INVALID_PREPARATION_DATA"
    );

    return prisma.$transaction(async (tx) => {
        // 1. Lấy order
        const order = await findRentalOrderForPreparation(
            orderId,
            tx
        );

        if (!order) {
            throw new Error("ORDER_NOT_FOUND");
        }

        // 2. Chỉ order PREPARING mới được chuẩn bị item
        if (order.status !== RentalOrderStatus.PREPARING) {
            throw new Error("INVALID_ORDER_STATUS");
        }

        // 3. Nếu đang có yêu cầu hủy thì chặn
        if (order.cancellationRequests.length > 0) {
            throw new Error("CANCELLATION_PENDING");
        }

        // 4. Tìm Reservation thuộc đúng Order
        const reservation =
            await findReservationForPreparation(
                reservationId,
                orderId,
                tx
            );

        if (!reservation) {
            throw new Error("RESERVATION_NOT_FOUND");
        }

        // 5. Reservation phải đang CONFIRMED
        if (
            reservation.status !==
            ReservationStatus.CONFIRMED
        ) {
            throw new Error("INVALID_RESERVATION_STATUS");
        }

        if (reservation.preparedAt) {
            if (
                reservation.rentalUnit.status !==
                RentalUnitStatus.PREPARING
            ) {
                throw new Error(
                    "INVALID_RENTAL_UNIT_STATUS"
                );
            }

            return {
                reservation,
                orderStatus: order.status,
                alreadyPrepared: true,
            };
        }

        if (
            reservation.rentalUnit.status !==
            RentalUnitStatus.AVAILABLE
        ) {
            throw new Error(
                "INVALID_RENTAL_UNIT_STATUS"
            );
        }

        // 6. Ghi kết quả chuẩn bị
        const now = new Date();
        const preparedReservation =
            await updateReservationPreparation(
                reservationId,
                {
                    preparationCondition: normalizedCondition,
                    preparationNotes: normalizedNotes,
                    preparationImages: normalizedImages,
                    preparedAt: now,
                },
                tx
            );

        const preparedUnit =
            await markRentalUnitAsPreparing(
            reservation.rentalUnitId,
            tx
        );

        if (preparedUnit.count !== 1) {
            throw new Error(
                "INVALID_RENTAL_UNIT_STATUS"
            );
        }

        await createRentalUnitStatusHistory(
            {
                rentalUnitId:
                    reservation.rentalUnitId,
                oldStatus:
                    RentalUnitStatus.AVAILABLE,
                newStatus:
                    RentalUnitStatus.PREPARING,
                changedBy: staffId,
                changedAt: now,
                reason: "Rental unit prepared for handover",
            },
            tx
        );

        // 7. Đọc lại Order sau khi vừa prepare
        const updatedOrder =
            await findRentalOrderForPreparation(
                orderId,
                tx
            );

        // 8. Kiểm tra tất cả item đã chuẩn bị chưa
        const allPrepared = updatedOrder.items.every(
            (item) =>
                item.reservations.some(
                    (reservation) =>
                        reservation.status ===
                        ReservationStatus.CONFIRMED &&
                        reservation.preparedAt
                )
        );

        // 9. Chưa chuẩn bị hết → giữ PREPARING
        if (!allPrepared) {
            return {
                reservation: preparedReservation,
                orderStatus: RentalOrderStatus.PREPARING,
                alreadyPrepared: false,
            };
        }

        // 10. Đủ hết → READY_FOR_PICKUP
        await updateRentalOrderStatus(
            orderId,
            RentalOrderStatus.READY_FOR_PICKUP,
            tx
        );

        await createOrderStatusHistory(
            {
                rentalOrderId: orderId,
                oldStatus: RentalOrderStatus.PREPARING,
                newStatus:
                    RentalOrderStatus.READY_FOR_PICKUP,
                changedBy: staffId,
                changedAt: new Date(),
                reason: "All rental items are prepared",
            },
            tx
        );

        return {
            reservation: preparedReservation,
            orderStatus:
                RentalOrderStatus.READY_FOR_PICKUP,
            alreadyPrepared: false,
        };
    });
};

const getRentalOrders = async ({
    userId,
    role,
}) => {
    if (role === UserRole.CUSTOMER) {
        return findRentalOrders({
            customerId: userId,
        });
    }

    if (
        role === UserRole.RENTAL_STAFF ||
        role === UserRole.STORE_MANAGER
    ) {
        return findRentalOrders({
            customerId: null,
        });
    }

    throw new Error("FORBIDDEN");
};

const getRentalOrderDetail = async ({
    orderId,
    userId,
    role,
}) => {
    const order = await findRentalOrderDetail(
        orderId
    );

    if (!order) {
        throw new Error("RENTAL_ORDER_NOT_FOUND");
    }

    if (
        role === UserRole.CUSTOMER &&
        order.customerId !== userId
    ) {
        throw new Error("RENTAL_ORDER_FORBIDDEN");
    }

    if (
        role !== UserRole.CUSTOMER &&
        role !== UserRole.RENTAL_STAFF &&
        role !== UserRole.STORE_MANAGER
    ) {
        throw new Error("RENTAL_ORDER_FORBIDDEN");
    }

    return order;
};

const getRentalOrderHistory = async ({
    orderId,
    userId,
    role,
}) => {
    const order = await findRentalOrderOwnership(
        orderId
    );

    if (!order) {
        throw new Error("RENTAL_ORDER_NOT_FOUND");
    }

    if (
        role === UserRole.CUSTOMER &&
        order.customerId !== userId
    ) {
        throw new Error("RENTAL_ORDER_FORBIDDEN");
    }

    if (
        role !== UserRole.CUSTOMER &&
        role !== UserRole.RENTAL_STAFF &&
        role !== UserRole.STORE_MANAGER
    ) {
        throw new Error("RENTAL_ORDER_FORBIDDEN");
    }

    return findRentalOrderStatusHistory(orderId);
};

const handoverRentalOrder = async (
    orderId,
    staffId,
    nationalId,
    items
) => {
    const normalizedNationalId = normalizeRequiredString(
        nationalId,
        "NATIONAL_ID_REQUIRED",
        20
    );

    if (!Array.isArray(items) || items.length === 0) {
        throw new Error("INVALID_HANDOVER_ITEMS");
    }

    const confirmations = items.map((item) => {
        if (
            !item ||
            typeof item !== "object" ||
            Array.isArray(item) ||
            typeof item.orderItemId !== "string" ||
            !UUID_REGEX.test(item.orderItemId) ||
            typeof item.rentalUnitId !== "string" ||
            !UUID_REGEX.test(item.rentalUnitId)
        ) {
            throw new Error("INVALID_HANDOVER_ITEMS");
        }

        if (item.accessoriesConfirmed !== true) {
            throw new Error(
                "INVALID_HANDOVER_CONFIRMATION"
            );
        }

        return {
            orderItemId: item.orderItemId,
            rentalUnitId: item.rentalUnitId,
        };
    });

    if (
        new Set(
            confirmations.map((item) => item.orderItemId)
        ).size !== confirmations.length ||
        new Set(
            confirmations.map((item) => item.rentalUnitId)
        ).size !== confirmations.length
    ) {
        throw new Error("INVALID_HANDOVER_ITEMS");
    }

    return prisma.$transaction(async (tx) => {
        const order = await findRentalOrderForHandover(
            orderId,
            tx
        );

        if (!order) {
            throw new Error("ORDER_NOT_FOUND");
        }

        if (
            order.status !==
            RentalOrderStatus.READY_FOR_PICKUP
        ) {
            throw new Error("INVALID_ORDER_STATUS");
        }

        if (order.cancellationRequests.length > 0) {
            throw new Error("CANCELLATION_PENDING");
        }

        if (confirmations.length !== order.items.length) {
            throw new Error("HANDOVER_ITEM_MISMATCH");
        }

        // Customer chưa lưu CCCD
        if (!order.customer.nationalId) {
            throw new Error("NATIONAL_ID_REQUIRED");
        }

        // CCCD Staff nhập không khớp CCCD Customer đã lưu
        if (
            order.customer.nationalId !==
            normalizedNationalId
        ) {
            throw new Error("NATIONAL_ID_MISMATCH");
        }

        // Lấy Reservation hiện tại của từng item
        const activeReservations = [];

        for (const item of order.items) {
            const confirmation = confirmations.find(
                (entry) =>
                    entry.orderItemId === item.orderItemId
            );

            if (!confirmation) {
                throw new Error("HANDOVER_ITEM_MISMATCH");
            }

            const reservation = item.reservations.find(
                (reservation) =>
                    reservation.status ===
                    ReservationStatus.CONFIRMED &&
                    reservation.preparedAt
            );

            if (!reservation) {
                throw new Error("ITEM_NOT_READY");
            }

            if (
                confirmation.rentalUnitId !==
                reservation.rentalUnitId
            ) {
                throw new Error("HANDOVER_UNIT_MISMATCH");
            }

            if (
                reservation.rentalUnit.status !==
                RentalUnitStatus.PREPARING
            ) {
                throw new Error(
                    "INVALID_RENTAL_UNIT_STATUS"
                );
            }

            activeReservations.push(reservation);
        }

        const orderItemIds = order.items.map(
            (item) => item.orderItemId
        );

        const rentalUnitIds = activeReservations.map(
            (reservation) => reservation.rentalUnitId
        );

        const now = new Date();

        // Order → RENTING + ghi thời gian nhận
        const updatedOrder = await markOrderAsRenting(
            orderId,
            now,
            tx
        );

        // Reservation CONFIRMED → ACTIVE
        await activateReservations(
            orderItemIds,
            tx
        );

        // RentalUnit → RENTED
        const rentedUnits = await markRentalUnitsAsRented(
            rentalUnitIds,
            tx
        );

        if (rentedUnits.count !== rentalUnitIds.length) {
            throw new Error(
                "INVALID_RENTAL_UNIT_STATUS"
            );
        }
        // Ghi lịch sử trạng thái RentalUnit
        for (const reservation of activeReservations) {
            await createRentalUnitStatusHistory(
                {
                    rentalUnitId: reservation.rentalUnitId,
                    oldStatus: RentalUnitStatus.PREPARING,
                    newStatus: RentalUnitStatus.RENTED,
                    changedBy: staffId,
                    changedAt: now,
                    reason: "Rental unit handed over",
                },
                tx
            );
        }

        // Lưu lịch sử trạng thái Order
        await createOrderStatusHistory(
            {
                rentalOrderId: orderId,
                oldStatus:
                    RentalOrderStatus.READY_FOR_PICKUP,
                newStatus: RentalOrderStatus.RENTING,
                changedBy: staffId,
                changedAt: now,
                reason: "Rental items handed over",
            },
            tx
        );

        return updatedOrder;
    });
};

// Nhận trả đơn thuê
const receiveRentalReturn = async (
    orderId,
    staffId
) => {
    return prisma.$transaction(async (tx) => {
        // 1. Tìm order
        const order = await findRentalOrderForReturn(
            orderId,
            tx
        );

        if (!order) {
            throw new Error("ORDER_NOT_FOUND");
        }

        // 2. Chỉ RENTING hoặc OVERDUE mới được nhận trả
        if (
            order.status !== RentalOrderStatus.RENTING &&
            order.status !== RentalOrderStatus.OVERDUE
        ) {
            throw new Error("INVALID_ORDER_STATUS");
        }

        // 3. Tìm ACTIVE Reservation của từng item
        const activeReservations = [];

        for (const item of order.items) {
            const reservation = item.reservations.find(
                (reservation) =>
                    reservation.status ===
                    ReservationStatus.ACTIVE
            );

            if (!reservation) {
                throw new Error("ACTIVE_RESERVATION_NOT_FOUND");
            }

            activeReservations.push(reservation);
        }

        const rentalUnitIds = activeReservations.map(
            (reservation) => reservation.rentalUnitId
        );

        const now = new Date();

        // 4. Order → RETURNED + ghi actualReturnAt
        await markOrderReturned(
            orderId,
            now,
            tx
        );

        await createOrderStatusHistory(
            {
                rentalOrderId: orderId,
                oldStatus: order.status,
                newStatus: RentalOrderStatus.RETURNED,
                changedBy: staffId,
                changedAt: now,
                reason: "Rental items returned",
            },
            tx
        );

        // 5. RentalUnit → RETURN_INSPECTION
        await markRentalUnitsReturnInspection(
            rentalUnitIds,
            tx
        );

        // 6. Ghi history cho từng RentalUnit
        for (const reservation of activeReservations) {
            await createRentalUnitStatusHistory(
                {
                    rentalUnitId: reservation.rentalUnitId,
                    oldStatus: reservation.rentalUnit.status,
                    newStatus:
                        RentalUnitStatus.RETURN_INSPECTION,
                    changedBy: staffId,
                    changedAt: now,
                    reason: "Rental unit returned for inspection",
                },
                tx
            );
        }

        // 7. Order RETURNED → INSPECTING
        const updatedOrder =
            await updateRentalOrderStatus(
                orderId,
                RentalOrderStatus.INSPECTING,
                tx
            );

        await createOrderStatusHistory(
            {
                rentalOrderId: orderId,
                oldStatus: RentalOrderStatus.RETURNED,
                newStatus: RentalOrderStatus.INSPECTING,
                changedBy: staffId,
                changedAt: now,
                reason: "Return inspection started",
            },
            tx
        );

        return updatedOrder;
    });
};

const inspectRentalOrderItem = async (
    orderId,
    orderItemId,
    staffId,
    {
        condition,
        accessoriesStatus,
        issueType,
        description,
        evidenceUrls,
        proposedCharge,
    }
) => {
    const normalizedCondition = normalizeRequiredString(
        condition,
        "INVALID_INSPECTION_DATA",
        100
    );
    const normalizedAccessoriesStatus =
        normalizeOptionalString(
            accessoriesStatus,
            "INVALID_INSPECTION_DATA",
            100
        );
    const normalizedIssueType = normalizeOptionalString(
        issueType,
        "INVALID_INSPECTION_DATA",
        100
    );
    const normalizedDescription = normalizeOptionalString(
        description,
        "INVALID_INSPECTION_DATA"
    );
    const normalizedEvidenceUrls =
        normalizeOptionalStringArray(
            evidenceUrls,
            "INVALID_INSPECTION_DATA"
        );

    const allowedIssueTypes = new Set([
        "STAIN",
        "DAMAGE",
        "SEVERE_DAMAGE",
        "MISSING_ACCESSORY",
        "LOST",
    ]);

    if (
        normalizedIssueType &&
        !allowedIssueTypes.has(normalizedIssueType)
    ) {
        throw new Error("INVALID_ISSUE_TYPE");
    }

    return prisma.$transaction(async (tx) => {
        // 1. Kiểm tra Order
        const order = await findRentalOrderById(
            orderId,
            tx
        );

        if (!order) {
            throw new Error("ORDER_NOT_FOUND");
        }

        if (
            order.status !== RentalOrderStatus.INSPECTING
        ) {
            throw new Error("INVALID_ORDER_STATUS");
        }

        // 2. Kiểm tra item có thuộc order không
        const orderItem =
            await findOrderItemForInspection(
                orderId,
                orderItemId,
                tx
            );

        if (!orderItem) {
            throw new Error("ORDER_ITEM_NOT_FOUND");
        }

        // 3. Mỗi item chỉ inspect 1 lần
        if (orderItem.inspectionResult) {
            throw new Error("ITEM_ALREADY_INSPECTED");
        }

        // 4. Tìm Reservation đang ACTIVE
        const reservation =
            orderItem.reservations.find(
                (reservation) =>
                    reservation.status ===
                    ReservationStatus.ACTIVE
            );

        if (!reservation) {
            throw new Error(
                "ACTIVE_RESERVATION_NOT_FOUND"
            );
        }

        // 5. Unit phải đang chờ kiểm tra trả
        if (
            reservation.rentalUnit.status !==
            RentalUnitStatus.RETURN_INSPECTION
        ) {
            throw new Error(
                "INVALID_RENTAL_UNIT_STATUS"
            );
        }

        const charge = Number(proposedCharge ?? 0);

        if (!Number.isFinite(charge) || charge < 0) {
            throw new Error("INVALID_PROPOSED_CHARGE");
        }

        if (charge > 0) {
            if (!normalizedIssueType) {
                throw new Error("ISSUE_TYPE_REQUIRED");
            }

            if (!normalizedDescription) {
                throw new Error(
                    "INSPECTION_DESCRIPTION_REQUIRED"
                );
            }

            if (
                !normalizedEvidenceUrls ||
                normalizedEvidenceUrls.length === 0
            ) {
                throw new Error(
                    "INSPECTION_EVIDENCE_REQUIRED"
                );
            }
        }

        const now = new Date();

        // 6. Tạo kết quả kiểm tra
        const inspection = await createInspectionResult(
            {
                rentalOrderItemId: orderItemId,
                rentalUnitId: reservation.rentalUnitId,

                condition: normalizedCondition,
                accessoriesStatus:
                    normalizedAccessoriesStatus,
                issueType: normalizedIssueType,
                description: normalizedDescription,
                evidenceUrls: normalizedEvidenceUrls
                    ? JSON.stringify(normalizedEvidenceUrls)
                    : null,
                proposedCharge: charge,
                inspectedBy: staffId,
                inspectedAt: now,
            },
            tx,
        );

        // 7. Kiểm tra tất cả item của order
        const progress =
            await findRentalOrderInspectionProgress(
                orderId,
                tx
            );

        const allInspected =
            progress.items.every(
                (item) => item.inspectionResult
            );

        // Còn item chưa inspect
        if (!allInspected) {
            return {
                inspection,
                orderStatus:
                    RentalOrderStatus.INSPECTING,
            };
        }

        // 8. Tất cả đã inspect
        await updateRentalOrderStatus(
            orderId,
            RentalOrderStatus.SETTLEMENT_PENDING,
            tx
        );

        await createOrderStatusHistory(
            {
                rentalOrderId: orderId,
                oldStatus:
                    RentalOrderStatus.INSPECTING,
                newStatus:
                    RentalOrderStatus.SETTLEMENT_PENDING,
                changedBy: staffId,
                changedAt: now,
                reason:
                    "All rental items inspected",
            },
            tx
        );

        return {
            inspection,
            orderStatus:
                RentalOrderStatus.SETTLEMENT_PENDING,
        };
    });
};

// Thanh toán và quyết toán đơn thuê
const settleRentalOrder = async (
    orderId,
    staffId
) => {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const result = await prisma.$transaction(async (tx) => {
                const order =
                    await findRentalOrderForSettlement(
                        orderId,
                        tx
                    );

        if (!order) {
            throw new Error("ORDER_NOT_FOUND");
        }

        if (
            order.status !==
            RentalOrderStatus.SETTLEMENT_PENDING
        ) {
            throw new Error("INVALID_ORDER_STATUS");
        }

        const inspectionCharge = order.items.reduce(
            (total, item) =>
                total +
                Number(
                    item.inspectionResult?.proposedCharge ?? 0
                ),
            0
        );

        const {
            lateFee,
            lateUnits,
        } = calculateLateFee({
            rentalAmount: order.rentalAmount,
            returnDueAt: order.returnDueAt,
            actualReturnAt: order.actualReturnAt,
            lateFeePolicy:
                order.policy?.lateFeePolicy,
        });

        const additionalCharge =
            inspectionCharge + lateFee;

        const hasManagerRequiredIssue =
            order.items.some((item) =>
                ["SEVERE_DAMAGE", "LOST"].includes(
                    item.inspectionResult?.issueType
                )
            );

        const depositAmount = Number(order.depositAmount);
        const rentalAmount = Number(order.rentalAmount);

        // Tinh toán quyết toán
        const calculateSettlement = (additionalCharge) => ({
            // Tổng phí phát sinh từ InspectionResult
            additionalCharge,
            // Số tiền đặt cọc được hoàn lại = tiền đặt cọc - phí phát sinh (nếu có)
            depositRefundAmount: Math.max(
                depositAmount - additionalCharge,
                0
            ),
            // Số tiền phải trả thêm = phí phát sinh - tiền đặt cọc (nếu có)
            additionalPayment: Math.max(
                additionalCharge - depositAmount,
                0
            ),
            // Tổng phí phải trả = tiền thuê + phí phát sinh
            finalCharge:
                rentalAmount + additionalCharge,
        });

        const settlement =
            calculateSettlement(additionalCharge);

        const breakdown = {
            inspectionCharge,
            lateFee,
            lateUnits,
            ...settlement,
        };

        // Không có phí và không có sự cố nghiêm trọng → không cần duyệt
        if (
            additionalCharge === 0 &&
            !hasManagerRequiredIssue
        ) {
            // Cập nhật thông tin quyết toán của RentalOrder
            await updateRentalOrderSettlement(
                orderId,
                settlement,
                tx
            );

            const depositRefund =
                await ensureAutomaticRefund({
                    orderId,
                    type:
                        RefundType.DEPOSIT_RETURN,
                    amount:
                        settlement.depositRefundAmount,
                    reason: "Refund rental deposit",
                    db: tx,
                });

            return {
                proposedAmount: 0,
                finalAmount: 0,
                requiresManagerApproval: false,
                ...breakdown,
                settlement,
                depositRefund,
            };
        }
        const existingRequest =
            await findLatestFeeApprovalRequest(
                orderId,
                tx
            );

        if (
            existingRequest?.status ===
            FeeApprovalStatus.PENDING
        ) {
            if (
                Number(existingRequest.proposedAmount) !==
                additionalCharge
            ) {
                throw new Error(
                    "FEE_APPROVAL_ALREADY_PENDING"
                );
            }

            return {
                proposedAmount:
                    additionalCharge,
                requiresManagerApproval: true,
                ...breakdown,
                approvalRequest: existingRequest,
                feeApprovalRequest: existingRequest,
                alreadyProposed: true,
            };
        }

        if (
            existingRequest?.status ===
                FeeApprovalStatus.APPROVED ||
            existingRequest?.status ===
                FeeApprovalStatus.ADJUSTED
        ) {
            return {
                proposedAmount:
                    Number(existingRequest.proposedAmount),
                finalAmount:
                    existingRequest.finalAmount == null
                        ? null
                        : Number(existingRequest.finalAmount),
                requiresManagerApproval: false,
                ...breakdown,
                approvalRequest: existingRequest,
                feeApprovalRequest: existingRequest,
                alreadyProposed: true,
            };
        }

        // Có phí phát sinh → kiểm tra xem có vượt quá ngưỡng phê duyệt không
        const approvalThreshold =
            Number(order.policy.approvalThreshold);

        const requiresManagerApproval =
            additionalCharge > approvalThreshold ||
            hasManagerRequiredIssue;

        if (requiresManagerApproval) {
            const approvalRequest =
                await createFeeApprovalRequest(
                    {
                        rentalOrderId: orderId,
                        proposedAmount:
                            additionalCharge,
                        finalAmount: null,
                        status: FeeApprovalStatus.PENDING,
                    },
                    tx
                );

            return {
                proposedAmount:
                    additionalCharge,
                requiresManagerApproval: true,
                ...breakdown,
                approvalRequest,
                feeApprovalRequest:
                    approvalRequest,
                alreadyProposed: false,
            };
        }
        const now = new Date();
        // Không vượt quá ngưỡng → tự động phê duyệt
        const approvalRequest =
            await createFeeApprovalRequest(
                {
                    rentalOrderId: orderId,
                    proposedAmount:
                        additionalCharge,
                    finalAmount:
                        additionalCharge,
                    status: FeeApprovalStatus.APPROVED,
                    decidedBy: staffId,
                    decidedAt: now,
                },
                tx
            );

        await updateRentalOrderSettlement(
            orderId,
            settlement,
            tx
        );

        const depositRefund =
            await ensureAutomaticRefund({
                orderId,
                type: RefundType.DEPOSIT_RETURN,
                amount:
                    settlement.depositRefundAmount,
                reason: "Refund rental deposit",
                db: tx,
            });

        return {
            proposedAmount:
                additionalCharge,
            finalAmount:
                additionalCharge,
            requiresManagerApproval: false,
            ...breakdown,
            settlement,
            approvalRequest,
            feeApprovalRequest:
                approvalRequest,
            alreadyProposed: false,
            depositRefund,
        };
            }, {
                isolationLevel: "Serializable",
                maxWait: 10000,
                timeout: 30000,
            });

            return await attachAutomaticRefundGatewayRequest(
                result,
                "depositRefund"
            );
        } catch (error) {
            const isTransactionConflict =
                error.code === "P2034" ||
                error.cause?.kind ===
                    "TransactionWriteConflict" ||
                error.cause?.originalCode === "40001";

            if (
                isTransactionConflict &&
                attempt < 2
            ) {
                continue;
            }

            throw error;
        }
    }
}

const completeRentalOrderIfReady = async (
    orderId
) => {
    return prisma.$transaction(async (tx) => {
        const order =
            await findRentalOrderForCompletion(
                orderId,
                tx
            );

        if (!order) {
            throw new Error("ORDER_NOT_FOUND");
        }

        if (order.status === RentalOrderStatus.COMPLETED) {
            return {
                completed: true,
                alreadyCompleted: true,
                order,
            };
        }

        if (
            order.status !==
            RentalOrderStatus.SETTLEMENT_PENDING
        ) {
            throw new Error("INVALID_ORDER_STATUS");
        }

        const refundAmount =
            Number(order.depositRefundAmount);

        const additionalPayment =
            Number(order.additionalPayment);

        // Kiểm tra refund cọc
        const successfulRefundAmount =
            order.payments.reduce(
                (total, payment) =>
                    total +
                    payment.refunds
                        .filter(
                            (refund) =>
                                refund.type ===
                                RefundType.DEPOSIT_RETURN &&
                                refund.status ===
                                RefundStatus.SUCCESS
                        )
                        .reduce(
                            (sum, refund) =>
                                sum +
                                Number(refund.amount),
                            0
                        ),
                0
            );

        const refundCompleted =
            refundAmount === 0 ||
            successfulRefundAmount >= refundAmount;

        // Kiểm tra khoản thanh toán bổ sung
        const successfulAdditionalPayment =
            order.payments
                .filter(
                    (payment) =>
                        payment.purpose ===
                        PaymentPurpose.ADDITIONAL &&
                        payment.status ===
                        PaymentStatus.SUCCESS
                )
                .reduce(
                    (total, payment) =>
                        total + Number(payment.amount),
                    0
                );

        const additionalPaymentCompleted =
            additionalPayment === 0 ||
            successfulAdditionalPayment >=
            additionalPayment;

        // Còn giao dịch chưa xong
        if (
            !refundCompleted ||
            !additionalPaymentCompleted
        ) {
            return {
                completed: false,
                refundCompleted,
                additionalPaymentCompleted,
            };
        }

        const orderItemIds = order.items.map(
            (item) => item.orderItemId
        );

        // Reservation ACTIVE → COMPLETED
        await completeReservations(
            orderItemIds,
            tx
        );

        // Order → COMPLETED
        const completedOrder =
            await updateRentalOrderStatus(
                orderId,
                RentalOrderStatus.COMPLETED,
                tx
            );

        await createOrderStatusHistory(
            {
                rentalOrderId: orderId,
                oldStatus:
                    RentalOrderStatus.SETTLEMENT_PENDING,
                newStatus:
                    RentalOrderStatus.COMPLETED,
                changedBy: null,
                changedAt: new Date(),
                reason: "Settlement completed",
            },
            tx
        );

        return {
            completed: true,
            order: completedOrder,
        };
    });
};

// Thay đổi trạng thái của RentalUnit
const changeRentalUnitStatus = async (
    rentalUnitId,
    newStatus,
    staffId,
    reason
) => {
    const normalizedReason = normalizeOptionalString(
        reason,
        "INVALID_RENTAL_UNIT_DATA"
    );

    return prisma.$transaction(async (tx) => {
        const rentalUnit = await findRentalUnitById(
            rentalUnitId,
            tx
        );

        if (!rentalUnit) {
            throw new Error("RENTAL_UNIT_NOT_FOUND");
        }

        const allowedTransitions = {
            RETURN_INSPECTION: [
                RentalUnitStatus.CLEANING,
                RentalUnitStatus.MAINTENANCE,
                RentalUnitStatus.DAMAGED,
            ],

            DAMAGED: [
                RentalUnitStatus.MAINTENANCE,
            ],

            CLEANING: [
                RentalUnitStatus.AVAILABLE,
            ],

            MAINTENANCE: [
                RentalUnitStatus.AVAILABLE,
            ],
        };

        const allowed =
            allowedTransitions[rentalUnit.status] ?? [];

        if (!allowed.includes(newStatus)) {
            throw new Error("INVALID_STATUS_TRANSITION");
        }

        const now = new Date();

        const updatedUnit =
            await updateRentalUnitStatus(
                rentalUnitId,
                newStatus,
                tx
            );

        await createRentalUnitStatusHistory(
            {
                rentalUnitId,
                oldStatus: rentalUnit.status,
                newStatus,
                changedBy: staffId,
                changedAt: now,
                reason: normalizedReason,
            },
            tx
        );

        return updatedUnit;
    });
};

// Quyết định phê duyệt phí phát sinh
const decideFeeApproval = async (
    feeApprovalRequestId,
    managerId,
    decision,
    finalAmount,
    decisionReason
) => {
    const normalizedDecisionReason =
        normalizeOptionalString(
            decisionReason,
            "INVALID_DECISION_REASON"
        );

    const result = await prisma.$transaction(async (tx) => {
        const request =
            await findFeeApprovalRequestById(
                feeApprovalRequestId,
                tx
            );

        if (!request) {
            throw new Error("FEE_APPROVAL_NOT_FOUND");
        }

        if (
            request.status !==
            FeeApprovalStatus.PENDING
        ) {
            throw new Error(
                "FEE_APPROVAL_ALREADY_PROCESSED"
            );
        }

        if (
            request.rentalOrder.status !==
            RentalOrderStatus.SETTLEMENT_PENDING
        ) {
            throw new Error("INVALID_ORDER_STATUS");
        }

        let resolvedAmount;

        if (
            decision === FeeApprovalStatus.APPROVED
        ) {
            resolvedAmount =
                Number(request.proposedAmount);
        }

        else if (
            decision === FeeApprovalStatus.ADJUSTED
        ) {
            if (
                finalAmount == null ||
                !Number.isFinite(Number(finalAmount)) ||
                Number(finalAmount) < 0
            ) {
                throw new Error(
                    "INVALID_FINAL_AMOUNT"
                );
            }

            if (!normalizedDecisionReason) {
                throw new Error(
                    "DECISION_REASON_REQUIRED"
                );
            }

            resolvedAmount = Number(finalAmount);
        }

        else if (
            decision === FeeApprovalStatus.REJECTED
        ) {
            resolvedAmount = 0;
        }

        else {
            throw new Error("INVALID_DECISION");
        }

        const now = new Date();

        const updatedRequest =
            await updateFeeApprovalRequest(
                feeApprovalRequestId,
                {
                    status: decision,
                    finalAmount: resolvedAmount,
                    decisionReason:
                        normalizedDecisionReason,
                    decidedBy: managerId,
                    decidedAt: now,
                },
                tx
            );

        // Tính lại settlement theo phí Manager đã chốt
        const depositAmount =
            Number(
                request.rentalOrder.depositAmount
            );

        const rentalAmount =
            Number(
                request.rentalOrder.rentalAmount
            );

        const settlement = {
            additionalCharge: resolvedAmount,

            depositRefundAmount: Math.max(
                depositAmount - resolvedAmount,
                0
            ),

            additionalPayment: Math.max(
                resolvedAmount - depositAmount,
                0
            ),

            finalCharge:
                rentalAmount + resolvedAmount,
        };

        await updateRentalOrderSettlement(
            request.rentalOrderId,
            settlement,
            tx
        );

        const depositRefund =
            await ensureAutomaticRefund({
                orderId: request.rentalOrderId,
                type: RefundType.DEPOSIT_RETURN,
                amount:
                    settlement.depositRefundAmount,
                reason: "Refund rental deposit",
                db: tx,
            });

        return {
            approvalRequest: updatedRequest,
            settlement,
            depositRefund,
        };
    });

    return attachAutomaticRefundGatewayRequest(
        result,
        "depositRefund"
    );
};

// Đánh dấu các đơn thuê quá hạn
const markOverdueRentalOrders = async () => {
    return prisma.$transaction(async (tx) => {
        const now = new Date();

        const orders =
            await findOverdueRentalOrders(
                now,
                tx
            );

        for (const order of orders) {
            await updateRentalOrderStatus(
                order.orderId,
                RentalOrderStatus.OVERDUE,
                tx
            );

            await createOrderStatusHistory(
                {
                    rentalOrderId: order.orderId,
                    oldStatus: RentalOrderStatus.RENTING,
                    newStatus: RentalOrderStatus.OVERDUE,
                    changedBy: null,
                    changedAt: now,
                    reason: "Rental order overdue",
                },
                tx
            );
        }

        return {
            overdueCount: orders.length,
        };
    });
};

const requestCancellation = async (
    orderId,
    customerId,
    reason
) => {
    const normalizedReason = normalizeRequiredString(
        reason,
        "CANCELLATION_REASON_REQUIRED"
    );

    return prisma.$transaction(async (tx) => {
        const order =
            await findOrderForCancellationRequest(
                orderId,
                customerId,
                tx
            );

        if (!order) {
            throw new Error("ORDER_NOT_FOUND");
        }

        const allowedStatuses = [
            RentalOrderStatus.CONFIRMED,
            RentalOrderStatus.PREPARING,
            RentalOrderStatus.READY_FOR_PICKUP,
        ];

        if (!allowedStatuses.includes(order.status)) {
            throw new Error(
                "CANCELLATION_REQUEST_NOT_ALLOWED"
            );
        }

        if (order.cancellationRequests.length > 0) {
            throw new Error(
                "CANCELLATION_ALREADY_REQUESTED"
            );
        }

        const now = new Date();

        const policy =
            await findActiveRentalPolicy(
                now,
                tx
            );

        if (!policy) {
            throw new Error("POLICY_NOT_FOUND");
        }

        const request =
            await createCancellationRequest(
                {
                    rentalOrderId: orderId,
                    policyId: policy.policyId,

                    reason: normalizedReason,

                    status:
                        CancellationRequestStatus.REQUESTED,

                    requestedBy: customerId,
                    requestedAt: now,
                },
                tx
            );

        return request;
    });
};

const rejectCancellationRequest = async (
    cancellationRequestId,
    managerId,
    decisionReason
) => {
    const normalizedDecisionReason =
        normalizeRequiredString(
            decisionReason,
            "DECISION_REASON_REQUIRED"
        );

    return prisma.$transaction(async (tx) => {
        const request =
            await findCancellationRequestForDecision(
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
            CancellationRequestStatus.REQUESTED
        ) {
            throw new Error(
                "CANCELLATION_REQUEST_ALREADY_PROCESSED"
            );
        }

        const updatedRequest =
            await updateCancellationRequest(
                cancellationRequestId,
                {
                    status:
                        CancellationRequestStatus.REJECTED,
                    decisionReason:
                        normalizedDecisionReason,
                    decidedBy: managerId,
                    decidedAt: new Date(),
                },
                tx
            );

        return updatedRequest;
    });
};

const calculateLateFee = ({
    rentalAmount,
    returnDueAt,
    actualReturnAt,
    lateFeePolicy,
}) => {
    if (!lateFeePolicy) {
        throw new Error(
            "LATE_FEE_POLICY_NOT_FOUND"
        );
    }

    const { // Cac tham số của lateFeePolicy
        basis, // "RENTAL_AMOUNT"
        gracePeriodHours, // số giờ miễn phí trễ
        unitHours, // số giờ tính phí trễ 1 đơn vị
        feeRateBpsPerUnit, // số phần nghìn phí trễ trên 1 đơn vị
        maxFeeRateBps, // số phần nghìn phí trễ tối đa trên tổng tiền thuê
        rounding, // HALF_UP_TO_VND - làm tròn lên 0.5 VND
    } = lateFeePolicy;

    // Kiểm tra các tham số của lateFeePolicy
    if (
        basis !== "RENTAL_AMOUNT" ||
        rounding !== "HALF_UP_TO_VND" ||
        !Number.isFinite(Number(gracePeriodHours)) ||
        Number(gracePeriodHours) < 0 ||
        !Number.isFinite(Number(unitHours)) ||
        Number(unitHours) <= 0 ||
        !Number.isFinite(
            Number(feeRateBpsPerUnit)
        ) ||
        Number(feeRateBpsPerUnit) < 0 ||
        !Number.isFinite(Number(maxFeeRateBps)) ||
        Number(maxFeeRateBps) < 0
    ) {
        throw new Error("INVALID_LATE_FEE_POLICY");
    }
    // Kiểm tra thời gian trả thực tế
    if (!actualReturnAt) {
        throw new Error(
            "ACTUAL_RETURN_TIME_NOT_FOUND"
        );
    }

    const amount = Number(rentalAmount);
    const dueAt = new Date(returnDueAt);
    const returnedAt = new Date(actualReturnAt);
    // Kiểm tra các tham số đầu vào
    if (
        !Number.isFinite(amount) ||
        amount < 0 ||
        Number.isNaN(dueAt.getTime()) ||
        Number.isNaN(returnedAt.getTime())
    ) {
        throw new Error("INVALID_LATE_FEE_INPUT");
    }
    // Tính thời gian hết hạn miễn phí trễ
    const graceExpiresAt =
        dueAt.getTime() +
        Number(gracePeriodHours) * 60 * 60 * 1000; // Tính thời gian hết hạn miễn phí trễ = thời gian trả dự kiến + số giờ miễn phí trễ

    if (returnedAt.getTime() <= graceExpiresAt) {
        return {
            lateFee: 0,
            lateUnits: 0,
        };
    }
    // Tính số giờ trễ thực tế
    const lateMs =
        returnedAt.getTime() - graceExpiresAt;
    // Tính số đơn vị trễ = số giờ trễ thực tế / số giờ tính phí trễ 1 đơn vị, làm tròn lên
    const unitMs =
        Number(unitHours) * 60 * 60 * 1000;

    const lateUnits = Math.ceil(lateMs / unitMs);

    const rawLateFee =
        amount *
        Number(feeRateBpsPerUnit) *
        lateUnits /
        10000;

    const maxLateFee =
        amount *
        Number(maxFeeRateBps) /
        10000;

    const cappedLateFee = Math.min(
        rawLateFee,
        maxLateFee
    );

    const lateFee = Math.floor(cappedLateFee + 0.5);

    return {
        lateFee,
        lateUnits,
    };
};

const calculateCancellationFee = ({
    rentalAmount,
    totalPaid,
    rentalStartAt,
    requestedAt,
    paidAt,
    cancellationPolicy,
}) => {
    if (!cancellationPolicy) {
        throw new Error(
            "CANCELLATION_POLICY_NOT_FOUND"
        );
    }

    if (!paidAt) {
        throw new Error(
            "UPFRONT_PAYMENT_NOT_FOUND"
        );
    }

    const policy = cancellationPolicy;

    if (
        policy.basis !== "RENTAL_AMOUNT" ||
        !Array.isArray(policy.rules)
    ) {
        throw new Error(
            "INVALID_CANCELLATION_POLICY"
        );
    }

    const rentalAmountValue =
        Number(rentalAmount);

    const totalPaidValue =
        Number(totalPaid);

    const requestTime =
        new Date(requestedAt);

    const rentalStart =
        new Date(rentalStartAt);

    const paidTime =
        new Date(paidAt);

    const gracePeriodHours =
        Number(policy.gracePeriodHours ?? 0);

    const graceExpiresAt =
        new Date(
            paidTime.getTime() +
            gracePeriodHours * 60 * 60 * 1000
        );

    if (requestTime <= graceExpiresAt) {
        return {
            cancellationFee: 0,
            cancellationRefundAmount:
                totalPaidValue,
            feeRateBps: 0,
            withinGracePeriod: true,
        };
    }

    const hoursBeforeRental = Math.max(
        0,
        (
            rentalStart.getTime() -
            requestTime.getTime()
        ) /
        (1000 * 60 * 60)
    );

    const rules = [...policy.rules].sort(
        (a, b) =>
            Number(b.minHoursBeforeRental) -
            Number(a.minHoursBeforeRental)
    );

    const matchedRule = rules.find(
        (rule) =>
            hoursBeforeRental >=
            Number(rule.minHoursBeforeRental)
    );

    if (!matchedRule) {
        throw new Error(
            "CANCELLATION_RULE_NOT_FOUND"
        );
    }

    const feeRateBps =
        Number(matchedRule.feeRateBps);

    const rawFee =
        rentalAmountValue *
        feeRateBps /
        10000;

    const calculatedFee =
        Math.floor(rawFee + 0.5);

    const cancellationFee =
        Math.min(
            calculatedFee,
            totalPaidValue
        );

    const cancellationRefundAmount =
        Math.max(
            totalPaidValue -
            cancellationFee,
            0
        );

    return {
        cancellationFee,
        cancellationRefundAmount,
        feeRateBps,
        withinGracePeriod: false,
        hoursBeforeRental,
    };
};

const approveCancellationRequest = async (
    cancellationRequestId,
    managerId,
    decisionReason
) => {
    const normalizedDecisionReason =
        normalizeOptionalString(
            decisionReason,
            "INVALID_DECISION_REASON"
        );

    const result = await prisma.$transaction(
        async (tx) => {
            const request =
                await findCancellationRequestForDecision(
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
                CancellationRequestStatus.REQUESTED
            ) {
                throw new Error(
                    "CANCELLATION_REQUEST_ALREADY_PROCESSED"
                );
            }

            const order = request.rentalOrder;

            const allowedStatuses = [
                RentalOrderStatus.CONFIRMED,
                RentalOrderStatus.PREPARING,
                RentalOrderStatus.READY_FOR_PICKUP,
            ];

            if (!allowedStatuses.includes(order.status)) {
                throw new Error(
                    "INVALID_ORDER_STATUS"
                );
            }

            const upfrontPayment =
                order.payments[0];

            const {
                cancellationFee,
                cancellationRefundAmount,
            } = calculateCancellationFee({
                rentalAmount:
                    order.rentalAmount,

                totalPaid:
                    order.totalPaid,

                rentalStartAt:
                    order.rentalStartAt,

                requestedAt:
                    request.requestedAt,

                paidAt:
                    upfrontPayment?.paidAt,

                cancellationPolicy:
                    request.policy
                        ?.cancellationPolicy,
            });

            const now = new Date();

            const updatedRequest =
                await updateCancellationRequest(
                    cancellationRequestId,
                    {
                        status:
                            CancellationRequestStatus.APPROVED,

                        cancellationFee,
                        refundAmount:
                            cancellationRefundAmount,

                        decisionReason:
                            normalizedDecisionReason,

                        decidedBy: managerId,
                        decidedAt: now,
                    },
                    tx
                );

            const orderItemIds =
                order.items.map(
                    (item) => item.orderItemId
                );

            await cancelConfirmedReservations(
                orderItemIds,
                tx
            );

            await cancelRentalOrder(
                order.orderId,
                {
                    cancellationReason:
                        request.reason,

                    cancelledBy: managerId,
                    cancelledAt: now,
                },
                tx
            );

            const settledOrder =
                await updateRentalOrderSettlement(
                    order.orderId,
                    {
                        cancellationFee,

                        cancellationRefundAmount,

                        finalCharge:
                            cancellationFee,

                        depositRefundAmount: 0,

                        additionalPayment: 0,
                    },
                    tx
                );

            const cancellationRefund =
                await ensureAutomaticRefund({
                    orderId: order.orderId,
                    paymentId:
                        upfrontPayment.paymentId,
                    type:
                        RefundType.CANCELLATION_REFUND,
                    amount:
                        cancellationRefundAmount,
                    reason: request.reason,
                    db: tx,
                });

            await createOrderStatusHistory(
                {
                    rentalOrderId:
                        order.orderId,

                    oldStatus:
                        order.status,

                    newStatus:
                        RentalOrderStatus.CANCELLED,

                    changedBy:
                        managerId,

                    changedAt:
                        now,

                    reason:
                        normalizedDecisionReason ||
                        "Cancellation request approved",
                },
                tx
            );

            return {
                cancellationRequest:
                    updatedRequest,

                order:
                    settledOrder,

                cancellationFee,

                refundAmount:
                    cancellationRefundAmount,

                cancellationRefund,
            };
        },
        {
            isolationLevel: "Serializable",
            maxWait: 10000,
            timeout: 30000,
        }
    );

    return attachAutomaticRefundGatewayRequest(
        result,
        "cancellationRefund"
    );
};

const getPendingCancellationRequests = async () => {
    return findPendingCancellationRequests();
};

const expirePendingPaymentOrdersInTransaction = async (
    db,
    now
) => {
    const orders =
        await findExpiredPendingPaymentOrders(
            now,
            db
        );

    let expiredCount = 0;

    for (const order of orders) {
        const expiredOrder =
            await expirePendingPaymentOrder(
                order.orderId,
                db
            );

        if (expiredOrder.count === 0) {
            continue;
        }

        const orderItemIds = order.items.map(
            (item) => item.orderItemId
        );

        await expireTemporaryReservations(
            orderItemIds,
            now,
            db
        );

        await createOrderStatusHistory(
            {
                rentalOrderId: order.orderId,
                oldStatus:
                    RentalOrderStatus.PENDING_PAYMENT,
                newStatus:
                    RentalOrderStatus.EXPIRED,
                changedBy: null,
                changedAt: now,
                reason: "Temporary hold expired",
            },
            db
        );

        expiredCount += 1;
    }

    return {
        expiredCount,
    };
};

// Tự động hủy các đơn thuê đang chờ thanh toán quá hạn
const expirePendingPaymentOrders = async (
    db = prisma,
    now = new Date()
) => {
    if (db !== prisma) {
        return expirePendingPaymentOrdersInTransaction(
            db,
            now
        );
    }

    const result = await prisma.$transaction(
        (tx) =>
            expirePendingPaymentOrdersInTransaction(
                tx,
                now
            ),
        {
        // Tăng thời gian chờ và timeout để xử lý nhiều đơn cùng lúc
            maxWait: 10000,
            timeout: 30000,
        }
    );

    return result;
};

const replaceRentalUnit = async ( // Thay thế đơn vị thuê (RentalUnit) trong một Reservation
    orderId,
    reservationId,
    staffId,
    replacementReason
) => {
    const normalizedReplacementReason =
        normalizeRequiredString(
            replacementReason,
            "REPLACEMENT_REASON_REQUIRED"
        );

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            return await prisma.$transaction(
                async (tx) => {
                    const reservation =
                        await findReservationForReplacement(
                            reservationId,
                            orderId,
                            tx
                        );

                    if (!reservation) {
                        throw new Error(
                            "RESERVATION_NOT_FOUND"
                        );
                    }

                    const order =
                        reservation.rentalOrderItem.order;

                    if (
                        order.status !==
                        RentalOrderStatus.PREPARING
                    ) {
                        throw new Error(
                            "INVALID_ORDER_STATUS"
                        );
                    }

                    if (
                        order.cancellationRequests.length > 0
                    ) {
                        throw new Error(
                            "CANCELLATION_PENDING"
                        );
                    }

                    if (
                        reservation.status !==
                        ReservationStatus.CONFIRMED
                    ) {
                        throw new Error(
                            "INVALID_RESERVATION_STATUS"
                        );
                    }

                    const orderItem =
                        reservation.rentalOrderItem;

                    // Dùng đúng blocked interval cũ,
                    // không cộng buffer lần nữa
                    const availableUnits =
                        await findAvailableRentalUnits(
                            orderItem.garmentId,
                            orderItem.requestedSize,
                            reservation.blockedStartAt,
                            reservation.blockedEndAt,
                            tx
                        );

                    if (availableUnits.length === 0) {
                        throw new Error(
                            "REPLACEMENT_UNIT_NOT_FOUND"
                        );
                    }

                    const replacementUnit =
                        availableUnits[0];

                    // Reservation cũ → RELEASED
                    const releasedReservation =
                        await releaseReservationForReplacement(
                            reservationId,
                            normalizedReplacementReason,
                            staffId,
                            new Date(),
                            tx
                        );

                    // Tạo Reservation mới cho cùng OrderItem
                    const newReservation =
                        await createReservation(
                            {
                                rentalOrderItemId:
                                    orderItem.orderItemId,

                                rentalUnitId:
                                    replacementUnit.rentalUnitId,

                                status:
                                    ReservationStatus.CONFIRMED,

                                blockedStartAt:
                                    reservation.blockedStartAt,

                                blockedEndAt:
                                    reservation.blockedEndAt,

                                holdExpiresAt: null,

                                // Unit mới phải được prepare lại
                                preparationCondition: null,
                                preparationNotes: null,
                                preparationImages: null,
                                preparedAt: null,
                            },
                            tx
                        );

                    return {
                        oldReservation:
                            releasedReservation,

                        newReservation,

                        replacementUnit,

                        replacedBy: staffId,
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
const cancelOrderByStore = async (
    orderId,
    managerId,
    reason
) => {
    const normalizedReason = normalizeRequiredString(
        reason,
        "CANCELLATION_REASON_REQUIRED"
    );

    return prisma.$transaction(
        async (tx) => {
            const order =
                await findOrderForStoreCancellation(
                    orderId,
                    tx
                );

            if (!order) {
                throw new Error(
                    "ORDER_NOT_FOUND"
                );
            }

            const allowedStatuses = [
                RentalOrderStatus.CONFIRMED,
                RentalOrderStatus.PREPARING,
                RentalOrderStatus.READY_FOR_PICKUP,
            ];

            if (
                !allowedStatuses.includes(
                    order.status
                )
            ) {
                throw new Error(
                    "STORE_CANCELLATION_NOT_ALLOWED"
                );
            }

            const now = new Date();

            const refundAmount =
                Number(order.totalPaid);

            const orderItemIds =
                order.items.map(
                    (item) => item.orderItemId
                );

            // Reservation hiện hành → CANCELLED
            await cancelConfirmedReservations(
                orderItemIds,
                tx
            );

            // Order → CANCELLED
            const cancelledOrder =
                await cancelRentalOrder(
                    orderId,
                    {
                        cancellationReason:
                            normalizedReason,
                        cancelledBy: managerId,
                        cancelledAt: now,
                    },
                    tx
                );

            // Cửa hàng có lỗi
            // → không thu cancellation fee
            // → hoàn toàn bộ số đã thu
            await updateRentalOrderSettlement(
                orderId,
                {
                    cancellationFee: 0,
                    cancellationRefundAmount:
                        refundAmount,

                    depositRefundAmount: 0,
                    additionalPayment: 0,
                    finalCharge: 0,
                },
                tx
            );

            await createOrderStatusHistory(
                {
                    rentalOrderId: orderId,
                    oldStatus: order.status,
                    newStatus:
                        RentalOrderStatus.CANCELLED,
                    changedBy: managerId,
                    changedAt: now,
                    reason: normalizedReason,
                },
                tx
            );

            return {
                order: cancelledOrder,
                refundAmount,
                refundRequired:
                    refundAmount > 0,
            };
        },
        {
            isolationLevel: "Serializable",
            maxWait: 10000,
            timeout: 30000,
        }
    );
};
export { createRental, getRentalOrders, getRentalOrderDetail, getRentalOrderHistory, startPreparingRentalOrder, prepareReservation, handoverRentalOrder, receiveRentalReturn, inspectRentalOrderItem, settleRentalOrder, completeRentalOrderIfReady, changeRentalUnitStatus, decideFeeApproval, markOverdueRentalOrders, requestCancellation, rejectCancellationRequest, approveCancellationRequest, getPendingCancellationRequests, expirePendingPaymentOrders, replaceRentalUnit, cancelOrderByStore };
