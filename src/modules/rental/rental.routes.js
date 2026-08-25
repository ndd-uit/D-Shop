import { Router } from "express";
import { createRentalOrder, getRentalOrdersController, getRentalOrderDetailController, getRentalOrderHistoryController, startPreparingOrder, prepareRentalReservation, handoverOrder, receiveReturn, inspectOrderItem, settleOrder, updateRentalUnitStatusController, decideFeeApprovalController, markOverdueOrdersController, cancelPendingPaymentOrderController, requestCancellationController, rejectCancellationRequestController, approveCancellationRequestController, getPendingCancellationRequestsController, expirePendingPaymentOrdersController, replaceRentalUnitController, cancelOrderByStoreController } from "./rental.controller.js"
import authenticate from "../../middlewares/auth.middleware.js";
import authorizeRole from "../../middlewares/authorizeRole.js";
import validateUuid from "../../middlewares/validateUuid.js";

const router = Router();

// POST /rentals/
router.post(
    "/",
    authenticate,
    authorizeRole("CUSTOMER"),
    createRentalOrder
);

// PATCH /rentals/:id/preparing
router.patch(
    "/:id/preparing",
    authenticate,
    authorizeRole("RENTAL_STAFF"),
    validateUuid("id"),
    startPreparingOrder
);

// PATCH /rentals/:orderId/reservations/:reservationId/prepare
router.patch(
    "/:orderId/reservations/:reservationId/prepare",
    authenticate,
    authorizeRole("RENTAL_STAFF"),
    validateUuid("orderId"),
    validateUuid("reservationId"),
    prepareRentalReservation
);

// PATCH /rentals/:id/handover
router.patch(
    "/:id/handover",
    authenticate,
    authorizeRole("RENTAL_STAFF"),
    validateUuid("id"),
    handoverOrder
);

// PATCH /rentals/:id/return
router.patch(
    "/:id/return",
    authenticate,
    authorizeRole("RENTAL_STAFF"),
    validateUuid("id"),
    receiveReturn
);

// POST /rentals/:id/items/:itemId/inspection
router.post(
    "/:id/items/:itemId/inspection",
    authenticate,
    authorizeRole("RENTAL_STAFF"),
    validateUuid("id"),
    validateUuid("itemId"),
    inspectOrderItem
);

// POST /rentals/:id/settlement
router.post(
    "/:id/settlement",
    authenticate,
    authorizeRole("RENTAL_STAFF"),
    validateUuid("id"),
    settleOrder
);

// PATCH /rentals/units/:rentalUnitId/status
router.patch(
    "/units/:rentalUnitId/status",
    authenticate,
    authorizeRole(
        "RENTAL_STAFF",
        "STORE_MANAGER"
    ),
    validateUuid("rentalUnitId"),
    updateRentalUnitStatusController
);

// PATCH /rentals/fee-approvals/:feeApprovalRequestId/decision
router.patch(
    "/fee-approvals/:feeApprovalRequestId/decision",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    validateUuid("feeApprovalRequestId"),
    decideFeeApprovalController
);

// POST /rentals/overdue/check
router.post(
    "/overdue/check",
    authenticate,
    authorizeRole(
        "RENTAL_STAFF",
        "STORE_MANAGER"
    ),
    markOverdueOrdersController
);

// PATCH /rentals/:id/cancel
router.patch(
    "/:id/cancel",
    authenticate,
    authorizeRole("CUSTOMER"),
    validateUuid("id"),
    cancelPendingPaymentOrderController
);

// POST /rentals/:id/cancellation-request
router.post(
    "/:id/cancellation-request",
    authenticate,
    authorizeRole("CUSTOMER"),
    validateUuid("id"),
    requestCancellationController
);

// PATCH /rentals/cancellation-requests/:cancellationRequestId/reject
router.get(
    "/cancellation-requests/pending",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    getPendingCancellationRequestsController
);

router.patch(
    "/cancellation-requests/:cancellationRequestId/reject",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    validateUuid("cancellationRequestId"),
    rejectCancellationRequestController
);

// PATCH /rentals/cancellation-requests/:cancellationRequestId/approve
router.patch(
    "/cancellation-requests/:cancellationRequestId/approve",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    validateUuid("cancellationRequestId"),
    approveCancellationRequestController
);

// POST /rentals/expired/check
router.post(
    "/expired/check",
    authenticate,
    authorizeRole(
        "RENTAL_STAFF",
        "STORE_MANAGER"
    ),
    expirePendingPaymentOrdersController
);

// PATCH /rentals/:id/reservations/:reservationId/replace
router.patch(
    "/:id/reservations/:reservationId/replace",
    authenticate,
    authorizeRole("RENTAL_STAFF"),
    validateUuid("id"),
    validateUuid("reservationId"),
    replaceRentalUnitController
);

// PATCH /rentals/:id/store-cancel
router.patch(
    "/:id/store-cancel",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    validateUuid("id"),
    cancelOrderByStoreController
);

router.get(
    "/",
    authenticate,
    authorizeRole(
        "CUSTOMER",
        "RENTAL_STAFF",
        "STORE_MANAGER"
    ),
    getRentalOrdersController
);

router.get(
    "/:id/history",
    authenticate,
    authorizeRole(
        "CUSTOMER",
        "RENTAL_STAFF",
        "STORE_MANAGER"
    ),
    validateUuid("id"),
    getRentalOrderHistoryController
);

router.get(
    "/:id",
    authenticate,
    authorizeRole(
        "CUSTOMER",
        "RENTAL_STAFF",
        "STORE_MANAGER"
    ),
    validateUuid("id"),
    getRentalOrderDetailController
);

export default router;
