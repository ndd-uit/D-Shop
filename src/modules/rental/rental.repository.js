import prisma from "../../config/prisma.js";
import {
    CancellationRequestStatus,
    PaymentPurpose,
    PaymentStatus,
    ReservationStatus,
    RentalOrderStatus,
} from "../../generated/prisma/client.ts";
// Tao RentalOrder
const createRentalOrder = async (data, db = prisma) => {
    return db.rentalOrder.create({
        data
    });
}

// Tao RentalOrderItem
const createRentalOrderItem = async (data, db = prisma) => {
    return db.rentalOrderItem.create({
        data
    });
}

// Tao Reservation
const createReservation = async (data, db = prisma) => {
    return db.reservation.create({
        data
    });
}

// Tao lich su trang thai Order
const createOrderStatusHistory = async (data, db = prisma) => {
    return db.rentalOrderStatusHistory.create({
        data
    });
}
//Ở đây data nghĩa là service sẽ chuẩn bị object rồi repository chỉ đưa xuống Prisma

// Tìm RentalOrder theo orderId
const findRentalOrderById = async (orderId, db = prisma) => {
    return db.rentalOrder.findUnique({
        where: { orderId },
    });
}

// Cập nhật trạng thái của RentalOrder
const updateRentalOrderStatus = async (orderId, status, db = prisma) => {
    return db.rentalOrder.update({
        where: { orderId },
        data: { status },
    });
}

// Tìm Reservation theo reservationId và orderId
// không chỉ tìm Reservation, mà còn đảm bảo Reservation đó thuộc đúng Order đang xử lý
const findReservationForPreparation = async (
    reservationId,
    orderId,
    db = prisma
) => {
    return db.reservation.findFirst({
        where: {
            reservationId,
            rentalOrderItem: {
                orderId,
            },
        },
        include: {
            rentalUnit: true,
        },
    });
};

// Cập nhật thông tin chuẩn bị của Reservation
const updateReservationPreparation = async (
    reservationId,
    data,
    db = prisma
) => {
    return db.reservation.update({
        where: {
            reservationId,
        },
        data,
    });
};

// Tìm RentalOrder cùng với các item và reservation liên quan để chuẩn bị
const findRentalOrderForPreparation = async (
    orderId,
    db = prisma
) => {
    return db.rentalOrder.findUnique({
        where: {
            orderId,
        },
        include: {
            items: {
                include: {
                    reservations: true,
                },
            },

            cancellationRequests: {
                where: {
                    status: "REQUESTED",
                },
            },
        },
    });
};

// Tìm RentalOrder cùng với các item và reservation liên quan để chuẩn bị cho việc giao hàng
const findRentalOrderForHandover = async (
    orderId,
    db = prisma
) => {
    return db.rentalOrder.findUnique({
        where: {
            orderId,
        },
        include: {
            customer: true,
            items: {
                include: {
                    reservations: {
                        include: {
                            rentalUnit: true,
                        },
                    },
                },
            },

            cancellationRequests: {
                where: {
                    status: "REQUESTED",
                },
            },
        },
    });
};

// Cập nhật trạng thái của RentalOrder thành "RENTING" và đặt thời gian thực tế nhận hàng
const markOrderAsRenting = async (
    orderId,
    actualPickupAt,
    db = prisma
) => {
    return db.rentalOrder.update({
        where: {
            orderId,
        },
        data: {
            status: "RENTING",
            actualPickupAt,
        },
    });
};

// Kích hoạt tất cả các Reservation có trạng thái "CONFIRMED" thành "ACTIVE"
const activateReservations = async (
    orderItemIds,
    db = prisma
) => {
    return db.reservation.updateMany({
        where: {
            rentalOrderItemId: {
                in: orderItemIds,
            },
            status: "CONFIRMED",
        },
        data: {
            status: "ACTIVE",
        },
    });
};

// Đánh dấu các RentalUnit là "RENTED" khi đơn hàng được giao
const markRentalUnitsAsRented = async (
    rentalUnitIds,
    db = prisma
) => {
    return db.rentalUnit.updateMany({
        where: {
            rentalUnitId: {
                in: rentalUnitIds,
            },
            status: "PREPARING",
        },
        data: {
            status: "RENTED",
        },
    });
};

// Tạo lịch sử thay đổi trạng thái của RentalUnit
const createRentalUnitStatusHistory = async (
    data,
    db = prisma
) => {
    return db.rentalUnitStatusHistory.create({
        data,
    });
};

