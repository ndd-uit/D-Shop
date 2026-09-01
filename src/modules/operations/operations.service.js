import {
    RefundType,
    RentalUnitStatus,
} from "../../generated/prisma/client.ts";
import {
    REPORT_ATTENTION_STATUSES,
    REPORT_ORDER_STATUSES,
    findAdditionalChargesInRange,
    findCollectedDepositsInRange,
    findOperationalRentalUnits,
    findOverdueOrders,
    findPopularGarmentItemsInRange,
    findReportOrdersInRange,
    findReportRefundsInRange,
    findReportRentalUnits,
    findSucceededPaymentsInRange,
    findSucceededRentalPaymentsInRange,
    findSucceededRefundsInRange,
} from "./operations.repository.js";

const STORE_TIME_ZONE = "Asia/Ho_Chi_Minh";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toLocalDateKey = (value) => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: STORE_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date(value));
    const values = Object.fromEntries(
        parts.map((part) => [part.type, part.value])
    );

    return `${values.year}-${values.month}-${values.day}`;
};

const parseFinancialDateRange = (from, to) => {
    if (
        !DATE_PATTERN.test(from ?? "") ||
        !DATE_PATTERN.test(to ?? "")
    ) {
        throw new Error("INVALID_FINANCIAL_DATE_RANGE");
    }

    const startAt = new Date(`${from}T00:00:00+07:00`);
    const endAt = new Date(`${to}T23:59:59.999+07:00`);

    if (
        Number.isNaN(startAt.getTime()) ||
        Number.isNaN(endAt.getTime()) ||
        toLocalDateKey(startAt) !== from ||
        toLocalDateKey(endAt) !== to ||
        startAt > endAt
    ) {
        throw new Error("INVALID_FINANCIAL_DATE_RANGE");
    }

    const rangeDays = Math.floor(
        (
            Date.parse(`${to}T00:00:00Z`) -
            Date.parse(`${from}T00:00:00Z`)
        ) / 86400000
    ) + 1;

    if (rangeDays > 366) {
        throw new Error("FINANCIAL_DATE_RANGE_TOO_LARGE");
    }

    return { startAt, endAt, rangeDays };
};

const createDailyPeriods = (from, rangeDays) => {
    const startCursor = new Date(`${from}T00:00:00Z`);

    return Array.from({ length: rangeDays }, (_, index) => {
        const cursor = new Date(
            startCursor.getTime() + index * 86400000
        );

        return {
            key: cursor.toISOString().slice(0, 10),
            label: new Intl.DateTimeFormat("vi-VN", {
                timeZone: "UTC",
                day: "2-digit",
                month: "2-digit",
            }).format(cursor),
            rentalRevenue: 0,
            additionalFees: 0,
            refunds: 0,
        };
    });
};

const buildManagerReport = ({
    from,
    to,
    rangeDays,
    orders,
    rentalPayments,
    additionalCharges,
    deposits,
    refunds,
    unitGroups,
    popularItems,
}) => {
    const periods = createDailyPeriods(from, rangeDays);
    const periodMap = new Map(
        periods.map((period) => [period.key, period])
    );

    for (const payment of rentalPayments) {
        const period = periodMap.get(toLocalDateKey(payment.paidAt));
        if (period) period.rentalRevenue += Number(payment.amount);
    }

    for (const order of additionalCharges) {
        const period = periodMap.get(
            toLocalDateKey(order.actualReturnAt)
        );
        if (period) {
            period.additionalFees += Number(order.additionalCharge);
        }
    }

    for (const refund of refunds) {
        const period = periodMap.get(
            toLocalDateKey(refund.completedAt)
        );
        if (period) period.refunds += Number(refund.amount);
    }

    const statusCounts = Object.fromEntries(
        REPORT_ORDER_STATUSES.map((status) => [status, 0])
    );
    for (const order of orders) {
        if (Object.hasOwn(statusCounts, order.status)) {
            statusCounts[order.status] += 1;
        }
    }

    const unitCounts = Object.fromEntries(
        unitGroups.map((group) => [
            group.status,
            group._count.rentalUnitId,
        ])
    );
    const inventory = {
        available: unitCounts[RentalUnitStatus.AVAILABLE] ?? 0,
        preparing: unitCounts[RentalUnitStatus.PREPARING] ?? 0,
        rented: unitCounts[RentalUnitStatus.RENTED] ?? 0,
        maintenanceRepair:
            (unitCounts[RentalUnitStatus.MAINTENANCE] ?? 0) +
            (unitCounts[RentalUnitStatus.DAMAGED] ?? 0),
    };

    const garmentMap = new Map();
    const popularOrders = new Map();
    for (const item of popularItems) {
        const rentalCount = item.reservations.length;
        if (!rentalCount) continue;
        const order = popularOrders.get(item.orderId) ?? {
            rentalAmount: Number(item.order.rentalAmount),
            items: [],
        };
        order.items.push({
            garment: item.garment,
            rentalCount,
            weight: Number(item.garment.rentalPrice) * rentalCount,
        });
        popularOrders.set(item.orderId, order);
    }

    for (const order of popularOrders.values()) {
        const totalWeight = order.items.reduce(
            (sum, item) => sum + item.weight,
            0
        );
        for (const item of order.items) {
            const current = garmentMap.get(item.garment.garmentId) ?? {
                garmentId: item.garment.garmentId,
                name: item.garment.name,
                rentalCount: 0,
                rentalRevenue: 0,
            };
            current.rentalCount += item.rentalCount;
            current.rentalRevenue += totalWeight > 0
                ? order.rentalAmount * item.weight / totalWeight
                : 0;
            garmentMap.set(item.garment.garmentId, current);
        }
    }

    const rentalRevenue = rentalPayments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
    );
    const additionalFees = additionalCharges.reduce(
        (sum, order) => sum + Number(order.additionalCharge),
        0
    );
    const collectedDeposits = deposits.reduce(
        (sum, order) => sum + Number(order.collectedDepositAmount),
        0
    );
    const totalRefunds = refunds.reduce(
        (sum, refund) => sum + Number(refund.amount),
        0
    );
    const returnedDeposits = refunds
        .filter((refund) => refund.type === RefundType.DEPOSIT_RETURN)
        .reduce((sum, refund) => sum + Number(refund.amount), 0);

    return {
        from,
        to,
        overview: {
            totalOrders: orders.length,
            rentalRevenue,
            additionalFees,
            collectedDeposits,
            returnedDeposits,
            totalRefunds,
        },
        orderStatus: REPORT_ORDER_STATUSES.map((status) => ({
            status,
            count: statusCounts[status],
        })),
        finance: { periods },
        inventory,
        popularGarments: [...garmentMap.values()]
            .sort((a, b) =>
                b.rentalCount - a.rentalCount ||
                b.rentalRevenue - a.rentalRevenue
            )
            .slice(0, 10),
        attentionOrders: orders.filter((order) =>
            REPORT_ATTENTION_STATUSES.includes(order.status)
        ),
    };
};

