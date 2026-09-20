import prisma from "../../config/prisma.js";
import { resolveRentalEvidence } from "./rentalEvidence.storage.js";
import {
    getCart,
    removeCheckedOutCartItems,
} from "../cart/cart.service.js"
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
    recordDirectDeposit,
    confirmAdditionalPaymentReceived,
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
    findRentalOrderForCompletion,
    findRentalUnitById,
    updateRentalUnitStatus,
    markRentalUnitAsPreparing,
    updateFeeApprovalRequest,
    findFeeApprovalRequestById,
    findFeeApprovalRequests,
    findOverdueRentalOrders,
    findExpiredPendingPaymentOrders,
    expireTemporaryReservations,
    expirePendingPaymentOrder,
    findReservationForReplacement,
    releaseReservationForReplacement,
    findOrderForPreHandoverResolution,
    releaseCurrentReservations,
    markOrderTerminalBeforeHandover,
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
    DepositCollectionMethod,
    PaymentPurpose,
    PaymentStatus,
    UserRole,
} from "../../generated/prisma/client.ts";
import { findActiveRentalPolicy, findAvailableRentalUnits } from "../availability/availability.repository.js";
import {
    createRefund,
    findLatestRefundByOrderAndType,
    findPaymentByPurposeAndStatus,
    findSuccessfulRentalPayment,
} from "../payment/payment.repository.js";
import {
    createRefundRequest,
} from "../payment/gateway/paymentGateway.js";
import { UUID_REGEX } from "../../utils/validation.js";
import { calculateSettlementAmounts } from "../../utils/settlement.js";
import {
    assertNoShowEligible,
    assertPickupWindowOpen,
    assertReturnWithinBusinessHours,
    getRentalDayCount,
} from "../../utils/rentalPeriod.js";

