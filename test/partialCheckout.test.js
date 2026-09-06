import test from "node:test";
import assert from "node:assert/strict";
import {
    createRental,
    normalizeSelectedCartItemIds,
    selectCartItemsForCheckout,
} from "../src/modules/rental/rental.service.js";

const IDS = {
    customer: "10000000-0000-4000-8000-000000000001",
    cart: "10000000-0000-4000-8000-000000000002",
    itemA: "10000000-0000-4000-8000-000000000003",
    itemB: "10000000-0000-4000-8000-000000000004",
    foreignItem: "10000000-0000-4000-8000-000000000005",
    garmentA: "10000000-0000-4000-8000-000000000006",
    garmentB: "10000000-0000-4000-8000-000000000007",
    unitA: "10000000-0000-4000-8000-000000000008",
    unitB: "10000000-0000-4000-8000-000000000009",
    policy: "10000000-0000-4000-8000-000000000010",
};

const createCartItem = ({
    cartItemId,
    garmentId,
    rentalPrice,
    depositAmount,
}) => ({
    cartItemId,
    cartId: IDS.cart,
    garmentId,
    requestedSize: "M",
    quantity: 1,
    garment: {
        garmentId,
        rentalPrice,
        depositAmount,
    },
});

const initialCart = () => ({
    cartId: IDS.cart,
    customerId: IDS.customer,
    rentalStartAt: new Date("2026-09-10T01:00:00.000Z"),
    returnDueAt: new Date("2026-09-12T11:00:00.000Z"),
    items: [
        createCartItem({
            cartItemId: IDS.itemA,
            garmentId: IDS.garmentA,
            rentalPrice: 350000,
            depositAmount: 500000,
        }),
        createCartItem({
            cartItemId: IDS.itemB,
            garmentId: IDS.garmentB,
            rentalPrice: 200000,
            depositAmount: 300000,
        }),
    ],
});

const createFakeDb = ({ unavailableGarmentId = null, unitCount = 1 } = {}) => {
    const state = {
        cart: initialCart(),
        orders: [],
        orderItems: [],
        reservations: [],
        histories: [],
    };

    const db = {
        state,
        $transaction: async (callback) => {
            const draft = structuredClone(state);
            const tx = {
                rentalCart: {
                    findUnique: async ({ where }) =>
                        where.customerId === draft.cart.customerId
                            ? draft.cart
                            : null,
                },
                rentalPolicy: {
                    findFirst: async () => ({
                        policyId: IDS.policy,
                        version: "v2.0",
                        holdDuration: 15,
                    }),
                },
                rentalUnit: {
                    findMany: async ({ where }) => {
                        if (where.garmentId === unavailableGarmentId) {
                            return [];
                        }

                        const baseId = where.garmentId === IDS.garmentA
                            ? IDS.unitA
                            : IDS.unitB;
                        return Array.from({ length: unitCount }, (_, index) => ({
                            rentalUnitId: baseId.slice(0, -12) + String(
                                Number(baseId.slice(-12)) + index * 2
                            ).padStart(12, "0"),
                        }));
                    },
                },
                rentalOrder: {
                    create: async ({ data }) => {
                        const order = {
                            ...data,
                            orderId: `20000000-0000-4000-8000-${String(
                                draft.orders.length + 1
                            ).padStart(12, "0")}`,
                        };
                        draft.orders.push(order);
                        return order;
                    },
                },
                rentalOrderItem: {
                    create: async ({ data }) => {
                        const item = {
                            ...data,
                            orderItemId: `30000000-0000-4000-8000-${String(
                                draft.orderItems.length + 1
                            ).padStart(12, "0")}`,
                        };
                        draft.orderItems.push(item);
                        return item;
                    },
                },
                reservation: {
                    create: async ({ data }) => {
                        draft.reservations.push(data);
                        return data;
                    },
                },
                rentalOrderStatusHistory: {
                    create: async ({ data }) => {
                        draft.histories.push(data);
                        return data;
                    },
                },
                rentalCartItem: {
                    deleteMany: async ({ where }) => {
                        const before = draft.cart.items.length;
                        draft.cart.items = draft.cart.items.filter(
                            (item) =>
                                item.cartId !== where.cartId ||
                                !where.cartItemId.in.includes(item.cartItemId)
                        );
                        return {
                            count: before - draft.cart.items.length,
                        };
                    },
                },
            };

            const result = await callback(tx);
            Object.assign(state, draft);
            return result;
        },
    };

    return db;
};

const checkout = (selectedCartItemIds, db) =>
    createRental(
        IDS.customer,
        "Nhận tại D Shop",
        "Trả tại D Shop",
        selectedCartItemIds,
        db
    );

test("partial checkout creates an order from one selected item only", async () => {
    const db = createFakeDb();

    const result = await checkout([IDS.itemA], db);

    assert.equal(result.order.rentalAmount, 1050000);
    assert.equal(result.order.upfrontAmount, 1050000);
    assert.equal(result.order.depositAmount, 500000);
    assert.equal(db.state.orderItems.length, 1);
    assert.equal(db.state.orderItems[0].garmentId, IDS.garmentA);
});

