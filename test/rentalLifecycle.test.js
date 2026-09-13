import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setImmediate } from "node:timers/promises";
import { createRentalLifecycleJob } from "../src/jobs/expireTemporaryHolds.job.js";
import { markOverdueRentalOrders } from "../src/modules/rental/rental.service.js";
import { RentalOrderStatus } from "../src/generated/prisma/client.ts";
import { buildManagerReport } from "../src/modules/operations/operations.service.js";

test("server startup actually starts the rental lifecycle job", () => {
    const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
    assert.match(app, /app\.listen\([\s\S]*?=>\s*\{\s*startExpireTemporaryHoldsJob\(\)/);
});

test("job starts immediately, schedules each minute and starts only once", async () => {
    const calls = [];
    let callback;
    let schedules = 0;
    let cancellations = 0;
    const timer = { unref() { calls.push("unref"); } };
    const job = createRentalLifecycleJob({
        expire: async () => { calls.push("expire"); return { expiredCount: 1 }; },
        markOverdue: async () => { calls.push("overdue"); return { overdueCount: 2 }; },
        completeReturned: async () => { calls.push("complete"); return { completedReservationCount: 3 }; },
        schedule(fn, ms) {
            callback = fn;
            schedules += 1;
            assert.equal(ms, 60_000);
            return timer;
        },
        cancel(handle) { assert.equal(handle, timer); cancellations += 1; },
    });
    assert.equal(job.start(), timer);
    assert.equal(job.start(), timer);
    await setImmediate();
    assert.equal(schedules, 1);
    assert.deepEqual(calls, ["unref", "expire", "overdue", "complete"]);
    callback();
    await setImmediate();
    assert.deepEqual(calls.slice(4), ["expire", "overdue", "complete"]);
    await job.stop();
    assert.equal(cancellations, 1);
});

test("overlapping ticks skip and stop waits for the in-flight tick", async () => {
    let release;
    const pending = new Promise((resolve) => { release = resolve; });
    const job = createRentalLifecycleJob({
        expire: () => pending,
        markOverdue: async () => ({ overdueCount: 1 }),
        completeReturned: async () => ({ completedReservationCount: 1 }),
    });
    const first = job.tick();
    assert.deepEqual(await job.tick(), { skipped: true });
    let stopped = false;
    const stopping = job.stop().then(() => { stopped = true; });
    await setImmediate();
    assert.equal(stopped, false);
    release({ expiredCount: 1 });
    assert.deepEqual(await first, { expiredCount: 1, overdueCount: 1, completedReservationCount: 1 });
    await stopping;
    assert.equal(stopped, true);
});

test("one failed task does not block others or leak the error, next tick recovers", async () => {
    let fail = true;
    const logs = [];
    const job = createRentalLifecycleJob({
        expire: async () => {
            if (fail) throw new Error("postgresql://secret@host/private");
            return { expiredCount: 1 };
        },
        markOverdue: async () => ({ overdueCount: 2 }),
        completeReturned: async () => ({ completedReservationCount: 3 }),
        logger: { error: (...args) => logs.push(args) },
    });
    assert.deepEqual(await job.tick(), { failed: true, overdueCount: 2, completedReservationCount: 3 });
    assert.doesNotMatch(JSON.stringify(logs), /secret|postgresql/);
    fail = false;
    assert.deepEqual(await job.tick(), { expiredCount: 1, overdueCount: 2, completedReservationCount: 3 });
});

test("overdue update rechecks eligibility and records history only once", async () => {
    const now = new Date("2026-09-13T12:00:00Z");
    const orders = [
        { orderId: "eligible", status: "RENTING", actualReturnAt: null, returnDueAt: new Date(now - 1) },
        { orderId: "returned", status: "RETURNED", actualReturnAt: now, returnDueAt: new Date(now - 1) },
        { orderId: "due-now", status: "RENTING", actualReturnAt: null, returnDueAt: now },
    ];
    const histories = [];
    const tx = {
        rentalOrder: {
            findMany: async ({ where }) => {
                assert.equal(where.status, "RENTING");
                assert.equal(where.actualReturnAt, null);
                assert.equal(where.returnDueAt.lt, now);
                return orders; // Deliberately stale candidates, simulating another worker.
            },
            updateMany: async ({ where, data }) => {
                assert.equal(where.status, "RENTING");
                assert.equal(where.actualReturnAt, null);
                assert.equal(where.returnDueAt.lt, now);
                const order = orders.find((item) => item.orderId === where.orderId);
                if (order.status !== where.status || order.actualReturnAt || order.returnDueAt >= now) return { count: 0 };
                order.status = data.status;
                return { count: 1 };
            },
        },
        rentalOrderStatusHistory: { create: async ({ data }) => histories.push(data) },
    };
    const db = { $transaction: (fn) => fn(tx) };
    assert.deepEqual(await markOverdueRentalOrders(now, db), { overdueCount: 1 });
    assert.deepEqual(await markOverdueRentalOrders(now, db), { overdueCount: 0 });
    assert.equal(histories.length, 1);
    assert.equal(histories[0].changedBy, null);
    assert.equal(histories[0].newStatus, "OVERDUE");
    assert.equal(orders[1].status, "RETURNED");
    assert.equal(orders[2].status, "RENTING");
});

test("report accounts for every order status and reconciles to totalOrders", () => {
    const statuses = Object.values(RentalOrderStatus);
    const report = buildManagerReport({
        from: "2026-09-13", to: "2026-09-13", rangeDays: 1,
        orders: statuses.map((status) => ({ status })),
        rentalPayments: [], additionalCharges: [], deposits: [], refunds: [],
        unitGroups: [], popularItems: [],
    });
    assert.deepEqual(new Set(report.orderStatus.map((item) => item.status)), new Set(statuses));
    assert.equal(report.orderStatus.reduce((sum, item) => sum + item.count, 0), report.overview.totalOrders);
    for (const item of report.orderStatus) assert.equal(item.count, 1);
});