// Tìm RentalOrder cùng với các item và reservation liên quan để chuẩn bị cho việc trả hàng
// để service biết chính xác unit nào đang được thuê.
const findRentalOrderForReturn = async (
    orderId,
    db = prisma
) => {
    return db.rentalOrder.findUnique({
        where: {
            orderId,
        },

        include: {
            items: {
                include: {
                    reservations: {
                        include: {
                            rentalUnit: true,
                        },
                    },
                },
            },
        },
    });
};

// Đánh dấu đơn hàng là "RETURNED" và đặt thời gian thực tế trả hàng
const markOrderReturned = async (
    orderId,
    actualReturnAt,
    db = prisma
) => {
    return db.rentalOrder.update({
        where: {
            orderId,
        },

        data: {
            status: "RETURNED",
            actualReturnAt,
        },
    });
};

// Đánh dấu các RentalUnit là "RETURN_INSPECTION" khi đơn hàng được trả
const markRentalUnitsReturnInspection = async (
    rentalUnitIds,
    db = prisma
) => {
    return db.rentalUnit.updateMany({
        where: {
            rentalUnitId: {
                in: rentalUnitIds,
            },
        },

        data: {
            status: "RETURN_INSPECTION",
        },
    });
};

const findOrderItemForInspection = async ( // Tìm RentalOrderItem cùng với InspectionResult và các Reservation liên quan để kiểm tra trả hàng
    orderId,
    orderItemId,
    db = prisma
) => {
    return db.rentalOrderItem.findFirst({
        where: {
            orderItemId,
            orderId,
        },

        include: {
            inspectionResult: true,

            reservations: {
                include: {
                    rentalUnit: true,
                },
            },
        },
    });
};

// Tạo InspectionResult cho một đơn hàng
const createInspectionResult = async (
    data,
    db = prisma,
) => {
    const {
        rentalOrderItemId,
        rentalUnitId,
        inspectedBy,
        ...inspectionData
    } = data;

    return db.inspectionResult.create({
        data: {
            ...inspectionData,

            rentalOrderItem: {
                connect: {
                    orderItemId: rentalOrderItemId,
                },
            },

            rentalUnit: {
                connect: {
                    rentalUnitId,
                },
            },

            inspector: {
                connect: {
                    userId: inspectedBy,
                },
            },
        },
    });
};
const findRentalOrderInspectionProgress = async ( // Tìm tiến trình kiểm tra trả hàng của một đơn hàng
    orderId,
    db = prisma
) => {
    return db.rentalOrder.findUnique({
        where: {
            orderId,
        },

        include: {
            items: {
                include: {
                    inspectionResult: true,
                },
            },
        },
    });
};

