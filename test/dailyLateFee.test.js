import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateLateFee } from "../src/modules/rental/rental.service.js";
import { validateLateFeePolicy } from "../src/modules/policy/policy.validator.js";
import { RENTAL_POLICY_V2 } from "../prisma/rental-policy-v2.js";
import { activateRentalPolicyV3 } from "../prisma/rental-policy-v3.js";

const dailyPolicy = { ...RENTAL_POLICY_V2.lateFeePolicy, basis: "DAILY_RENTAL_AMOUNT" };
const input = {
    rentalAmount: 320000,
    rentalStartAt: new Date("2026-09-10T08:00:00+07:00"),
    returnDueAt: new Date("2026-09-13T18:00:00+07:00"),
    lateFeePolicy: dailyPolicy,
};

for (const [at, fee, units] of [
    ["2026-09-13T18:00:00+07:00", 0, 0],
    ["2026-09-14T08:00:00+07:00", 40000, 0.5],
    ["2026-09-14T11:59:59+07:00", 40000, 0.5],
    ["2026-09-14T12:00:00+07:00", 40000, 0.5],
    ["2026-09-14T12:00:00.001+07:00", 80000, 1],
    ["2026-09-14T18:00:00+07:00", 80000, 1],
    ["2026-09-15T09:00:00+07:00", 120000, 1.5],
    ["2026-09-15T13:00:00+07:00", 160000, 2],
]) {
    test(`four days at 80k/day: return ${at} costs ${fee}`, () => {
        assert.deepEqual(calculateLateFee({ ...input, actualReturnAt: at }), { lateFee: fee, lateUnits: units });
    });
}

test("multiple items use the total daily snapshot, with one final VND rounding", () => {
    assert.equal(calculateLateFee({ ...input, rentalAmount: 920000, actualReturnAt: "2026-09-14T09:00:00+07:00" }).lateFee, 115000);
    assert.equal(calculateLateFee({ ...input, rentalAmount: 320004, actualReturnAt: "2026-09-14T09:00:00+07:00" }).lateFee, 40001);
});

test("single day and cross-month rentals use inclusive Vietnam dates without buffers", () => {
    for (const [start, due, returned, total] of [
        ["2026-09-13T08:00:00+07:00", "2026-09-13T18:00:00+07:00", "2026-09-14T08:00:00+07:00", 80000],
        ["2026-09-30T08:00:00+07:00", "2026-10-03T18:00:00+07:00", "2026-10-04T08:00:00+07:00", 320000],
    ]) {
        assert.equal(calculateLateFee({ ...input, rentalStartAt: new Date(start), returnDueAt: new Date(due), actualReturnAt: returned, rentalAmount: total }).lateFee, 40000);
    }
});

test("legacy policy keeps full-period fee and original noon boundary", () => {
    const legacy = { ...input, lateFeePolicy: RENTAL_POLICY_V2.lateFeePolicy };
    assert.equal(calculateLateFee({ ...legacy, actualReturnAt: "2026-09-14T09:00:00+07:00" }).lateFee, 160000);
    assert.equal(calculateLateFee({ ...legacy, actualReturnAt: "2026-09-14T12:00:00+07:00" }).lateFee, 320000);
});

test("daily policy rejects missing/invalid rental dates and retains business-hour checks", () => {
    for (const rentalStartAt of [undefined, new Date("invalid"), new Date("2026-09-15T08:00:00+07:00")]) {
        assert.throws(() => calculateLateFee({ ...input, rentalStartAt, actualReturnAt: "2026-09-14T09:00:00+07:00" }));
    }
    assert.throws(() => calculateLateFee({ ...input, actualReturnAt: "2026-09-14T07:59:00+07:00" }), /RETURN_TIME_OUTSIDE_BUSINESS_HOURS/);
    assert.doesNotThrow(() => validateLateFeePolicy(dailyPolicy));
    assert.throws(() => validateLateFeePolicy({ ...dailyPolicy, basis: "UNKNOWN" }), /INVALID_LATE_FEE_POLICY/);
});

test("settlement supplies order snapshot dates and attached policy to fee calculation", () => {
    const source = readFileSync(new URL("../src/modules/rental/rental.service.js", import.meta.url), "utf8");
    assert.match(source, /calculateLateFee\(\{\s*rentalAmount: order.rentalAmount,\s*rentalStartAt: order.rentalStartAt,\s*returnDueAt: order.returnDueAt,\s*actualReturnAt: order.actualReturnAt,\s*lateFeePolicy:\s*order.policy\?\.lateFeePolicy/);
});

const fakeDb = () => {
    const oldPolicy = { ...RENTAL_POLICY_V2, policyId: "old", effectiveTo: null, damageFeePolicy: "unchanged" };
    const policies = [oldPolicy];
    const updates = [];
    const tx = { rentalPolicy: {
        findUnique: async ({ where }) => policies.find((p) => p.version === where.version),
        findMany: async () => policies,
        create: async ({ data }) => { const policy = { ...data, policyId: "new" }; policies.push(policy); return policy; },
        update: async ({ where, data }) => { updates.push({ where, data }); Object.assign(policies.find((p) => p.policyId === where.policyId), data); },
    } };
    return { policies, updates, db: { $transaction: async (fn, options) => {
        assert.equal(options.isolationLevel, "Serializable"); return fn(tx);
    } } };
};

test("activation creates a new policy at activation time, preserves prior financial rules, reruns safely", async () => {
    const { db, policies, updates } = fakeDb();
    const now = new Date("2026-09-13T10:00:00Z");
    const result = await activateRentalPolicyV3(db, "manager", now);
    assert.equal(result.policy.lateFeePolicy.basis, "DAILY_RENTAL_AMOUNT");
    assert.equal(result.policy.effectiveFrom, now);
    assert.equal(result.policy.holdDuration, RENTAL_POLICY_V2.holdDuration);
    assert.equal(result.policy.approvalThreshold, RENTAL_POLICY_V2.approvalThreshold);
    assert.equal(result.policy.damageFeePolicy, "unchanged");
    assert.deepEqual(updates, [{ where: { policyId: "old" }, data: { effectiveTo: now } }]);
    assert.equal(policies[0].lateFeePolicy.basis, "RENTAL_AMOUNT");
    assert.equal((await activateRentalPolicyV3(db, "manager", new Date())).alreadyExists, true);
    assert.equal(policies.length, 2);
    assert.equal(updates.length, 1);
});

test("activation refuses a future timeline or conflicting existing v3 without writes", async () => {
    const fixture = fakeDb();
    fixture.policies.push({ ...fixture.policies[0], version: "future", effectiveFrom: new Date("2099-01-01") });
    await assert.rejects(activateRentalPolicyV3(fixture.db, "manager"), /FUTURE_POLICY_EXISTS/);
    assert.equal(fixture.updates.length, 0);
    fixture.policies[1].version = "v3.0";
    await assert.rejects(activateRentalPolicyV3(fixture.db, "manager"), /POLICY_V3_CONFLICT/);
    assert.equal(fixture.updates.length, 0);
});
