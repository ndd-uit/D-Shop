import { Router } from "express";
import authenticate from "../../middlewares/auth.middleware.js";
import authorizeRole from "../../middlewares/authorizeRole.js";
import validateUuid from "../../middlewares/validateUuid.js";
import { uploadRentalEvidenceImages } from "../../middlewares/rentalEvidenceUpload.js";
import {
    confirmAdditionalPaymentController,
    createRentalOrder,
    decideFeeApprovalController,
    getFeeApprovalRequestsController,
    expirePendingPaymentOrdersController,
    getRentalOrderDetailController,
    getRentalOrderHistoryController,
    getRentalOrdersController,
    handoverOrder,
    inspectOrderItem,
    markFulfillmentFailedController,
    markNoShowController,
    markOverdueOrdersController,
    prepareRentalReservation,
    receiveReturn,
    replaceRentalUnitController,
    settleOrder,
    startPreparingOrder,
    updateRentalUnitStatusController,
} from "./rental.controller.js";

const router = Router();
const staffOnly = authorizeRole("RENTAL_STAFF");
const operationsRoles = authorizeRole(
    "RENTAL_STAFF",
    "STORE_MANAGER"
);

router.post("/", authenticate, authorizeRole("CUSTOMER"), createRentalOrder);

router.post(
    "/overdue/check",
    authenticate,
    operationsRoles,
    markOverdueOrdersController
);

router.post(
    "/expired/check",
    authenticate,
    operationsRoles,
    expirePendingPaymentOrdersController
);

router.patch(
    "/units/:rentalUnitId/status",
    authenticate,
    operationsRoles,
    validateUuid("rentalUnitId"),
    updateRentalUnitStatusController
);

router.get(
    "/fee-approvals",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    getFeeApprovalRequestsController
);

router.patch(
    "/fee-approvals/:feeApprovalRequestId/decision",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    validateUuid("feeApprovalRequestId"),
    decideFeeApprovalController
);

router.patch(
    "/:id/preparing",
    authenticate,
    staffOnly,
    validateUuid("id"),
    startPreparingOrder
);

router.patch(
    "/:orderId/reservations/:reservationId/prepare",
    authenticate,
    staffOnly,
    validateUuid("orderId"),
    validateUuid("reservationId"),
    uploadRentalEvidenceImages,
    prepareRentalReservation
);

router.patch(
    "/:id/reservations/:reservationId/replace",
    authenticate,
    staffOnly,
    validateUuid("id"),
    validateUuid("reservationId"),
    replaceRentalUnitController
);

router.patch(
    "/:id/handover",
    authenticate,
    staffOnly,
    validateUuid("id"),
    handoverOrder
);

router.patch(
    "/:id/no-show",
    authenticate,
    staffOnly,
    validateUuid("id"),
    markNoShowController
);

router.patch(
    "/:id/reservations/:reservationId/fulfillment-failed",
    authenticate,
    staffOnly,
    validateUuid("id"),
    validateUuid("reservationId"),
    markFulfillmentFailedController
);

router.patch(
    "/:id/return",
    authenticate,
    staffOnly,
    validateUuid("id"),
    receiveReturn
);

router.post(
    "/:id/items/:itemId/inspection",
    authenticate,
    staffOnly,
    validateUuid("id"),
    validateUuid("itemId"),
    uploadRentalEvidenceImages,
    inspectOrderItem
);

router.post(
    "/:id/settlement",
    authenticate,
    staffOnly,
    validateUuid("id"),
    settleOrder
);

router.patch(
    "/:id/additional-payment",
    authenticate,
    staffOnly,
    validateUuid("id"),
    confirmAdditionalPaymentController
);

router.get(
    "/",
    authenticate,
    authorizeRole("CUSTOMER", "RENTAL_STAFF", "STORE_MANAGER"),
    getRentalOrdersController
);

router.get(
    "/:id/history",
    authenticate,
    authorizeRole("CUSTOMER", "RENTAL_STAFF", "STORE_MANAGER"),
    validateUuid("id"),
    getRentalOrderHistoryController
);

router.get(
    "/:id",
    authenticate,
    authorizeRole("CUSTOMER", "RENTAL_STAFF", "STORE_MANAGER"),
    validateUuid("id"),
    getRentalOrderDetailController
);

export default router;
