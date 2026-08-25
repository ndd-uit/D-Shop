import { Router } from "express";
import authenticate from "../../middlewares/auth.middleware.js";
import authorizeRole from "../../middlewares/authorizeRole.js";
import validateUuid from "../../middlewares/validateUuid.js";
import { createAdditionalPaymentController, createCancellationRefundController, createDepositRefundController, createExpiredHoldRefundController, createStoreCancellationRefundController, createUpfrontPaymentController, getExpiredHoldReconciliationsController, getRefundsController, mockAdditionalPaymentSuccess, mockCancellationRefundSuccess, mockDepositRefundSuccess, mockExpiredHoldRefundSuccessController, mockPaymentFailed, mockPaymentSuccess, mockRefundFailed, retryFailedRefundController } from "./payment.controller.js"

const router = Router();

router.get(
    "/refunds",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    getRefundsController
);

router.post(
    "/refunds/:refundId/retry",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    validateUuid("refundId"),
    retryFailedRefundController
);

// GET /payments/reconciliations/expired-holds
router.get(
    "/reconciliations/expired-holds",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    getExpiredHoldReconciliationsController
);

// POST /payments/reconciliations/expired-holds/:paymentId/refund
router.post(
    "/reconciliations/expired-holds/:paymentId/refund",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    validateUuid("paymentId"),
    createExpiredHoldRefundController
);

// POST /payments/reconciliations/expired-holds/refunds/mock-success
router.post(
    "/reconciliations/expired-holds/refunds/mock-success",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    mockExpiredHoldRefundSuccessController
);

// POST /payments/upfront
router.post(
    "/upfront",
    authenticate,
    authorizeRole("CUSTOMER"),
    createUpfrontPaymentController
);

// POST /payments/upfront/mock-success
router.post(
    "/upfront/mock-success",
    authenticate,
    authorizeRole("RENTAL_STAFF", "STORE_MANAGER"),
    mockPaymentSuccess
);

// POST /payments/orders/:orderId/deposit-refund
router.post(
    "/orders/:orderId/deposit-refund",
    authenticate,
    authorizeRole("RENTAL_STAFF"),
    validateUuid("orderId"),
    createDepositRefundController
);

// POST /payments/refunds/mock-success
router.post(
    "/refunds/mock-success",
    authenticate,
    authorizeRole("RENTAL_STAFF", "STORE_MANAGER"),
    mockDepositRefundSuccess
);

// POST /payments/orders/:orderId/additional
router.post(
    "/orders/:orderId/additional",
    authenticate,
    authorizeRole("CUSTOMER"),
    validateUuid("orderId"),
    createAdditionalPaymentController
);

// POST /payments/cancellation-requests/:cancellationRequestId/refund
router.post(
    "/cancellation-requests/:cancellationRequestId/refund",
    authenticate,
    authorizeRole(
        "RENTAL_STAFF",
        "STORE_MANAGER"
    ),
    validateUuid("cancellationRequestId"),
    createCancellationRefundController
);

// POST /payments/cancellation-refunds/mock-success
router.post(
    "/cancellation-refunds/mock-success",
    authenticate,
    authorizeRole(
        "RENTAL_STAFF",
        "STORE_MANAGER"
    ),
    mockCancellationRefundSuccess
);

// POST /payments/additional/mock-success
router.post(
    "/additional/mock-success",
    authenticate,
    authorizeRole("RENTAL_STAFF", "STORE_MANAGER"),
    mockAdditionalPaymentSuccess
);

//  POST /payments/mock-failed
router.post(
    "/mock-failed",
    authenticate,
    authorizeRole(
        "RENTAL_STAFF",
        "STORE_MANAGER"
    ),
    mockPaymentFailed
);

// POST /payments/refunds/mock-failed
router.post(
    "/refunds/mock-failed",
    authenticate,
    authorizeRole(
        "RENTAL_STAFF",
        "STORE_MANAGER"
    ),
    mockRefundFailed
);

router.post(
    "/orders/:orderId/store-cancellation-refund",
    authenticate,
    authorizeRole(
        "RENTAL_STAFF",
        "STORE_MANAGER"
    ),
    validateUuid("orderId"),
    createStoreCancellationRefundController
);

export default router;
