import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
    buildRentalOrderCreateData,
    calculateLateFee,
    completeRentalOrderIfReady,
    completeReturnedReservationBlocks,
    receiveRentalReturn,
} from "../src/modules/rental/rental.service.js";
import {
    findActiveRentalPolicy,
} from "../src/modules/availability/availability.repository.js";
import {
    findRentalPolicyByVersion,
} from "../src/modules/policy/policy.repository.js";
import {
    RENTAL_POLICY_V2,
    policyMatchesV2,
} from "../prisma/rental-policy-v2.js";
import {
    assertReturnWithinBusinessHours,
    getReservationBlockPeriod,
    normalizeRentalPeriod,
} from "../src/utils/rentalPeriod.js";
import { calculateSettlementAmounts } from "../src/utils/settlement.js";

const lateFeePolicy = {
    basis: "RENTAL_AMOUNT",
    timezone: "Asia/Ho_Chi_Minh",
    dueHour: 18,
    businessStartHour: 8,
    halfDayCutoffHour: 12,
    businessEndHour: 18,
    morningMultiplier: 0.5,
    afternoonMultiplier: 1,
    rounding: "HALF_UP_TO_VND",
};

const calculate = (actualReturnAt) =>
    calculateLateFee({
        rentalAmount: 350000,
        returnDueAt: "2026-09-03T18:00:00+07:00",
        actualReturnAt,
        lateFeePolicy,
    });

test("normalizes customer dates to Vietnam pickup/return hours", () => {
    const period = normalizeRentalPeriod(
        "2026-09-03",
        "2026-09-05"
    );

    assert.equal(
        period.rentalStartAt.toISOString(),
        "2026-09-03T01:00:00.000Z"
    );
    assert.equal(
        period.returnDueAt.toISOString(),
        "2026-09-05T11:00:00.000Z"
    );
});

test("reservation uses exactly one day before and after", () => {
    const period = normalizeRentalPeriod(
        "2026-09-03",
        "2026-09-05"
    );
    const block = getReservationBlockPeriod(
        period.rentalStartAt,
        period.returnDueAt
    );

    assert.equal(
        block.blockedStartAt.toISOString(),
        "2026-09-02T01:00:00.000Z"
    );
    assert.equal(
        block.blockedEndAt.toISOString(),
        "2026-09-06T11:00:00.000Z"
    );
});

test("rejects datetime input because customer selects dates only", () => {
    assert.throws(
        () => normalizeRentalPeriod(
            "2026-09-03T08:00:00+07:00",
            "2026-09-05T18:00:00+07:00"
        ),
        /INVALID_RENTAL_PERIOD/
    );
});

test("late fee boundaries follow the finalized half/full day rule", () => {
    assert.deepEqual(
        calculate("2026-09-03T18:00:00+07:00"),
        { lateFee: 0, lateUnits: 0 }
    );
    assert.deepEqual(
        calculate("2026-09-04T10:00:00+07:00"),
        { lateFee: 175000, lateUnits: 0.5 }
    );
    assert.deepEqual(
        calculate("2026-09-04T14:00:00+07:00"),
        { lateFee: 350000, lateUnits: 1 }
    );
    assert.deepEqual(
        calculate("2026-09-05T10:00:00+07:00"),
        { lateFee: 525000, lateUnits: 1.5 }
    );
    assert.deepEqual(
        calculate("2026-09-05T12:00:00+07:00"),
        { lateFee: 700000, lateUnits: 2 }
    );
});

test("rental policy v2 contains only the finalized late-fee structure", () => {
    assert.equal(
        policyMatchesV2({
            ...RENTAL_POLICY_V2,
            policyId: "00000000-0000-4000-8000-000000000100",
            effectiveTo: null,
        }),
        true
    );
    assert.equal(
        "gracePeriodHours" in RENTAL_POLICY_V2.lateFeePolicy,
        false
    );
    assert.equal(
        "unitHours" in RENTAL_POLICY_V2.lateFeePolicy,
        false
    );
    assert.equal(
        "feeRateBpsPerUnit" in RENTAL_POLICY_V2.lateFeePolicy,
        false
    );
});

