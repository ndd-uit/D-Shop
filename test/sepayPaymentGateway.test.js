import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test, { afterEach } from "node:test";

import {
    createPaymentRequest as createGatewayPaymentRequest,
    createRefundRequest as createGatewayRefundRequest,
} from "../src/modules/payment/gateway/paymentGateway.js";
import {
    buildInvoiceNumber,
    createPaymentRequest,
    parsePaymentNotification,
    validatePaymentNotification,
    verifyWebhookSecret,
} from "../src/modules/payment/gateway/sepayPaymentGateway.js";
import {
    getPaymentProcessingState,
    getRentalPaymentResolution,
} from "../src/modules/payment/payment.service.js";
import { markRefundSucceeded } from "../src/modules/payment/payment.repository.js";

const PAYMENT_ID = "5899a70a-e2ef-4c2e-bdb4-f087795ce4be";
const originalEnvironment = { ...process.env };

const configureSePay = () => {
    process.env.PAYMENT_GATEWAY = "SEPAY";
    process.env.SEPAY_ENVIRONMENT = "sandbox";
    process.env.SEPAY_MERCHANT_ID = "merchant-test";
    process.env.SEPAY_SECRET_KEY = "checkout-secret";
    process.env.SEPAY_IPN_SECRET = "ipn-secret";
    process.env.SEPAY_SUCCESS_URL = "https://dshop.test/payment/success";
    process.env.SEPAY_ERROR_URL = "https://dshop.test/payment/error";
    process.env.SEPAY_CANCEL_URL = "https://dshop.test/payment/cancel";
};

const createIpnPayload = ({
    amount = "350000",
    invoiceNumber = buildInvoiceNumber(PAYMENT_ID, "RENTAL"),
} = {}) => ({
    timestamp: 1788230400,
    notification_type: "ORDER_PAID",
    order: {
        order_status: "CAPTURED",
        order_currency: "VND",
        order_amount: amount,
        order_invoice_number: invoiceNumber,
    },
    transaction: {
        transaction_id: "SEPAY-TXN-001",
        transaction_type: "PAYMENT",
        transaction_status: "APPROVED",
        transaction_amount: amount,
        transaction_currency: "VND",
    },
});

afterEach(() => {
    for (const key of Object.keys(process.env)) {
        if (!(key in originalEnvironment)) {
            delete process.env[key];
        }
    }

    Object.assign(process.env, originalEnvironment);
});

test("SePay checkout keeps RENTAL and DEPOSIT references separate", async () => {
    configureSePay();

    const rental = await createPaymentRequest({
        paymentId: PAYMENT_ID,
        purpose: "RENTAL",
        amount: 350000,
    });
    const deposit = await createPaymentRequest({
        paymentId: PAYMENT_ID,
        purpose: "DEPOSIT",
        amount: 500000,
    });

    assert.equal(rental.gatewayReference, `DS-R-${PAYMENT_ID}`);
    assert.equal(deposit.gatewayReference, `DS-D-${PAYMENT_ID}`);
    assert.equal(rental.checkout.method, "POST");
    assert.equal(
        rental.checkout.action,
        "https://pay-sandbox.sepay.vn/v1/checkout/init"
    );

    const signedString = Object.entries(rental.checkout.fields)
        .filter(([name]) => name !== "signature")
        .map(([name, value]) => `${name}=${value}`)
        .join(",");
    const expectedSignature = createHmac(
        "sha256",
        "checkout-secret"
    ).update(signedString).digest("base64");

    assert.equal(
        rental.checkout.fields.signature,
        expectedSignature
    );
});

test("SePay webhook verifies its secret without exposing it", () => {
    configureSePay();
    assert.doesNotThrow(() => verifyWebhookSecret("ipn-secret"));
    assert.throws(
        () => verifyWebhookSecret("wrong-secret"),
        /SEPAY_WEBHOOK_UNAUTHORIZED/
    );
});

