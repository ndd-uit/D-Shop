import test from "node:test";
import assert from "node:assert/strict";
import {
    receiveRentalReturn,
    completeReturnedReservationBlocks,
    inspectRentalOrderItem,
} from "../src/modules/rental/rental.service.js";

const receivedAt = new Date("2026-09-14T09:00:00+07:00");
const fixture = () => {
    const unit = { rentalUnitId: "unit", status: "RENTED" };
    const reservation = {
        reservationId: "reservation", rentalUnitId: "unit", status: "ACTIVE",
        blockedEndAt: new Date("2026-09-13T18:00:00+07:00"), rentalUnit: unit,
        rentalOrderItem: { orderId: "order" },
    };
    const item = { orderItemId: "item", orderId: "order", inspectionResult: null, reservations: [reservation] };
    const order = { orderId: "order", status: "OVERDUE", actualReturnAt: null, items: [item] };
    const inspections = [];
    const tx = {
        rentalOrder: {
            findUnique: async () => order,
            update: async ({ data }) => Object.assign(order, data),
        },
        rentalOrderItem: { findFirst: async ({ where }) =>
            where.orderId === item.orderId && where.orderItemId === item.orderItemId ? item : null },
        rentalUnit: { updateMany: async ({ data }) => { Object.assign(unit, data); return { count: 1 }; } },
        rentalOrderStatusHistory: { create: async ({ data }) => data },
        rentalUnitStatusHistory: { create: async ({ data }) => data },
        reservation: {
            findMany: async ({ where }) => {
                assert.equal(where.rentalOrderItem.order.actualReturnAt.not, null);
                return order.actualReturnAt && reservation.status === where.status && reservation.blockedEndAt <= where.blockedEndAt.lte ? [reservation] : [];
            },
            updateMany: async ({ data }) => { Object.assign(reservation, data); return { count: 1 }; },
        },
        inspectionResult: { create: async ({ data }) => {
            inspections.push(data);
            item.inspectionResult = data;
            return data;
        } },
    };
    return { order, item, reservation, unit, inspections, db: { $transaction: async (fn) => fn(tx) } };
};
const inspect = (f, body = { condition: "Tốt", proposedCharge: 0 }) =>
    inspectRentalOrderItem("order", "item", "staff", body, f.db);

test("overdue return -> buffer job -> inspection succeeds on the original handed-over unit", async () => {
    const f = fixture();
    assert.equal((await completeReturnedReservationBlocks(receivedAt, f.db)).completedReservationCount, 0);
    await receiveRentalReturn("order", "staff", receivedAt, f.db);
    assert.equal(f.order.status, "INSPECTING");
    assert.equal(f.unit.status, "RETURN_INSPECTION");
    await completeReturnedReservationBlocks(receivedAt, f.db);
    assert.equal(f.reservation.status, "COMPLETED");
    f.item.reservations.unshift({ status: "RELEASED", rentalUnitId: "replaced-unit" });
    const result = await inspect(f, {
        condition: "Mất đồ", issueType: "LOST", description: "Khách báo mất đồ",
        evidenceUrls: ["evidence://order/proof.jpg"], proposedCharge: 250000,
    });
    assert.equal(result.orderStatus, "SETTLEMENT_PENDING");
    assert.equal(f.inspections.length, 1);
    assert.equal(f.inspections[0].rentalUnit.connect.rentalUnitId, "unit");
    assert.equal(f.inspections[0].proposedCharge, 250000);
    assert.equal(f.reservation.status, "COMPLETED");
    assert.equal(f.unit.status, "RETURN_INSPECTION");
});

test("inspection still works before buffer expires", async () => {
    const f = fixture();
    f.reservation.blockedEndAt = new Date("2026-09-15T18:00:00+07:00");
    await receiveRentalReturn("order", "staff", receivedAt, f.db);
    await completeReturnedReservationBlocks(receivedAt, f.db);
    assert.equal(f.reservation.status, "ACTIVE");
    await inspect(f);
    assert.equal(f.inspections.length, 1);
});

test("expired/released/unhanded reservations and ambiguous candidates cannot be inspected", async () => {
    for (const status of ["EXPIRED", "RELEASED", "CONFIRMED", "TEMPORARY_HOLD"]) {
        const f = fixture();
        await receiveRentalReturn("order", "staff", receivedAt, f.db);
        f.reservation.status = status;
        await assert.rejects(inspect(f), /INSPECTION_RESERVATION_NOT_FOUND/);
        assert.equal(f.inspections.length, 0);
    }
    const f = fixture();
    await receiveRentalReturn("order", "staff", receivedAt, f.db);
    f.item.reservations.push({ ...f.reservation, status: "COMPLETED" });
    await assert.rejects(inspect(f), /INSPECTION_RESERVATION_NOT_FOUND/);
    assert.equal(f.inspections.length, 0);
});

test("completed reservations do not bypass return, ownership, unit state or duplicate checks", async () => {
    for (const [mutate, expected] of [
        [(f) => { f.order.actualReturnAt = null; }, /INSPECTION_RESERVATION_NOT_FOUND/],
        [(f) => { f.order.status = "OVERDUE"; }, /INVALID_ORDER_STATUS/],
        [(f) => { f.item.orderId = "other-order"; }, /ORDER_ITEM_NOT_FOUND/],
        [(f) => { f.unit.status = "RENTED"; }, /INVALID_RENTAL_UNIT_STATUS/],
        [(f) => { f.item.inspectionResult = {}; }, /ITEM_ALREADY_INSPECTED/],
    ]) {
        const f = fixture();
        await receiveRentalReturn("order", "staff", receivedAt, f.db);
        await completeReturnedReservationBlocks(receivedAt, f.db);
        mutate(f);
        await assert.rejects(inspect(f), expected);
        assert.equal(f.inspections.length, 0);
    }
});

test("completed reservation still requires evidence for a proposed charge", async () => {
    const f = fixture();
    await receiveRentalReturn("order", "staff", receivedAt, f.db);
    await completeReturnedReservationBlocks(receivedAt, f.db);
    await assert.rejects(inspect(f, { condition: "Mất", issueType: "LOST", description: "Mất đồ", proposedCharge: 250000 }), /INSPECTION_EVIDENCE_REQUIRED/);
    assert.equal(f.inspections.length, 0);
});