test("active policy resolver selects v2 at the order creation time", async () => {
    const v2 = {
        policyId: "00000000-0000-4000-8000-000000000101",
        version: "v2.0",
    };
    let query;
    const db = {
        rentalPolicy: {
            findFirst: async (args) => {
                query = args;
                return v2;
            },
        },
    };
    const at = new Date("2026-08-28T10:00:00+07:00");

    const policy = await findActiveRentalPolicy(at, db);

    assert.equal(policy.version, "v2.0");
    assert.equal(query.where.effectiveFrom.lte, at);
    assert.equal(query.where.OR[1].effectiveTo.gt, at);
});

test("historical v1.1 remains readable by version", async () => {
    const historical = {
        policyId: "00000000-0000-4000-8000-000000000102",
        version: "v1.1",
    };
    const db = {
        rentalPolicy: {
            findUnique: async ({ where }) => {
                assert.deepEqual(where, { version: "v1.1" });
                return historical;
            },
        },
    };

    const policy = await findRentalPolicyByVersion("v1.1", db);

    assert.equal(policy.policyId, historical.policyId);
});

test("new rental order data snapshots the resolved v2 policy id", () => {
    const policy = {
        policyId: "00000000-0000-4000-8000-000000000103",
        version: "v2.0",
    };
    const data = buildRentalOrderCreateData({
        customerId: "00000000-0000-4000-8000-000000000104",
        policy,
        rentalStartAt: new Date("2026-09-03T08:00:00+07:00"),
        returnDueAt: new Date("2026-09-05T18:00:00+07:00"),
        pickupInfo: "Nhận tại cửa hàng",
        returnInfo: "Trả tại cửa hàng",
        rentalAmount: 350000,
        depositAmount: 500000,
    });

    assert.equal(data.policyId, policy.policyId);
    assert.equal(data.status, "PENDING_PAYMENT");
    assert.equal(data.upfrontAmount, 350000);
});

test("rejects a return time outside the defined 08:00-18:00 window", () => {
    assert.throws(
        () => calculate("2026-09-04T07:59:00+07:00"),
        /RETURN_TIME_OUTSIDE_BUSINESS_HOURS/
    );
});

test("return reception boundaries use Asia/Ho_Chi_Minh and include 08:00-18:00", () => {
    assert.throws(
        () => assertReturnWithinBusinessHours(
            "2026-09-04T07:59:59+07:00"
        ),
        /RETURN_TIME_OUTSIDE_BUSINESS_HOURS/
    );

    for (const accepted of [
        "2026-09-04T08:00:00+07:00",
        "2026-09-04T17:59:59+07:00",
        "2026-09-04T18:00:00+07:00",
    ]) {
        assert.doesNotThrow(
            () => assertReturnWithinBusinessHours(accepted)
        );
    }

    assert.throws(
        () => assertReturnWithinBusinessHours(
            "2026-09-04T18:00:01+07:00"
        ),
        /RETURN_TIME_OUTSIDE_BUSINESS_HOURS/
    );
});

test("receive return rejects outside business hours before opening a transaction", async () => {
    let transactionOpened = false;
    const db = {
        $transaction: async () => {
            transactionOpened = true;
        },
    };

    await assert.rejects(
        receiveRentalReturn(
            "00000000-0000-4000-8000-000000000001",
            "00000000-0000-4000-8000-000000000002",
            "2026-09-04T18:00:01+07:00",
            db
        ),
        /RETURN_TIME_OUTSIDE_BUSINESS_HOURS/
    );
    assert.equal(transactionOpened, false);
});

