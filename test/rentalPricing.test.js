import test from "node:test";
import assert from "node:assert/strict";
import { getRentalDayCount } from "../src/utils/rentalPeriod.js";

for (const [start, end, expected] of [
    ["2026-09-06", "2026-09-06", 1],
    ["2026-09-02", "2026-09-03", 2],
    ["2026-09-06", "2026-09-12", 7],
    ["2026-09-30", "2026-10-02", 3],
    ["2026-12-31", "2027-01-01", 2],
    ["2028-02-28", "2028-03-01", 3],
    ["2026-02-28", "2026-03-01", 2],
]) {
    test(`rental period ${start} to ${end} bills ${expected} calendar dates`, () => {
        assert.equal(getRentalDayCount(start, end), expected);
        assert.equal(getRentalDayCount(
            new Date(`${start}T08:00:00+07:00`),
            new Date(`${end}T18:00:00+07:00`),
        ), expected);
    });
}

test("billing uses Vietnam calendar dates rather than UTC dates or rounded 24-hour periods", () => {
    // 23:30 Sep 6 to 00:30 Sep 7 in Vietnam; both timestamps have the same UTC date.
    assert.equal(getRentalDayCount(
        new Date("2026-09-06T16:30:00Z"),
        new Date("2026-09-06T17:30:00Z"),
    ), 2);
    // These two timestamps span UTC midnight, but share the same Vietnam date.
    assert.equal(getRentalDayCount(
        new Date("2026-09-05T18:00:00Z"),
        new Date("2026-09-06T11:00:00Z"),
    ), 1);
});

test("invalid or missing periods never produce a rental charge", () => {
    for (const [start, end] of [
        [null, "2026-09-12"],
        ["", "2026-09-12"],
        ["2026-02-30", "2026-03-03"],
        ["2026-09-12", "2026-09-06"],
        [new Date(NaN), new Date("2026-09-12")],
        [new Date("2026-09-06T01:00:00Z"), new Date("2026-09-06T01:00:00Z")],
    ]) {
        assert.throws(() => getRentalDayCount(start, end), /INVALID_RENTAL_PERIOD/);
    }
});