const getManagerReport = async (from, to) => {
    const { startAt, endAt, rangeDays } =
        parseFinancialDateRange(from, to);
    const [
        orders,
        rentalPayments,
        additionalCharges,
        deposits,
        refunds,
        unitGroups,
        popularItems,
    ] = await Promise.all([
        findReportOrdersInRange(startAt, endAt),
        findSucceededRentalPaymentsInRange(startAt, endAt),
        findAdditionalChargesInRange(startAt, endAt),
        findCollectedDepositsInRange(startAt, endAt),
        findReportRefundsInRange(startAt, endAt),
        findReportRentalUnits(),
        findPopularGarmentItemsInRange(startAt, endAt),
    ]);

    return buildManagerReport({
        from,
        to,
        rangeDays,
        orders,
        rentalPayments,
        additionalCharges,
        deposits,
        refunds,
        unitGroups,
        popularItems,
    });
};

const getFinancialOverview = async (from, to) => {
    const { startAt, endAt, rangeDays } =
        parseFinancialDateRange(from, to);
    const [payments, refunds] = await Promise.all([
        findSucceededPaymentsInRange(startAt, endAt),
        findSucceededRefundsInRange(startAt, endAt),
    ]);
    const startCursor = new Date(`${from}T00:00:00Z`);
    const periods = Array.from({ length: rangeDays }, (_, index) => {
        const cursor = new Date(
            startCursor.getTime() + index * 86400000
        );
        const key = cursor.toISOString().slice(0, 10);

        return {
            key,
            label: new Intl.DateTimeFormat("vi-VN", {
                timeZone: "UTC",
                day: "2-digit",
                month: "2-digit",
            }).format(cursor),
            collected: 0,
            refunded: 0,
            net: 0,
        };
    });
    const periodMap = new Map(
        periods.map((period) => [period.key, period])
    );

    for (const payment of payments) {
        const period = periodMap.get(
            toLocalDateKey(payment.paidAt)
        );
        if (period) {
            period.collected += Number(payment.amount);
        }
    }

    for (const refund of refunds) {
        const period = periodMap.get(
            toLocalDateKey(refund.completedAt)
        );
        if (period) {
            period.refunded += Number(refund.amount);
        }
    }

    for (const period of periods) {
        period.net = period.collected - period.refunded;
    }

    const summary = periods.reduce(
        (result, period) => ({
            collected: result.collected + period.collected,
            refunded: result.refunded + period.refunded,
            net: result.net + period.net,
        }),
        { collected: 0, refunded: 0, net: 0 }
    );

    return {
        from,
        to,
        periods,
        summary,
    };
};

const getOperationalDashboard = async () => {
    const overdueOrders = await findOverdueOrders();
    const units = await findOperationalRentalUnits();

    const rentalUnits = {
        [RentalUnitStatus.RENTED]: [],
        [RentalUnitStatus.CLEANING]: [],
        [RentalUnitStatus.MAINTENANCE]: [],
        [RentalUnitStatus.RETIRED]: [],
    };

    for (const unit of units) {
        rentalUnits[unit.status].push(unit);
    }

    return {
        overdueOrders,
        rentalUnits,
        summary: {
            overdueOrderCount:
                overdueOrders.length,
            rentedUnitCount:
                rentalUnits[RentalUnitStatus.RENTED]
                    .length,
            cleaningUnitCount:
                rentalUnits[RentalUnitStatus.CLEANING]
                    .length,
            maintenanceUnitCount:
                rentalUnits[
                    RentalUnitStatus.MAINTENANCE
                ].length,
            retiredUnitCount:
                rentalUnits[RentalUnitStatus.RETIRED]
                    .length,
        },
    };
};

export {
    buildManagerReport,
    getFinancialOverview,
    getManagerReport,
    getOperationalDashboard,
};