test("financially settled order completes while its reservation buffer remains active", async () => {
    const futureBlockEnd = new Date("2026-09-10T18:00:00+07:00");
    const updates = [];
    const histories = [];
    const tx = {
        rentalOrder: {
            findUnique: async () => ({
                orderId: "00000000-0000-4000-8000-000000000010",
                status: "SETTLEMENT_PENDING",
                upfrontAmount: 350000,
                collectedDepositAmount: 500000,
                depositRefundAmount: 0,
                additionalPayment: 0,
                totalPaid: 850000,
                refunds: [],
                items: [
                    {
                        reservations: [
                            {
                                status: "ACTIVE",
                                blockedEndAt: futureBlockEnd,
                            },
                        ],
                    },
                ],
            }),
            update: async (args) => {
                updates.push(args);
                return {
                    orderId:
                        "00000000-0000-4000-8000-000000000010",
                    status: args.data.status,
                };
            },
        },
        rentalOrderStatusHistory: {
            create: async ({ data }) => {
                histories.push(data);
                return data;
            },
        },
        reservation: {
            updateMany: async () => {
                throw new Error(
                    "Order completion must not complete reservations"
                );
            },
        },
    };
    const db = {
        $transaction: async (callback) => callback(tx),
    };

    const result = await completeRentalOrderIfReady(
        "00000000-0000-4000-8000-000000000010",
        db
    );

    assert.equal(result.completed, true);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].data.status, "COMPLETED");
    assert.equal(histories[0].newStatus, "COMPLETED");
});

test("reservation buffer job only completes returned active reservations after block end", async () => {
    const now = new Date("2026-09-10T18:00:00+07:00");
    let findArgs;
    let updateArgs;
    const tx = {
        reservation: {
            findMany: async (args) => {
                findArgs = args;
                return [
                    {
                        reservationId:
                            "00000000-0000-4000-8000-000000000020",
                        rentalOrderItem: {
                            orderId:
                                "00000000-0000-4000-8000-000000000021",
                        },
                    },
                ];
            },
            updateMany: async (args) => {
                updateArgs = args;
                return { count: 1 };
            },
        },
    };
    const db = {
        $transaction: async (callback) => callback(tx),
    };

    const result = await completeReturnedReservationBlocks(
        now,
        db
    );

    assert.equal(findArgs.where.status, "ACTIVE");
    assert.equal(findArgs.where.blockedEndAt.lte, now);
    assert.deepEqual(
        findArgs.where.rentalOrderItem.order.actualReturnAt,
        { not: null }
    );
    assert.equal(updateArgs.data.status, "COMPLETED");
    assert.equal(result.completedReservationCount, 1);
    assert.equal(result.completedReservationOrderCount, 1);
});

test("legacy cancellation fixture is deleted explicitly and never mapped to NO_SHOW", () => {
    const migration = readFileSync(
        new URL(
            "../prisma/migrations/20260828090000_finalize_rental_business_flow/migration.sql",
            import.meta.url
        ),
        "utf8"
    );
    const fixtureId =
        "5b70ae6c-d62d-407e-a687-319f30338a41";

    assert.match(
        migration,
        new RegExp(
            `DELETE FROM "rental_orders"[\\s\\S]*?${fixtureId}`
        )
    );
    assert.doesNotMatch(
        migration,
        new RegExp(
            `WHEN "order_id" = '${fixtureId}'[\\s\\S]{0,160}NO_SHOW`
        )
    );
    assert.match(
        migration,
        /9b3c1a5b-aa99-4b9b-9cd3-659f3cd719d9'[\s\S]{0,160}EXPIRED/
    );
    assert.match(
        migration,
        /4a7d504f-8e60-4d2e-955e-9b45aa1285d0'[\s\S]{0,160}FULFILLMENT_FAILED/
    );
});

test("settlement uses the collected deposit rather than the required deposit", () => {
    assert.deepEqual(
        calculateSettlementAmounts({
            rentalAmount: 350000,
            collectedDepositAmount: 500000,
            additionalCharge: 235000,
        }),
        {
            additionalCharge: 235000,
            depositRefundAmount: 265000,
            additionalPayment: 0,
            finalCharge: 585000,
        }
    );

    assert.deepEqual(
        calculateSettlementAmounts({
            rentalAmount: 350000,
            collectedDepositAmount: 500000,
            additionalCharge: 850000,
        }),
        {
            additionalCharge: 850000,
            depositRefundAmount: 0,
            additionalPayment: 350000,
            finalCharge: 1200000,
        }
    );
});