test("partial checkout supports multiple selected items", async () => {
    const db = createFakeDb();

    const result = await checkout([IDS.itemA, IDS.itemB], db);

    assert.equal(result.order.rentalAmount, 1650000);
    assert.equal(result.order.upfrontAmount, 1650000);
    assert.equal(result.order.depositAmount, 800000);
    assert.equal(db.state.orderItems.length, 2);
    assert.equal(db.state.reservations.length, 2);
});

for (const scenario of [
    { start: "2026-09-06", end: "2026-09-06", quantity: 1, price: 80000, rental: 80000, deposit: 250000 },
    { start: "2026-09-02", end: "2026-09-03", quantity: 1, price: 80000, rental: 160000, deposit: 250000 },
    { start: "2026-09-06", end: "2026-09-12", quantity: 1, price: 80000, rental: 560000, deposit: 250000 },
    { start: "2026-09-06", end: "2026-09-12", quantity: 2, price: 80000, rental: 1120000, deposit: 500000 },
    { start: "2026-09-06", end: "2026-09-12", quantity: 1, price: 120000, rental: 840000, deposit: 250000 },
]) {
    test(`checkout bills ${scenario.start} to ${scenario.end}, ${scenario.quantity} units at ${scenario.price}/day`, async () => {
        const db = createFakeDb({ unitCount: scenario.quantity });
        db.state.cart.rentalStartAt = new Date(`${scenario.start}T08:00:00+07:00`);
        db.state.cart.returnDueAt = new Date(`${scenario.end}T18:00:00+07:00`);
        db.state.cart.items[0].quantity = scenario.quantity;
        db.state.cart.items[0].garment.rentalPrice = scenario.price;
        db.state.cart.items[0].garment.depositAmount = 250000;

        const { order } = await checkout([IDS.itemA], db);

        assert.equal(order.rentalAmount, scenario.rental);
        assert.equal(order.upfrontAmount, scenario.rental);
        assert.equal(order.depositAmount, scenario.deposit);
        assert.equal(db.state.orderItems.length, scenario.quantity);
        assert.equal(db.state.reservations.length, scenario.quantity);
        // The two reservation buffer dates must not be billed.
        assert.equal(
            db.state.reservations[0].blockedStartAt.getTime(),
            db.state.cart.rentalStartAt.getTime() - 86400000,
        );
    });
}

test("checkout rejects an inverted rental period before creating an order", async () => {
    const db = createFakeDb();
    db.state.cart.returnDueAt = new Date("2026-09-09T11:00:00Z");
    await assert.rejects(checkout([IDS.itemA], db), /INVALID_RENTAL_PERIOD/);
    assert.equal(db.state.orders.length, 0);
    assert.equal(db.state.cart.items.length, 2);
});

test("unselected items and the cart rental period remain after checkout", async () => {
    const db = createFakeDb();
    const rentalStartAt = db.state.cart.rentalStartAt.toISOString();
    const returnDueAt = db.state.cart.returnDueAt.toISOString();

    await checkout([IDS.itemA], db);

    assert.deepEqual(
        db.state.cart.items.map((item) => item.cartItemId),
        [IDS.itemB]
    );
    assert.equal(db.state.cart.rentalStartAt.toISOString(), rentalStartAt);
    assert.equal(db.state.cart.returnDueAt.toISOString(), returnDueAt);
});

test("unknown or foreign cart item ids are rejected", async () => {
    const db = createFakeDb();

    await assert.rejects(
        checkout([IDS.foreignItem], db),
        /CART_ITEM_NOT_FOUND/
    );
    assert.equal(db.state.orders.length, 0);
    assert.equal(db.state.cart.items.length, 2);

    assert.throws(
        () => selectCartItemsForCheckout(initialCart(), [IDS.foreignItem]),
        /CART_ITEM_NOT_FOUND/
    );
});

test("an availability failure rolls back the whole checkout", async () => {
    const db = createFakeDb({
        unavailableGarmentId: IDS.garmentB,
    });

    await assert.rejects(
        checkout([IDS.itemA, IDS.itemB], db),
        /AVAILABILITY_CONFLICT/
    );
    assert.equal(db.state.orders.length, 0);
    assert.equal(db.state.orderItems.length, 0);
    assert.equal(db.state.reservations.length, 0);
    assert.equal(db.state.cart.items.length, 2);
});

test("duplicate selected cart item ids are rejected before transaction", async () => {
    let transactionOpened = false;
    const db = {
        $transaction: async () => {
            transactionOpened = true;
        },
    };

    await assert.rejects(
        checkout([IDS.itemA, IDS.itemA], db),
        /DUPLICATE_CART_ITEM_IDS/
    );
    assert.equal(transactionOpened, false);

    assert.throws(
        () => normalizeSelectedCartItemIds([]),
        /SELECTED_CART_ITEMS_REQUIRED/
    );
});
