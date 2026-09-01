import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import authorizeRole from "../src/middlewares/authorizeRole.js";
import {
    RENTAL_UNIT_STATUS_TRANSITIONS,
    ensureAutomaticRefund,
} from "../src/modules/rental/rental.service.js";
import {
    confirmAdditionalPaymentReceived,
} from "../src/modules/rental/rental.repository.js";
import {
    findAllActiveGarments,
    findGarmentById,
} from "../src/modules/garment/garment.repository.js";

const createRefundDb = ({ payments = [] } = {}) => {
    const paymentQueries = [];
    let refundData;

    return {
        paymentQueries,
        get refundData() {
            return refundData;
        },
        payment: {
            findFirst: async (args) => {
                paymentQueries.push(args);
                return payments.find((payment) =>
                    payment.purpose === args.where.purpose &&
                    payment.status === args.where.status
                ) ?? null;
            },
        },
        refund: {
            findFirst: async () => null,
            create: async ({ data }) => {
                refundData = data;
                return { refundId: "refund-1", ...data };
            },
        },
    };
};

test("gateway deposit refund links the successful DEPOSIT payment", async () => {
    const db = createRefundDb({
        payments: [
            {
                paymentId: "deposit-payment",
                purpose: "DEPOSIT",
                status: "SUCCEEDED",
            },
            {
                paymentId: "rental-payment",
                purpose: "RENTAL",
                status: "SUCCEEDED",
            },
        ],
    });

    await ensureAutomaticRefund({
        orderId: "order-1",
        type: "DEPOSIT_RETURN",
        amount: 500000,
        reason: "Deposit return",
        db,
    });

    assert.equal(db.refundData.paymentId, "deposit-payment");
    assert.deepEqual(
        db.paymentQueries.map((query) => query.where.purpose),
        ["DEPOSIT"]
    );
});

test("direct deposit refund keeps paymentId null and never links RENTAL payment", async () => {
    const db = createRefundDb({
        payments: [
            {
                paymentId: "rental-payment",
                purpose: "RENTAL",
                status: "SUCCEEDED",
            },
        ],
    });

    await ensureAutomaticRefund({
        orderId: "order-2",
        paymentId: "rental-payment",
        type: "DEPOSIT_RETURN",
        amount: 300000,
        reason: "Direct deposit return",
        db,
    });

    assert.equal(db.refundData.paymentId, null);
    assert.deepEqual(
        db.paymentQueries.map((query) => query.where.purpose),
        ["DEPOSIT"]
    );
});

test("rental refund still links the successful RENTAL payment", async () => {
    const db = createRefundDb({
        payments: [
            {
                paymentId: "rental-payment",
                purpose: "RENTAL",
                status: "SUCCEEDED",
            },
        ],
    });

    await ensureAutomaticRefund({
        orderId: "order-3",
        type: "RENTAL_REFUND",
        amount: 350000,
        reason: "Rental refund",
        db,
    });

    assert.equal(db.refundData.paymentId, "rental-payment");
});

test("additional payment persistence records amount, Staff actor and confirmation time", async () => {
    let updateArgs;
    const confirmedAt = new Date("2026-08-31T08:00:00.000Z");
    const db = {
        rentalOrder: {
            update: async (args) => {
                updateArgs = args;
                return args.data;
            },
        },
    };

    await confirmAdditionalPaymentReceived(
        "order-4",
        125000,
        "staff-1",
        confirmedAt,
        db
    );

    assert.equal(updateArgs.data.additionalPayment, 125000);
    assert.equal(updateArgs.data.additionalPaymentConfirmedBy, "staff-1");
    assert.equal(updateArgs.data.additionalPaymentConfirmedAt, confirmedAt);
    assert.deepEqual(updateArgs.data.totalPaid, { increment: 125000 });
});

test("FULFILLMENT_FAILED authorization rejects Manager and allows Rental Staff", () => {
    const middleware = authorizeRole("RENTAL_STAFF");
    let statusCode;
    let nextCalled = false;
    const res = {
        status(code) {
            statusCode = code;
            return this;
        },
        json() {
            return this;
        },
    };

    middleware({ user: { role: "STORE_MANAGER" } }, res, () => {
        nextCalled = true;
    });
    assert.equal(statusCode, 403);
    assert.equal(nextCalled, false);

    middleware({ user: { role: "RENTAL_STAFF" } }, res, () => {
        nextCalled = true;
    });
    assert.equal(nextCalled, true);
});

test("replacement and fulfillment-failed flows retain their finalized safeguards", () => {
    const service = readFileSync(
        new URL("../src/modules/rental/rental.service.js", import.meta.url),
        "utf8"
    );
    const routes = readFileSync(
        new URL("../src/modules/rental/rental.routes.js", import.meta.url),
        "utf8"
    );

    assert.match(service, /releaseReservationForReplacement\([\s\S]*?createReservation\(/);
    assert.match(service, /REPLACEMENT_UNIT_AVAILABLE/);
    assert.match(service, /releaseCurrentReservations\(itemIds, tx\)/);
    assert.match(service, /RentalOrderStatus\.FULFILLMENT_FAILED/);
    assert.match(
        routes,
        /fulfillment-failed"[\s\S]*?authenticate,[\s\S]*?staffOnly,/
    );
});

test("RETIRED has no outgoing lifecycle transition", () => {
    assert.equal(RENTAL_UNIT_STATUS_TRANSITIONS.RETIRED, undefined);
    assert.equal(
        Object.values(RENTAL_UNIT_STATUS_TRANSITIONS)
            .flat()
            .includes("RETIRED"),
        false
    );
});

test("public catalog requires both Garment and Category to be active", async () => {
    let listArgs;
    let detailArgs;
    const db = {
        garment: {
            findMany: async (args) => {
                listArgs = args;
                return [];
            },
            findFirst: async (args) => {
                detailArgs = args;
                return null;
            },
        },
    };

    await findAllActiveGarments({}, db);
    await findGarmentById("garment-1", db);

    assert.equal(listArgs.where.isActive, true);
    assert.equal(listArgs.where.category.isActive, true);
    assert.equal(detailArgs.where.isActive, true);
    assert.equal(detailArgs.where.category.isActive, true);
});
