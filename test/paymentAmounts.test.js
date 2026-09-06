import test from "node:test"
import assert from "node:assert/strict"
import { assertPaymentAmount, assertRentalOrderAmount } from "../src/utils/paymentAmounts.js"
import { startPaymentCheckout } from "../src/utils/paymentCheckout.js"

test("320k quote cannot be paid as an 80k order returned by an old backend", () => {
    assert.throws(() => assertRentalOrderAmount({ rentalAmount: 80000, upfrontAmount: 80000 }, 320000), { code: "PAYMENT_AMOUNT_MISMATCH" })
    assert.doesNotThrow(() => assertRentalOrderAmount({ rentalAmount: "320000", upfrontAmount: "320000" }, 320000))
})

test("checkout rejects stale Payment or SePay form before touching the browser", () => {
    const result = {
        payment: { status: "PENDING", amount: 80000 },
        checkout: { fields: { order_amount: "80000" } },
    }
    assert.throws(() => startPaymentCheckout(result, { expectedAmount: 320000 }), { code: "PAYMENT_AMOUNT_MISMATCH" })
    result.payment.amount = 320000
    assert.throws(() => startPaymentCheckout(result, { expectedAmount: 320000 }), { code: "PAYMENT_AMOUNT_MISMATCH" })
    result.checkout.fields.order_amount = "320000"
    assert.doesNotThrow(() => assertPaymentAmount(result, 320000))
})

test("succeeded payment never opens a new checkout", () => {
    assert.equal(startPaymentCheckout({ payment: { amount: 320000, status: "SUCCEEDED" } }, { expectedAmount: 320000 }), false)
})

test("deposit uses its own expected amount and malformed amounts are rejected", () => {
    assert.doesNotThrow(() => assertPaymentAmount({ payment: { amount: 250000 }, checkout: { fields: { order_amount: "250000" } } }, 250000))
    for (const amount of [undefined, null, 0, -1, "invalid"]) {
        assert.throws(() => assertPaymentAmount({ payment: { amount } }, 320000), { code: "PAYMENT_AMOUNT_MISMATCH" })
    }
})