const RENTAL_UNIT_STATUS_TRANSITIONS = {
    AVAILABLE: [
        RentalUnitStatus.MAINTENANCE,
        RentalUnitStatus.DAMAGED,
    ],
    PREPARING: [
        RentalUnitStatus.MAINTENANCE,
        RentalUnitStatus.DAMAGED,
    ],
    RETURN_INSPECTION: [
        RentalUnitStatus.CLEANING,
        RentalUnitStatus.MAINTENANCE,
        RentalUnitStatus.DAMAGED,
    ],
    DAMAGED: [RentalUnitStatus.MAINTENANCE],
    CLEANING: [RentalUnitStatus.AVAILABLE],
    MAINTENANCE: [RentalUnitStatus.AVAILABLE],
};

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

    let payment = null;

    if (type === RefundType.DEPOSIT_RETURN) {
        payment = await findPaymentByPurposeAndStatus(
            orderId,
            PaymentPurpose.DEPOSIT,
            PaymentStatus.SUCCEEDED,
            db
        );
    } else if (type === RefundType.RENTAL_REFUND) {
        payment = paymentId
            ? { paymentId }
            : await findSuccessfulRentalPayment(
                orderId,
                db
            );
    }

    if (
        !payment &&
        type === RefundType.RENTAL_REFUND
    ) {
        throw new Error(
            "RENTAL_PAYMENT_NOT_FOUND"
        );
    }

    const existingRefund =
        await findLatestRefundByOrderAndType(
            orderId,
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
            rentalOrderId: orderId,
            paymentId: payment?.paymentId ?? null,
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

const buildRentalOrderCreateData = ({
    customerId,
    policy,
    rentalStartAt,
    returnDueAt,
    pickupInfo,
    returnInfo,
    rentalAmount,
    depositAmount,
}) => ({
    customerId,
    policyId: policy.policyId,
    rentalStartAt,
    returnDueAt,
    pickupInfo,
    returnInfo,
    status: RentalOrderStatus.PENDING_PAYMENT,
    rentalAmount,
    depositAmount,
    upfrontAmount: rentalAmount,
});

const normalizeSelectedCartItemIds = (selectedCartItemIds) => {
    if (
        !Array.isArray(selectedCartItemIds) ||
        selectedCartItemIds.length === 0
    ) {
        throw new Error("SELECTED_CART_ITEMS_REQUIRED");
    }

    if (
        selectedCartItemIds.some(
            (cartItemId) =>
                typeof cartItemId !== "string" ||
                !UUID_REGEX.test(cartItemId)
        )
    ) {
        throw new Error("INVALID_CART_ITEM_ID");
    }

    if (
        new Set(selectedCartItemIds).size !==
        selectedCartItemIds.length
    ) {
        throw new Error("DUPLICATE_CART_ITEM_IDS");
    }

    return selectedCartItemIds;
};

const selectCartItemsForCheckout = (
    cart,
    selectedCartItemIds
) => {
    const itemsById = new Map(
        cart.items.map((item) => [item.cartItemId, item])
    );
    const selectedItems = selectedCartItemIds.map(
        (cartItemId) => itemsById.get(cartItemId)
    );

    if (selectedItems.some((item) => !item)) {
        throw new Error("CART_ITEM_NOT_FOUND");
    }

    return selectedItems;
};

const createRental = async (
    customerId,
    pickupInfo,
    returnInfo,
    selectedCartItemIds,
    expectedRentalAmount,
    db = prisma
) => {
    if (expectedRentalAmount !== undefined && (
        typeof expectedRentalAmount !== "number" ||
        !Number.isFinite(expectedRentalAmount) || expectedRentalAmount <= 0
    )) {
        throw new Error("INVALID_EXPECTED_RENTAL_AMOUNT");
    }
    const normalizedPickupInfo = normalizeRequiredString(
        pickupInfo,
        "RENTAL_INFO_REQUIRED"
    );
    const normalizedReturnInfo = normalizeRequiredString(
        returnInfo,
        "RENTAL_INFO_REQUIRED"
    );
    const normalizedCartItemIds =
        normalizeSelectedCartItemIds(selectedCartItemIds);
    // Kiểm tra thong tin nhận và trả hàng
    try {
        return db.$transaction(async (tx) => {
            const cart = await getCart(customerId, tx);

            if (!cart) {
                throw new Error("CART_NOT_FOUND");
            }

            if (cart.items.length === 0) {
                throw new Error("CART_EMPTY");
            }

            if (!cart.rentalStartAt || !cart.returnDueAt) {
                throw new Error("RENTAL_PERIOD_REQUIRED");
            }

            const rentalDays = getRentalDayCount(
                cart.rentalStartAt,
                cart.returnDueAt
            );

            const selectedItems = selectCartItemsForCheckout(
                cart,
                normalizedCartItemIds
            );
            const allocations = []; // Mảng để lưu trữ thông tin về các đơn vị cho thuê được phân bổ cho từng mục trong giỏ hàng

            let rentalAmount = 0; // Biến để tính tổng số tiền thuê
            let depositAmount = 0; // Biến để tính tổng số tiền thuê và tiền đặt cọc
            let policy = null; // Biến để lưu trữ chính sách thuê hiện tại

            for (const item of selectedItems) {
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
                // rentalPrice is the daily rate; deposits are charged per unit only.
                rentalAmount += Number(item.garment.rentalPrice) * rentalDays * item.quantity;
                depositAmount += Number(item.garment.depositAmount) * item.quantity;
            }
            if (expectedRentalAmount !== undefined && rentalAmount !== expectedRentalAmount) {
                throw new Error("RENTAL_PRICE_CHANGED");
            }
            const now = new Date();
            const holdExpireAt = new Date(now.getTime() + policy.holdDuration * 60 * 1000); // Thoi gian het han = thoi diem hien tai + thoi gian hold (phut) * 60 * 1000 (chuyen sang milisecond)
            // Tạo đơn đặt hàng thuê mới trong cơ sở dữ liệu
            const order = await createRentalOrder(
                buildRentalOrderCreateData({
                    customerId,
                    policy,
                    rentalStartAt: cart.rentalStartAt,
                    returnDueAt: cart.returnDueAt,
                    pickupInfo: normalizedPickupInfo,
                    returnInfo: normalizedReturnInfo,
                    rentalAmount,
                    depositAmount,
                }),
                tx
            )
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

            await removeCheckedOutCartItems(
                cart.cartId,
                normalizedCartItemIds,
                tx
            );

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

        const now = assertPickupWindowOpen(order);
        const updateOrder = await updateRentalOrderStatus(orderId, RentalOrderStatus.PREPARING, tx);
        await createOrderStatusHistory({
            rentalOrderId: orderId,
            oldStatus: RentalOrderStatus.CONFIRMED,
            newStatus: RentalOrderStatus.PREPARING,
            changedBy: staffId,
            changedAt: now,
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

        assertPickupWindowOpen(order);

        // 3. Tìm Reservation thuộc đúng Order
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
}, { db = prisma, resolveEvidence = resolveRentalEvidence } = {}) => {
    const order = await findRentalOrderDetail(
        orderId, db
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

    return resolveEvidence(order, orderId);
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
    items,
    depositCollectionMethod,
    collectedDepositAmount
) => {
    const normalizedNationalId = normalizeRequiredString(
        nationalId,
        "NATIONAL_ID_REQUIRED",
        20
    );

    if (!Array.isArray(items) || items.length === 0) {
        throw new Error("INVALID_HANDOVER_ITEMS");
    }

    if (
        !Object.values(DepositCollectionMethod).includes(
            depositCollectionMethod
        )
    ) {
        throw new Error("INVALID_DEPOSIT_COLLECTION_METHOD");
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

        assertPickupWindowOpen(order);

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

        const requiredDeposit = Number(
            order.depositAmount
        );

        if (
            depositCollectionMethod ===
            DepositCollectionMethod.DIRECT
        ) {
            const directAmount = Number(
                collectedDepositAmount
            );

            if (
                !Number.isFinite(directAmount) ||
                directAmount !== requiredDeposit
            ) {
                throw new Error("DEPOSIT_AMOUNT_MISMATCH");
            }

            if (Number(order.collectedDepositAmount) === 0) {
                await recordDirectDeposit(
                    orderId,
                    directAmount,
                    now,
                    tx
                );
            } else if (
                Number(order.collectedDepositAmount) !==
                    requiredDeposit ||
                order.depositCollectionMethod !==
                    DepositCollectionMethod.DIRECT
            ) {
                throw new Error("DEPOSIT_ALREADY_COLLECTED");
            }
        } else if (
            Number(order.collectedDepositAmount) !==
                requiredDeposit ||
            order.depositCollectionMethod !==
                DepositCollectionMethod.PAYMENT_GATEWAY ||
            !order.depositCollectedAt
        ) {
            throw new Error("DEPOSIT_NOT_COLLECTED");
        }

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
    staffId,
    receivedAt = new Date(),
    db = prisma
) => {
    // Validate before opening the transaction so an out-of-hours return
    // cannot leave any partial order, unit, reservation, or history state.
    const now = assertReturnWithinBusinessHours(receivedAt);

    return db.$transaction(async (tx) => {
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
    },
    db = prisma
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

    return db.$transaction(async (tx) => {
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

        // Buffer completion releases the calendar, not the obligation to inspect.
        // RELEASED replacements and EXPIRED holds were never handed over.
        const candidates =
            orderItem.reservations.filter(
                (reservation) =>
                    reservation.status ===
                    ReservationStatus.ACTIVE ||
                    reservation.status === ReservationStatus.COMPLETED
            );

        if (!order.actualReturnAt || candidates.length !== 1) {
            throw new Error(
                "INSPECTION_RESERVATION_NOT_FOUND"
            );
        }
        const [reservation] = candidates;

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
            rentalStartAt: order.rentalStartAt,
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

        const collectedDepositAmount = Number(
            order.collectedDepositAmount
        );
        const rentalAmount = Number(order.rentalAmount);

        const settlement = calculateSettlementAmounts({
            rentalAmount,
            collectedDepositAmount,
            additionalCharge,
        });

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

            const response = await attachAutomaticRefundGatewayRequest(
                result,
                "depositRefund"
            );

            if (!result.requiresManagerApproval) {
                response.completion =
                    await completeRentalOrderIfReady(orderId);
            }

            return response;
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
    orderId,
    db = prisma
) => {
    return db.$transaction(async (tx) => {
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
        const successfulRefundAmount = order.refunds
            .filter(
                (refund) =>
                    refund.type ===
                        RefundType.DEPOSIT_RETURN &&
                    refund.status ===
                        RefundStatus.SUCCEEDED
            )
            .reduce(
                (total, refund) =>
                    total + Number(refund.amount),
                0
            );

        const refundCompleted =
            refundAmount === 0 ||
            successfulRefundAmount >= refundAmount;

        // Kiểm tra khoản thanh toán bổ sung
        const expectedTotalPaid =
            Number(order.upfrontAmount) +
            Number(order.collectedDepositAmount) +
            additionalPayment;
        const additionalPaymentCompleted =
            additionalPayment === 0 ||
            Number(order.totalPaid) >= expectedTotalPaid;

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

        const now = new Date();

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
                changedAt: now,
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

        const allowed =
            RENTAL_UNIT_STATUS_TRANSITIONS[
                rentalUnit.status
            ] ?? [];

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
        const collectedDepositAmount =
            Number(
                request.rentalOrder.collectedDepositAmount
            );

        const rentalAmount =
            Number(
                request.rentalOrder.rentalAmount
            );

        const settlement = calculateSettlementAmounts({
            rentalAmount,
            collectedDepositAmount,
            additionalCharge: resolvedAmount,
        });

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

    const response = await attachAutomaticRefundGatewayRequest(
        result,
        "depositRefund"
    );

    response.completion = await completeRentalOrderIfReady(
        result.approvalRequest.rentalOrderId
    );

    return response;
};

const getFeeApprovalRequests = async (
    status = null,
    { db = prisma, resolveEvidence = resolveRentalEvidence } = {}
) => {
    if (
        status &&
        !Object.values(FeeApprovalStatus).includes(status)
    ) {
        throw new Error("INVALID_FEE_APPROVAL_STATUS");
    }

    const requests = await findFeeApprovalRequests(status, db);
    const result = [];
    for (const request of requests) {
        result.push({
            ...request,
            rentalOrder: await resolveEvidence(request.rentalOrder, request.rentalOrder.orderId),
        });
    }
    return result;
};

// Đánh dấu các đơn thuê quá hạn
const markOverdueRentalOrders = async (now = new Date(), db = prisma) => {
    return db.$transaction(async (tx) => {

        const orders =
            await findOverdueRentalOrders(
                now,
                tx
            );

        let overdueCount = 0;
        for (const order of orders) {
            // Do not overwrite a return or duplicate another worker's history.
            const updated = await tx.rentalOrder.updateMany({
                where: {
                    orderId: order.orderId,
                    status: RentalOrderStatus.RENTING,
                    actualReturnAt: null,
                    returnDueAt: { lt: now },
                },
                data: { status: RentalOrderStatus.OVERDUE },
            });
            if (!updated.count) continue;
            overdueCount += 1;

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
            overdueCount,
        };
    });
};

const calculateLateFee = ({
    rentalAmount,
    rentalStartAt,
    returnDueAt,
    actualReturnAt,
    lateFeePolicy,
}) => {
    if (!lateFeePolicy) {
        throw new Error("LATE_FEE_POLICY_NOT_FOUND");
    }

    const policy = lateFeePolicy;
    if (
        !["RENTAL_AMOUNT", "DAILY_RENTAL_AMOUNT"].includes(policy.basis) ||
        policy.timezone !== "Asia/Ho_Chi_Minh" ||
        Number(policy.dueHour) !== 18 ||
        Number(policy.businessStartHour) !== 8 ||
        Number(policy.halfDayCutoffHour) !== 12 ||
        Number(policy.businessEndHour) !== 18 ||
        Number(policy.morningMultiplier) !== 0.5 ||
        Number(policy.afternoonMultiplier) !== 1 ||
        policy.rounding !== "HALF_UP_TO_VND"
    ) {
        throw new Error("INVALID_LATE_FEE_POLICY");
    }

    if (!actualReturnAt) {
        throw new Error("ACTUAL_RETURN_TIME_NOT_FOUND");
    }

    const amount = Number(rentalAmount);
    const dueAt = new Date(returnDueAt);
    const returnedAt = new Date(actualReturnAt);

    if (
        !Number.isFinite(amount) ||
        amount < 0 ||
        Number.isNaN(dueAt.getTime()) ||
        Number.isNaN(returnedAt.getTime())
    ) {
        throw new Error("INVALID_LATE_FEE_INPUT");
    }

    assertReturnWithinBusinessHours(returnedAt);

    // Derive from the order's immutable charged total/dates, never today's
    // garment prices. Legacy policies retain their original full-period basis.
    const dailyBasis = policy.basis === "DAILY_RENTAL_AMOUNT";
    const feeBase = dailyBasis
        ? amount / getRentalDayCount(rentalStartAt, returnDueAt)
        : amount;

    if (returnedAt <= dueAt) {
        return {
            lateFee: 0,
            lateUnits: 0,
        };
    }

    const vietnamTimeParts = new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "Asia/Ho_Chi_Minh",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
        }
    ).formatToParts(returnedAt);
    const getPart = (type) => Number(
        vietnamTimeParts.find(
            (part) => part.type === type
        )?.value
    );
    const returnedHour = getPart("hour");

    const dateFormatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    const dayNumber = (date) => {
        const parts = dateFormatter.formatToParts(date);
        const value = (type) => Number(
            parts.find((part) => part.type === type)?.value
        );
        const year = value("year");
        const month = value("month");
        const day = value("day");
        return Date.UTC(year, month - 1, day) /
            (24 * 60 * 60 * 1000);
    };
    const overdueDay =
        dayNumber(returnedAt) - dayNumber(dueAt);

    if (overdueDay < 1) {
        throw new Error("INVALID_LATE_FEE_INPUT");
    }

    const isMorning = dailyBasis
        ? returnedHour < 12 || (
            returnedHour === 12 && getPart("minute") === 0 &&
            returnedAt.getUTCSeconds() === 0 && returnedAt.getUTCMilliseconds() === 0
        )
        : returnedHour < 12;
    const lateUnits = isMorning
        ? overdueDay - 0.5
        : overdueDay;
    const lateFee = Math.floor(
        feeBase * lateUnits + 0.5
    );

    return {
        lateFee,
        lateUnits,
    };
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
                            RentalOrderStatus.PREPARING &&
                        order.status !==
                            RentalOrderStatus.READY_FOR_PICKUP
                    ) {
                        throw new Error(
                            "INVALID_ORDER_STATUS"
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

                    if (
                        order.status ===
                        RentalOrderStatus.READY_FOR_PICKUP
                    ) {
                        const now = new Date();
                        await updateRentalOrderStatus(
                            orderId,
                            RentalOrderStatus.PREPARING,
                            tx
                        );
                        await createOrderStatusHistory(
                            {
                                rentalOrderId: orderId,
                                oldStatus:
                                    RentalOrderStatus.READY_FOR_PICKUP,
                                newStatus:
                                    RentalOrderStatus.PREPARING,
                                changedBy: staffId,
                                changedAt: now,
                                reason:
                                    "Chuẩn bị lại RentalUnit thay thế",
                            },
                            tx
                        );
                    }

                    if (
                        ![
                            RentalUnitStatus.DAMAGED,
                            RentalUnitStatus.MAINTENANCE,
                        ].includes(
                            reservation.rentalUnit.status
                        )
                    ) {
                        throw new Error(
                            "REPLACEMENT_UNIT_NOT_UNAVAILABLE"
                        );
                    }

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

const markRentalOrderNoShow = async (
    orderId,
    staffId
) => prisma.$transaction(async (tx) => {
    const order = await findOrderForPreHandoverResolution(
        orderId,
        tx
    );

    if (!order) {
        throw new Error("ORDER_NOT_FOUND");
    }

    const now = assertNoShowEligible(order);
    const itemIds = order.items.map(
        (item) => item.orderItemId
    );
    const preparedUnits = order.items.flatMap(
        (item) => item.reservations
            .filter(
                (reservation) =>
                    reservation.status ===
                    ReservationStatus.CONFIRMED &&
                    reservation.rentalUnit.status ===
                    RentalUnitStatus.PREPARING
            )
            .map((reservation) => reservation.rentalUnitId)
    );

    await releaseCurrentReservations(itemIds, tx);

    if (preparedUnits.length > 0) {
        await tx.rentalUnit.updateMany({
            where: {
                rentalUnitId: { in: preparedUnits },
                status: RentalUnitStatus.PREPARING,
            },
            data: { status: RentalUnitStatus.AVAILABLE },
        });

        for (const rentalUnitId of preparedUnits) {
            await createRentalUnitStatusHistory(
                {
                    rentalUnitId,
                    oldStatus: RentalUnitStatus.PREPARING,
                    newStatus: RentalUnitStatus.AVAILABLE,
                    changedBy: staffId,
                    changedAt: now,
                    reason:
                        "Giải phóng RentalUnit do khách không đến nhận",
                },
                tx
            );
        }
    }

    const updatedOrder =
        await markOrderTerminalBeforeHandover(
            orderId,
            RentalOrderStatus.NO_SHOW,
            tx
        );
    await createOrderStatusHistory(
        {
            rentalOrderId: orderId,
            oldStatus: order.status,
            newStatus: RentalOrderStatus.NO_SHOW,
            changedBy: staffId,
            changedAt: now,
            reason: "Khách hàng không đến nhận trang phục",
        },
        tx
    );

    return updatedOrder;
});

const markRentalOrderFulfillmentFailed = async (
    orderId,
    reservationId,
    staffId,
    reason
) => {
    const normalizedReason = normalizeRequiredString(
        reason,
        "FULFILLMENT_FAILURE_REASON_REQUIRED"
    );

    const result = await prisma.$transaction(async (tx) => {
        const order = await findOrderForPreHandoverResolution(
            orderId,
            tx
        );

        if (!order) {
            throw new Error("ORDER_NOT_FOUND");
        }

        if (
            order.status !== RentalOrderStatus.PREPARING &&
            order.status !==
                RentalOrderStatus.READY_FOR_PICKUP
        ) {
            throw new Error("INVALID_ORDER_STATUS");
        }

        const failedReservation = order.items
            .flatMap((item) => item.reservations)
            .find(
                (reservation) =>
                    reservation.reservationId ===
                        reservationId &&
                    reservation.status ===
                        ReservationStatus.CONFIRMED
            );

        if (!failedReservation) {
            throw new Error("RESERVATION_NOT_FOUND");
        }

        if (
            ![
                RentalUnitStatus.DAMAGED,
                RentalUnitStatus.MAINTENANCE,
            ].includes(failedReservation.rentalUnit.status)
        ) {
            throw new Error(
                "REPLACEMENT_UNIT_NOT_UNAVAILABLE"
            );
        }

        const alternatives = await findAvailableRentalUnits(
            failedReservation.rentalUnit.garmentId,
            failedReservation.rentalUnit.size,
            failedReservation.blockedStartAt,
            failedReservation.blockedEndAt,
            tx
        );

        if (alternatives.length > 0) {
            throw new Error("REPLACEMENT_UNIT_AVAILABLE");
        }

        const now = new Date();
        const itemIds = order.items.map(
            (item) => item.orderItemId
        );
        const preparedUnits = order.items.flatMap(
            (item) => item.reservations
                .filter(
                    (reservation) =>
                        reservation.status ===
                        ReservationStatus.CONFIRMED &&
                        reservation.rentalUnit.status ===
                        RentalUnitStatus.PREPARING
                )
                .map(
                    (reservation) =>
                        reservation.rentalUnitId
                )
        );
        await releaseCurrentReservations(itemIds, tx);

        if (preparedUnits.length > 0) {
            await tx.rentalUnit.updateMany({
                where: {
                    rentalUnitId: { in: preparedUnits },
                    status: RentalUnitStatus.PREPARING,
                },
                data: { status: RentalUnitStatus.AVAILABLE },
            });

            for (const rentalUnitId of preparedUnits) {
                await createRentalUnitStatusHistory(
                    {
                        rentalUnitId,
                        oldStatus: RentalUnitStatus.PREPARING,
                        newStatus: RentalUnitStatus.AVAILABLE,
                        changedBy: staffId,
                        changedAt: now,
                        reason:
                            "Giải phóng RentalUnit do cửa hàng không thể đáp ứng đơn",
                    },
                    tx
                );
            }
        }
        const updatedOrder =
            await markOrderTerminalBeforeHandover(
                orderId,
                RentalOrderStatus.FULFILLMENT_FAILED,
                tx
            );
        await createOrderStatusHistory(
            {
                rentalOrderId: orderId,
                oldStatus: order.status,
                newStatus:
                    RentalOrderStatus.FULFILLMENT_FAILED,
                changedBy: staffId,
                changedAt: now,
                reason: normalizedReason,
            },
            tx
        );
        const rentalRefund = await ensureAutomaticRefund({
            orderId,
            type: RefundType.RENTAL_REFUND,
            amount: order.rentalAmount,
            reason:
                "Hoàn tiền thuê do cửa hàng không thể cung cấp trang phục",
            db: tx,
        });

        return { order: updatedOrder, rentalRefund };
    });

    return attachAutomaticRefundGatewayRequest(
        result,
        "rentalRefund"
    );
};

const confirmAdditionalPayment = async (
    orderId,
    staffId,
    amount
) => {
    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        throw new Error("INVALID_ADDITIONAL_PAYMENT");
    }

    const result = await prisma.$transaction(async (tx) => {
        const order = await findRentalOrderForCompletion(
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

        const requiredAmount = Number(order.additionalPayment);

        if (requiredAmount <= 0) {
            throw new Error("NO_ADDITIONAL_PAYMENT_REQUIRED");
        }

        if (paymentAmount !== requiredAmount) {
            throw new Error("ADDITIONAL_PAYMENT_MISMATCH");
        }

        const expectedTotal =
            Number(order.upfrontAmount) +
            Number(order.collectedDepositAmount) +
            requiredAmount;

        if (Number(order.totalPaid) >= expectedTotal) {
            return { order, alreadyConfirmed: true };
        }

        const confirmedAt = new Date();
        const updatedOrder =
            await confirmAdditionalPaymentReceived(
                orderId,
                requiredAmount,
                staffId,
                confirmedAt,
                tx
            );

        return {
            order: updatedOrder,
            alreadyConfirmed: false,
            confirmedBy: staffId,
            confirmedAt,
        };
    });

    const completion = await completeRentalOrderIfReady(
        orderId
    );

    return { ...result, completion };
};

const completeReturnedReservationBlocks = async (
    now = new Date(),
    db = prisma
) => {
    return db.$transaction(async (tx) => {
        const reservations = await tx.reservation.findMany({
            where: {
                status: ReservationStatus.ACTIVE,
                blockedEndAt: { lte: now },
                rentalOrderItem: {
                    order: {
                        actualReturnAt: { not: null },
                    },
                },
            },
            select: {
                reservationId: true,
                rentalOrderItem: {
                    select: { orderId: true },
                },
            },
        });

        if (reservations.length === 0) {
            return {
                completedReservationCount: 0,
                completedReservationOrderCount: 0,
            };
        }

        await tx.reservation.updateMany({
            where: {
                reservationId: {
                    in: reservations.map(
                        (reservation) =>
                            reservation.reservationId
                    ),
                },
                status: ReservationStatus.ACTIVE,
            },
            data: { status: ReservationStatus.COMPLETED },
        });

        const orderIds = [
            ...new Set(
                reservations.map(
                    (reservation) =>
                        reservation.rentalOrderItem.orderId
                )
            ),
        ];

        return {
            completedReservationCount: reservations.length,
            completedReservationOrderCount: orderIds.length,
        };
    });
};

export {
    buildRentalOrderCreateData,
    calculateLateFee,
    changeRentalUnitStatus,
    completeRentalOrderIfReady,
    completeReturnedReservationBlocks,
    confirmAdditionalPayment,
    createRental,
    normalizeSelectedCartItemIds,
    selectCartItemsForCheckout,
    decideFeeApproval,
    getFeeApprovalRequests,
    expirePendingPaymentOrders,
    ensureAutomaticRefund,
    getRentalOrderDetail,
    getRentalOrderHistory,
    getRentalOrders,
    handoverRentalOrder,
    inspectRentalOrderItem,
    markOverdueRentalOrders,
    markRentalOrderFulfillmentFailed,
    markRentalOrderNoShow,
    prepareReservation,
    RENTAL_UNIT_STATUS_TRANSITIONS,
    receiveRentalReturn,
    replaceRentalUnit,
    settleRentalOrder,
    startPreparingRentalOrder,
};