// Tìm RentalOrder cùng với các item và reservation liên quan để thanh toán
const findRentalOrderForSettlement = async (
    orderId,
    db = prisma
) => {
    return db.rentalOrder.findUnique({
        where: {
            orderId,
        },

        include: {
            policy: true,

            items: {
                include: {
                    inspectionResult: true,
                },
            },

            feeApprovalRequests: {
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    });
};

// Tạo FeeApprovalRequest cho một đơn hàng
const createFeeApprovalRequest = async (
    data,
    db = prisma
) => {
    return db.feeApprovalRequest.create({
        data,
    });
};

const findLatestFeeApprovalRequest = async (
    rentalOrderId,
    db = prisma
) => {
    return db.feeApprovalRequest.findFirst({
        where: {
            rentalOrderId,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
};

// Cập nhật thông tin thanh toán của RentalOrder
const updateRentalOrderSettlement = async (
    orderId,
    data,
    db = prisma
) => {
    return db.rentalOrder.update({
        where: {
            orderId,
        },

        data,
    });
};

// Tìm RentalOrder cùng với các item, reservation, payment và refund liên quan để hoàn tiền
const findRentalOrderForCompletion = async (
    orderId,
    db = prisma
) => {
    return db.rentalOrder.findUnique({
        where: { orderId },

        include: {
            items: {
                include: {
                    reservations: true,
                },
            },

            payments: {
                include: {
                    refunds: true,
                },
            },
        },
    });
};

// Tìm tất cả các Reservation có trạng thái "ACTIVE" và "COMPLETED" để hoàn tất đơn hàng
const completeReservations = async (
    orderItemIds,
    db = prisma
) => {
    return db.reservation.updateMany({
        where: {
            rentalOrderItemId: {
                in: orderItemIds,
            },

            status: ReservationStatus.ACTIVE,
        },

        data: {
            status: ReservationStatus.COMPLETED,
        },
    });
};

// Tìm RentalUnit theo rentalUnitId
const findRentalUnitById = async (
    rentalUnitId,
    db = prisma
) => {
    return db.rentalUnit.findUnique({
        where: {
            rentalUnitId,
        },
    });
};
// Cập nhật trạng thái của RentalUnit
const updateRentalUnitStatus = async (
    rentalUnitId,
    status,
    db = prisma
) => {
    return db.rentalUnit.update({
        where: {
            rentalUnitId,
        },

        data: {
            status,
        },
    });
};

// Tìm FeeApprovalRequest theo feeApprovalRequestId
const findFeeApprovalRequestById = async (
    feeApprovalRequestId,
    db = prisma
) => {
    return db.feeApprovalRequest.findUnique({
        where: {
            feeApprovalRequestId,
        },

        include: {
            rentalOrder: true,
        },
    });
};

// Cập nhật thông tin của FeeApprovalRequest
const updateFeeApprovalRequest = async (
    feeApprovalRequestId,
    data,
    db = prisma
) => {
    return db.feeApprovalRequest.update({
        where: {
            feeApprovalRequestId,
        },

        data,
    });
};

// Tìm tất cả các RentalOrder quá hạn (trạng thái "RENTING" và returnDueAt < now)
const findOverdueRentalOrders = async (
    now = new Date(),
    db = prisma
) => {
    return db.rentalOrder.findMany({
        where: {
            status: RentalOrderStatus.RENTING,

            actualReturnAt: null,

            returnDueAt: {
                lt: now,
            },
        },
    });
};

const findOrderForDirectCancellation = async ( // Tìm RentalOrder cùng với các item và reservation liên quan để hủy trực tiếp
    orderId,
    customerId,
    db = prisma
) => {
    return db.rentalOrder.findFirst({
        where: {
            orderId,
            customerId,
        },

        include: {
            items: {
                include: {
                    reservations: true,
                },
            },
        },
    });
};

// Hủy tất cả các Reservation có trạng thái "TEMPORARY_HOLD" cho các RentalOrderItem được chỉ định
const cancelTemporaryReservations = async (
    orderItemIds,
    db = prisma
) => {
    return db.reservation.updateMany({
        where: {
            rentalOrderItemId: {
                in: orderItemIds,
            },

            status:
                ReservationStatus.TEMPORARY_HOLD,
        },

        data: {
            status:
                ReservationStatus.CANCELLED,
        },
    });
};

// Cập nhật trạng thái của RentalOrder thành "CANCELLED" và lưu thông tin hủy
const cancelRentalOrder = async (
    orderId,
    {
        cancellationReason,
        cancelledBy,
        cancelledAt,
    },
    db = prisma
) => {
    return db.rentalOrder.update({
        where: { orderId },

        data: {
            status: RentalOrderStatus.CANCELLED,
            cancellationReason,
            cancelledBy,
            cancelledAt,
        },
    });
};

const cancelPendingPaymentOrder = async ( // Hủy đơn hàng đang chờ thanh toán (trạng thái "PENDING_PAYMENT")
    orderId,
    customerId,
    reason
) => {
    return prisma.$transaction(async (tx) => {
        const order =
            await findOrderForDirectCancellation(
                orderId,
                customerId,
                tx
            );

        if (!order) {
            throw new Error("ORDER_NOT_FOUND");
        }

        if (
            order.status !==
            RentalOrderStatus.PENDING_PAYMENT
        ) {
            throw new Error(
                "DIRECT_CANCELLATION_NOT_ALLOWED"
            );
        }

        const orderItemIds = order.items.map(
            (item) => item.orderItemId
        );

        const now = new Date();

        const cancelledOrder =
            await cancelRentalOrder(
                orderId,
                {
                    cancellationReason:
                        reason ?? null,
                    cancelledBy: customerId,
                    cancelledAt: now,
                },
                tx
            );

        await cancelTemporaryReservations(
            orderItemIds,
            tx
        );

        await createOrderStatusHistory(
            {
                rentalOrderId: orderId,
                oldStatus:
                    RentalOrderStatus.PENDING_PAYMENT,
                newStatus:
                    RentalOrderStatus.CANCELLED,
                changedBy: customerId,
                changedAt: now,
                reason:
                    reason ?? "Cancelled by customer",
            },
            tx
        );

        return cancelledOrder;
    });
};

// Tìm RentalOrder cùng với các yêu cầu hủy đang chờ xử lý để kiểm tra xem có thể hủy đơn hàng đang chờ thanh toán hay không
const findOrderForCancellationRequest = async (
    orderId,
    customerId,
    db = prisma
) => {
    return db.rentalOrder.findFirst({
        where: {
            orderId,
            customerId,
        },

        include: {
            cancellationRequests: {
                where: {
                    status: "REQUESTED",
                },
            },
        },
    });
};

// Tạo một yêu cầu hủy đơn hàng mới
const createCancellationRequest = async (
    data,
    db = prisma
) => {
    return db.cancellationRequest.create({
        data,
    });
};

// Tìm RentalOrder cùng với các yêu cầu hủy đang chờ xử lý để quyết định hủy đơn hàng
const findCancellationRequestForDecision = async (
    cancellationRequestId,
    db = prisma
) => {
    return db.cancellationRequest.findUnique({
        where: {
            cancellationRequestId,
        },

        include: {
            policy: true,

            rentalOrder: {
                include: {
                    items: true,

                    payments: {
                        where: {
                            purpose:
                                PaymentPurpose.UPFRONT,
                            status:
                                PaymentStatus.SUCCESS,
                        },

                        orderBy: {
                            paidAt: "desc",
                        },

                        take: 1,
                    },
                },
            },
        },
    });
};

// Cập nhật thông tin của CancellationRequest
const cancelConfirmedReservations = async (
    orderItemIds,
    db = prisma
) => {
    return db.reservation.updateMany({
        where: {
            rentalOrderItemId: {
                in: orderItemIds,
            },

            status: ReservationStatus.CONFIRMED,
        },

        data: {
            status: ReservationStatus.CANCELLED,
        },
    });
};

// Cập nhật trạng thái của CancellationRequest
const updateCancellationRequest = async (
    cancellationRequestId,
    data,
    db = prisma
) => {
    return db.cancellationRequest.update({
        where: {
            cancellationRequestId,
        },

        data,
    });
};

// Tìm tất cả các RentalOrder có trạng thái "PENDING_PAYMENT" và các Reservation tạm giữ đã hết hạn
const findExpiredPendingPaymentOrders = async (
    now = new Date(),
    db = prisma
) => {
    return db.rentalOrder.findMany({
        where: {
            status: RentalOrderStatus.PENDING_PAYMENT,

            items: {
                some: {
                    reservations: {
                        some: {
                            status:
                                ReservationStatus.TEMPORARY_HOLD,

                            holdExpiresAt: {
                                lte: now,
                            },
                        },
                    },
                },
            },
        },

        include: {
            items: true,
        },
    });
};

// Cập nhật tất cả các Reservation tạm giữ đã hết hạn thành "EXPIRED"
const expireTemporaryReservations = async (
    orderItemIds,
    now,
    db = prisma
) => {
    return db.reservation.updateMany({
        where: {
            rentalOrderItemId: {
                in: orderItemIds,
            },

            status:
                ReservationStatus.TEMPORARY_HOLD,

            holdExpiresAt: {
                lte: now,
            },
        },

        data: {
            status:
                ReservationStatus.EXPIRED,
        },
    });
};

// Tìm Reservation cho mục đích thay thế, đảm bảo rằng Reservation đó thuộc đúng Order đang xử lý
const findReservationForReplacement = async (
    reservationId,
    orderId,
    db = prisma
) => {
    return db.reservation.findFirst({
        where: {
            reservationId,

            rentalOrderItem: {
                orderId,
            },
        },

        include: {
            rentalUnit: true,

            rentalOrderItem: {
                include: {
                    order: {
                        include: {
                            cancellationRequests: {
                                where: {
                                    status: "REQUESTED",
                                },
                            },
                        },
                    },
                },
            },
        },
    });
};
// Cập nhật Reservation thành "RELEASED" khi thay thế, lưu lý do thay thế
const releaseReservationForReplacement = async (
    reservationId,
    replacementReason,
    replacedBy,
    replacedAt,
    db = prisma
) => {
    return db.reservation.update({
        where: {
            reservationId,
        },

        data: {
            status: ReservationStatus.RELEASED,
            replacementReason,
            replacedBy,
            replacedAt,
        },
    });
};

// Tìm RentalOrder cùng với các item và reservation liên quan để hủy đơn hàng tại cửa hàng
const findOrderForStoreCancellation = async (
    orderId,
    db = prisma
) => {
    return db.rentalOrder.findUnique({
        where: {
            orderId,
        },

        include: {
            items: true,
        },
    });
};

const markRentalUnitAsPreparing = async (
    rentalUnitId,
    db = prisma
) => {
    return db.rentalUnit.updateMany({
        where: {
            rentalUnitId,
            status: "AVAILABLE",
        },
        data: {
            status: "PREPARING",
        },
    });
};

const expirePendingPaymentOrder = async (
    orderId,
    db = prisma
) => {
    return db.rentalOrder.updateMany({
        where: {
            orderId,
            status: RentalOrderStatus.PENDING_PAYMENT,
        },
        data: {
            status: RentalOrderStatus.EXPIRED,
        },
    });
};

const findPendingCancellationRequests = async (
    db = prisma
) => {
    return db.cancellationRequest.findMany({
        where: {
            status: CancellationRequestStatus.REQUESTED,
        },
        select: {
            cancellationRequestId: true,
            rentalOrderId: true,
            reason: true,
            requestedBy: true,
            requestedAt: true,
            policy: {
                select: {
                    policyId: true,
                    version: true,
                    effectiveFrom: true,
                },
            },
            requester: {
                select: {
                    userId: true,
                    fullName: true,
                    email: true,
                    phone: true,
                },
            },
            rentalOrder: {
                select: {
                    orderId: true,
                    status: true,
                    rentalStartAt: true,
                    returnDueAt: true,
                    rentalAmount: true,
                    depositAmount: true,
                    totalPaid: true,
                    customer: {
                        select: {
                            userId: true,
                            fullName: true,
                            email: true,
                            phone: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            requestedAt: "asc",
        },
    });
};

const findRentalOrders = async ({
    customerId = null,
    db = prisma,
}) => {
    return db.rentalOrder.findMany({
        where: customerId
            ? {
                customerId,
            }
            : undefined,
        include: {
            customer: {
                select: {
                    userId: true,
                    fullName: true,
                    email: true,
                    phone: true,
                },
            },
            items: {
                include: {
                    garment: true,
                    reservations: {
                        include: {
                            rentalUnit: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
};

const findRentalOrderDetail = async (
    orderId,
    db = prisma
) => {
    return db.rentalOrder.findUnique({
        where: {
            orderId,
        },
        include: {
            customer: {
                select: {
                    userId: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    nationalId: true,
                },
            },
            policy: true,
            items: {
                include: {
                    garment: true,
                    reservations: {
                        include: {
                            rentalUnit: true,
                        },
                    },
                    inspectionResult: true,
                },
            },
            payments: {
                orderBy: {
                    createdAt: "asc",
                },
            },
            cancellationRequests: {
                orderBy: {
                    requestedAt: "asc",
                },
            },
        },
    });
};

const findRentalOrderOwnership = async (
    orderId,
    db = prisma
) => {
    return db.rentalOrder.findUnique({
        where: {
            orderId,
        },
        select: {
            orderId: true,
            customerId: true,
        },
    });
};

const findRentalOrderStatusHistory = async (
    orderId,
    db = prisma
) => {
    return db.rentalOrderStatusHistory.findMany({
        where: {
            rentalOrderId: orderId,
        },
        orderBy: {
            changedAt: "asc",
        },
    });
};
export {
    createRentalOrder,
    createRentalOrderItem,
    createReservation,
    createOrderStatusHistory,
    findRentalOrderById,
    updateRentalOrderStatus,
    findReservationForPreparation,
    updateReservationPreparation,
    findRentalOrderForPreparation,
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
    findRentalOrderForCompletion,
    completeReservations,
    findRentalUnitById,
    updateRentalUnitStatus,
    markRentalUnitAsPreparing,
    findFeeApprovalRequestById,
    updateFeeApprovalRequest,
    findOverdueRentalOrders,
    findOrderForDirectCancellation,
    cancelTemporaryReservations,
    cancelRentalOrder,
    cancelPendingPaymentOrder,
    findOrderForCancellationRequest,
    createCancellationRequest,
    findCancellationRequestForDecision,
    findPendingCancellationRequests,
    updateCancellationRequest,
    cancelConfirmedReservations,
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
}
