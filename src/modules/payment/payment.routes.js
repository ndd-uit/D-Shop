import { Router } from "express";
import authenticate from "../../middlewares/auth.middleware.js";
import authorizeRole from "../../middlewares/authorizeRole.js";
import validateUuid from "../../middlewares/validateUuid.js";
import {
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
} from "./payment.controller.js";

const router = Router();

router.post(
    "/webhooks/sepay/ipn",
    sePayPaymentIpnController
);

router.get(
    "/refunds",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    getRefundsController
);

router.get(
    "/reconciliations/expired-holds",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    getExpiredHoldReconciliationsController
);

router.post(
    "/rental",
    authenticate,
    authorizeRole("CUSTOMER"),
    createRentalPaymentController
);

router.post(
    "/orders/:orderId/deposit",
    authenticate,
    authorizeRole("RENTAL_STAFF", "STORE_MANAGER"),
    validateUuid("orderId"),
    createDepositPaymentController
);

router.post(
    "/orders/:orderId/deposit-refund",
    authenticate,
    authorizeRole("RENTAL_STAFF", "STORE_MANAGER"),
    validateUuid("orderId"),
    createDepositRefundController
);

router.post(
    "/orders/:orderId/rental-refund",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    validateUuid("orderId"),
    createRentalRefundController
);

router.post(
    "/callbacks/payments/succeeded",
    authenticate,
    authorizeRole("RENTAL_STAFF", "STORE_MANAGER"),
    paymentSucceededController
);

router.post(
    "/callbacks/payments/failed",
    authenticate,
    authorizeRole("RENTAL_STAFF", "STORE_MANAGER"),
    paymentFailedController
);

router.post(
    "/callbacks/refunds/succeeded",
    authenticate,
    authorizeRole("RENTAL_STAFF", "STORE_MANAGER"),
    refundSucceededController
);

router.post(
    "/callbacks/refunds/failed",
    authenticate,
    authorizeRole("RENTAL_STAFF", "STORE_MANAGER"),
    refundFailedController
);

router.post(
    "/refunds/:refundId/retry",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    validateUuid("refundId"),
    retryFailedRefundController
);

export default router;