test("SePay webhook rejects wrong amount, reference and purpose", () => {
    const payment = {
        paymentId: PAYMENT_ID,
        purpose: "RENTAL",
        amount: 350000,
    };
    const notification = parsePaymentNotification(
        createIpnPayload()
    );

    assert.doesNotThrow(() =>
        validatePaymentNotification(payment, notification)
    );
    assert.throws(
        () => validatePaymentNotification(
            { ...payment, amount: 349000 },
            notification
        ),
        /SEPAY_AMOUNT_MISMATCH/
    );
    assert.throws(
        () => validatePaymentNotification(
            { ...payment, purpose: "DEPOSIT" },
            notification
        ),
        /SEPAY_PURPOSE_MISMATCH/
    );
    assert.throws(
        () => parsePaymentNotification(
            createIpnPayload({ invoiceNumber: "invalid" })
        ),
        /SEPAY_REFERENCE_INVALID/
    );
});

test("payment success transition is idempotent for a duplicate reference", () => {
    assert.equal(
        getPaymentProcessingState(
            { status: "PENDING", transactionRef: null },
            "SEPAY-TXN-001"
        ),
        "PROCESS"
    );
    assert.equal(
        getPaymentProcessingState(
            {
                status: "SUCCEEDED",
                transactionRef: "SEPAY-TXN-001",
            },
            "SEPAY-TXN-001"
        ),
        "ALREADY_PROCESSED"
    );
    assert.throws(
        () => getPaymentProcessingState(
            {
                status: "SUCCEEDED",
                transactionRef: "SEPAY-TXN-001",
            },
            "SEPAY-TXN-002"
        ),
        /PAYMENT_ALREADY_PROCESSED/
    );
});

test("late rental payment never revives an EXPIRED order", () => {
    assert.equal(
        getRentalPaymentResolution(
            {
                status: "EXPIRED",
                items: [],
            },
            new Date("2026-09-01T08:00:00.000Z")
        ),
        "REFUND_ONLY"
    );
});

test("refund success persists SUCCEEDED state and transaction reference", async () => {
    let updateArgs;
    const completedAt = new Date("2026-09-01T08:00:00.000Z");
    const db = {
        refund: {
            update: async (args) => {
                updateArgs = args;
                return args.data;
            },
        },
    };

    await markRefundSucceeded(
        "refund-1",
        "SEPAY-REFUND-001",
        completedAt,
        db
    );

    assert.deepEqual(updateArgs.data, {
        status: "SUCCEEDED",
        transactionRef: "SEPAY-REFUND-001",
        completedAt,
    });
});

test("DIRECT deposit refund and additional payment never enter SePay", async () => {
    process.env.PAYMENT_GATEWAY = "SEPAY";
    delete process.env.SEPAY_MERCHANT_ID;
    delete process.env.SEPAY_SECRET_KEY;

    const directRefund = await createGatewayRefundRequest({
        paymentId: null,
        type: "DEPOSIT_RETURN",
        amount: 500000,
    });

    assert.equal(directRefund.gateway, null);
    assert.equal(
        directRefund.refundMode,
        "DIRECT_RECONCILIATION"
    );
    await assert.rejects(
        () => createGatewayPaymentRequest({
            paymentId: PAYMENT_ID,
            purpose: "ADDITIONAL",
            amount: 100000,
        }),
        /INVALID_PAYMENT_PURPOSE/
    );
});

test("SePay refunds stay pending for manual reconciliation when generic refund API is unavailable", async () => {
    configureSePay();

    const result = await createGatewayRefundRequest({
        paymentId: PAYMENT_ID,
        type: "RENTAL_REFUND",
        amount: 350000,
    });

    assert.equal(result.gateway, "SEPAY");
    assert.equal(result.refundMode, "MANUAL_RECONCILIATION");
    assert.equal(result.manualReconciliationRequired, true);
});
