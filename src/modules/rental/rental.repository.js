import prisma from "../../config/prisma.js";
import {
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

const recordDirectDeposit = async (
    orderId,
    amount,
    collectedAt,
    db = prisma
) => db.rentalOrder.update({
    where: { orderId },
    data: {
        collectedDepositAmount: amount,
        depositCollectionMethod: "DIRECT",
        depositCollectedAt: collectedAt,
        totalPaid: { increment: amount },
        netCollected: { increment: amount },
    },
});

const confirmAdditionalPaymentReceived = async (
    orderId,
    amount,
    db = prisma
) => db.rentalOrder.update({
    where: { orderId },
    data: {
        additionalPayment: amount,
        totalPaid: { increment: amount },
        netCollected: { increment: amount },
    },
});

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
            refunds: true,
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
                    order: true,
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

const findOrderForPreHandoverResolution = async (
    orderId,
    db = prisma
) => db.rentalOrder.findUnique({
    where: { orderId },
    include: {
        items: {
            include: {
                reservations: {
                    include: { rentalUnit: true },
                },
            },
        },
    },
});

const releaseCurrentReservations = async (
    orderItemIds,
    db = prisma
) => db.reservation.updateMany({
    where: {
        rentalOrderItemId: { in: orderItemIds },
        status: {
            in: [
                ReservationStatus.CONFIRMED,
                ReservationStatus.TEMPORARY_HOLD,
            ],
        },
    },
    data: { status: ReservationStatus.RELEASED },
});

const markOrderTerminalBeforeHandover = async (
    orderId,
    status,
    db = prisma
) => db.rentalOrder.update({
    where: { orderId },
    data: { status },
});

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
            refunds: {
                orderBy: {
                    createdAt: "asc",
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
    findFeeApprovalRequestById,
    updateFeeApprovalRequest,
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
}
