import test from "node:test"
import assert from "node:assert/strict"
import {
    calculateRentalLineTotal,
    calculateRentalTotals,
    getRentalDayCount,
    getVietnamDateOnly,
} from "../src/utils/rentalPricing.js"
import { getDurationLabel } from "../src/components/rental/rentalOrderUtils.js"

for (const [start, end, days, amount] of [
    ["2026-09-06", "2026-09-06", 1, 80000],
    ["2026-09-02", "2026-09-03", 2, 160000],
    ["2026-09-06", "2026-09-12", 7, 560000],
    ["2026-09-30", "2026-10-02", 3, 240000],
    ["2026-12-31", "2027-01-01", 2, 160000],
    ["2028-02-28", "2028-03-01", 3, 240000],
    ["2026-02-28", "2026-03-01", 2, 160000],
]) {
    test(`cart and checkout quote ${amount} for ${start} to ${end}`, () => {
        const items = [{ quantity: 1, garment: { rentalPrice: "80000", depositAmount: "250000" } }]
        const apiStart = new Date(`${start}T08:00:00+07:00`).toISOString()
        const apiEnd = new Date(`${end}T18:00:00+07:00`).toISOString()
        assert.equal(getRentalDayCount(start, end), days)
        assert.equal(getRentalDayCount(apiStart, apiEnd), days)
        assert.equal(getDurationLabel(apiStart, apiEnd), `${days} ngày`)
        assert.deepEqual(calculateRentalTotals(items, days), {
            quantity: 1, rental: amount, deposit: 250000,
        })
    })
}

test("quantities and selected items multiply rental days but not deposit days", () => {
    const items = [
        { quantity: 2, garment: { rentalPrice: 80000, depositAmount: 250000 } },
        { quantity: 1, garment: { rentalPrice: 120000, depositAmount: 300000 } },
    ]
    assert.equal(calculateRentalLineTotal(80000, 2, 7), 1120000)
    assert.deepEqual(calculateRentalTotals(items.slice(0, 1), 7), {
        quantity: 2, rental: 1120000, deposit: 500000,
    })
    assert.deepEqual(calculateRentalTotals(items, 7), {
        quantity: 3, rental: 1960000, deposit: 800000,
    })
    assert.deepEqual(calculateRentalTotals([], 7), { quantity: 0, rental: 0, deposit: 0 })
})

test("calendar dates and billing stay in Vietnam time regardless of browser timezone", () => {
    assert.equal(getVietnamDateOnly("2026-09-05T18:00:00Z"), "2026-09-06")
    assert.equal(getRentalDayCount("2026-09-06T16:30:00Z", "2026-09-06T17:30:00Z"), 2)
    assert.equal(getRentalDayCount("2026-09-05T18:00:00Z", "2026-09-06T11:00:00Z"), 1)
})

test("missing or invalid dates cannot be presented as a valid one-day rental", () => {
    for (const [start, end] of [
        [null, null],
        ["", "2026-09-12"],
        ["2026-02-30", "2026-03-03"],
        ["2026-09-12", "2026-09-06"],
        ["invalid", "2026-09-12"],
        ["2026-09-06T01:00:00Z", "2026-09-06T01:00:00Z"],
    ]) {
        assert.equal(getRentalDayCount(start, end), 0)
    }
    assert.equal(getDurationLabel(null, null), "Chưa chọn")
    assert.equal(getDurationLabel("2026-09-12", "2026-09-06"), "Không hợp lệ")
})
