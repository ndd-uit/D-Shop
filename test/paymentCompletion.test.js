import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createRentalPayment, processRefundSucceeded } from "../src/modules/payment/payment.service.js";

const orderId = "10000000-0000-4000-8000-000000000001";
const refundId = "10000000-0000-4000-8000-000000000002";
const paymentId = "10000000-0000-4000-8000-000000000003";
const keys = ["PAYMENT_GATEWAY", "SEPAY_ENVIRONMENT", "SEPAY_MERCHANT_ID", "SEPAY_SECRET_KEY", "SEPAY_SUCCESS_URL", "SEPAY_ERROR_URL", "SEPAY_CANCEL_URL"];
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
afterEach(() => {
    for (const key of keys) {
        if (original[key] === undefined) delete process.env[key];
        else process.env[key] = original[key];
    }
});

const mockPaymentDb = ({ pendingAmount, expired = false, upfrontAmount = 320000 } = {}) => {
    Object.assign(process.env, {
        PAYMENT_GATEWAY: "SEPAY", SEPAY_ENVIRONMENT: "production",
        SEPAY_MERCHANT_ID: "test-only-merchant", SEPAY_SECRET_KEY: "test-only-secret",
        SEPAY_SUCCESS_URL: "https://dshop.test/success", SEPAY_ERROR_URL: "https://dshop.test/error", SEPAY_CANCEL_URL: "https://dshop.test/return",
    });
    const order = {
        orderId, status: "PENDING_PAYMENT", rentalAmount: 320000, upfrontAmount,
        depositAmount: 250000,
        items: [{ reservations: [{ status: "TEMPORARY_HOLD", holdExpiresAt: new Date(Date.now() + (expired ? -60000 : 60000)) }] }],
    };
    const payments = pendingAmount === undefined ? [] : [{ paymentId, rentalOrderId: orderId, purpose: "RENTAL", status: "PENDING", amount: pendingAmount }];
    const db = {
        rentalOrder: { findFirst: async () => order },
        payment: {
            findFirst: async ({ where }) => payments.find((p) => p.status === where.status && p.purpose === where.purpose) ?? null,
            create: async ({ data }) => { const p = { paymentId, ...data }; payments.push(p); return p; },
        },
    };
    return { payments, db: { $transaction: async (operation) => operation(db) } };
};

test("320k order produces a 320k Payment and signed SePay checkout, excluding deposit", async () => {
    const { payments, db } = mockPaymentDb();
    const result = await createRentalPayment(orderId, undefined, db);
    assert.equal(result.payment.amount, 320000);
    assert.equal(result.checkout.fields.order_amount, "320000");
    assert.equal(result.checkout.action, "https://pay.sepay.vn/v1/checkout/init");
    assert.equal(payments.length, 1);
});

test("an existing 80k Payment cannot be reused for a 320k order", async () => {
    const { payments, db } = mockPaymentDb({ pendingAmount: 80000 });
    await assert.rejects(createRentalPayment(orderId, undefined, db), /PAYMENT_AMOUNT_MISMATCH/);
    assert.equal(payments.length, 1);
    assert.equal(payments[0].amount, 80000);
});

test("matching pending payment is reused once but expired holds cannot reopen checkout", async () => {
    const { payments, db } = mockPaymentDb({ pendingAmount: 320000 });
    const result = await createRentalPayment(orderId, undefined, db);
    assert.equal(result.alreadyCreated, true);
    assert.equal(result.checkout.fields.order_amount, "320000");
    assert.equal(payments.length, 1);
    const expired = mockPaymentDb({ pendingAmount: 320000, expired: true });
    await assert.rejects(createRentalPayment(orderId, undefined, expired.db), /HOLD_EXPIRED/);
});

test("an inconsistent upfront snapshot is rejected instead of charging one daily rate", async () => {
    const { db } = mockPaymentDb({ upfrontAmount: 80000 });
    await assert.rejects(createRentalPayment(orderId, undefined, db), /PAYMENT_AMOUNT_MISMATCH/);
});

const mockRefundDb = ({ additionalPayment = 0, conflict = false, type = "DEPOSIT_RETURN" } = {}) => {
    const refund = { refundId, rentalOrderId: orderId, type, status: "PENDING", amount: 10000, transactionRef: null };
    const order = {
        orderId, status: "SETTLEMENT_PENDING", upfrontAmount: 80000,
        collectedDepositAmount: 10000, totalPaid: 90000,
        totalRefunded: 0, netCollected: 90000,
        depositRefundAmount: 10000, additionalPayment, refunds: [refund],
    };
    let updates = 0;
    const history = [];
    const db = {
        refund: {
            findUnique: async ({ where }) => where.refundId ? refund
                : conflict ? { refundId: paymentId }
                : refund.transactionRef === where.transactionRef ? refund : null,
            update: async ({ data }) => { updates++; Object.assign(refund, data); return { ...refund }; },
        },
        rentalOrder: {
            findUnique: async () => order,
            update: async ({ data }) => {
                if (data.totalRefunded) order.totalRefunded += Number(data.totalRefunded.increment);
                if (data.netCollected) order.netCollected -= Number(data.netCollected.decrement);
                if (data.status) order.status = data.status;
                return { ...order };
            },
        },
        rentalOrderStatusHistory: { create: async ({ data }) => { history.push(data); return data; } },
    };
    return {
        refund,
        order,
        history,
        db: { $transaction: async (operation) => operation(db) },
        get updates() { return updates; },
    };
};

test("manual deposit refund records the receipt and completes settlement exactly once", async () => {
    const state = mockRefundDb();
    const result = await processRefundSucceeded(refundId, " RECEIPT-001 ", state.db);
    assert.equal(result.refund.status, "SUCCEEDED");
    assert.equal(result.refund.transactionRef, "RECEIPT-001");
    assert.ok(result.refund.completedAt instanceof Date);
    assert.equal(result.completion.completed, true);
    assert.equal(state.order.status, "COMPLETED");
    assert.equal(state.order.totalRefunded, 10000);
    assert.equal(state.order.netCollected, 80000);
    const duplicate = await processRefundSucceeded(refundId, "RECEIPT-001", state.db);
    assert.equal(duplicate.alreadyProcessed, true);
    assert.equal(state.updates, 1);
    assert.equal(state.order.totalRefunded, 10000);
    assert.equal(state.history.length, 1);
});

test("refund confirmation does not complete an order with unpaid additional charges", async () => {
    const state = mockRefundDb({ additionalPayment: 5000 });
    const result = await processRefundSucceeded(refundId, "RECEIPT-002", state.db);
    assert.equal(result.completion.completed, false);
    assert.equal(state.order.status, "SETTLEMENT_PENDING");
});

test("missing or reused receipt references cannot mark a refund successful", async () => {
    const state = mockRefundDb({ conflict: true });
    await assert.rejects(processRefundSucceeded(refundId, " ", state.db), /TRANSACTION_REF_REQUIRED/);
    await assert.rejects(processRefundSucceeded(refundId, "ALREADY-USED", state.db), /TRANSACTION_REF_CONFLICT/);
    assert.equal(state.updates, 0);
    assert.equal(state.order.totalRefunded, 0);
});

test("rental refunds record funds returned without completing a rental settlement", async () => {
    const state = mockRefundDb({ type: "RENTAL_REFUND" });
    const result = await processRefundSucceeded(refundId, "RENTAL-REFUND-001", state.db);
    assert.equal(result.refund.status, "SUCCEEDED");
    assert.equal(result.completion, undefined);
    assert.equal(state.order.totalRefunded, 10000);
});
