const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const RETURN_BUSINESS_START_SECONDS = 8 * 60 * 60;
const RETURN_BUSINESS_END_SECONDS = 18 * 60 * 60;
const PICKUP_BUSINESS_END_HOUR = 18;

const getVietnamTimeOfDay = (value) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw new Error("INVALID_RETURN_TIME");
    }

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);
    const getPart = (type) => Number(
        parts.find((part) => part.type === type)?.value
    );

    return {
        date,
        hour: getPart("hour"),
        minute: getPart("minute"),
        second: getPart("second"),
    };
};

const assertReturnWithinBusinessHours = (value) => {
    const time = getVietnamTimeOfDay(value);
    const seconds =
        time.hour * 60 * 60 +
        time.minute * 60 +
        time.second +
        time.date.getUTCMilliseconds() / 1000;

    if (
        seconds < RETURN_BUSINESS_START_SECONDS ||
        seconds > RETURN_BUSINESS_END_SECONDS
    ) {
        throw new Error("RETURN_TIME_OUTSIDE_BUSINESS_HOURS");
    }

    return time.date;
};

const getPickupWindowEndAt = (rentalStartAt) => {
    const date = new Date(rentalStartAt);

    if (Number.isNaN(date.getTime())) {
        throw new Error("INVALID_RENTAL_PERIOD");
    }

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const getPart = (type) =>
        parts.find((part) => part.type === type)?.value;
    const vietnamDate = [
        getPart("year"),
        getPart("month"),
        getPart("day"),
    ].join("-");

    return new Date(
        `${vietnamDate}T${PICKUP_BUSINESS_END_HOUR}:00:00+07:00`
    );
};

const assertNoShowEligible = (order, value = new Date()) => {
    if (order.status !== "READY_FOR_PICKUP") {
        throw new Error("INVALID_ORDER_STATUS");
    }

    if (order.actualPickupAt) {
        throw new Error("ORDER_ALREADY_PICKED_UP");
    }

    if (
        Number(order.collectedDepositAmount) > 0 ||
        order.depositCollectedAt ||
        order.depositCollectionMethod
    ) {
        throw new Error("DEPOSIT_ALREADY_COLLECTED");
    }

    const now = new Date(value);

    if (Number.isNaN(now.getTime())) {
        throw new Error("INVALID_NO_SHOW_TIME");
    }

    if (now <= getPickupWindowEndAt(order.rentalStartAt)) {
        throw new Error("NO_SHOW_TOO_EARLY");
    }

    return now;
};

const parseVietnamDateAtHour = (value, hour) => {
    if (value instanceof Date) {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            throw new Error("INVALID_RENTAL_PERIOD");
        }

        return date;
    }

    if (typeof value !== "string") {
        throw new Error("INVALID_RENTAL_PERIOD");
    }

    const normalized = value.trim();
    const match = DATE_ONLY_PATTERN.exec(normalized);

    if (!match) {
        throw new Error("INVALID_RENTAL_PERIOD");
    }

    const [, yearText, monthText, dayText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const calendarCheck = new Date(Date.UTC(year, month - 1, day));

    if (
        calendarCheck.getUTCFullYear() !== year ||
        calendarCheck.getUTCMonth() !== month - 1 ||
        calendarCheck.getUTCDate() !== day
    ) {
        throw new Error("INVALID_RENTAL_PERIOD");
    }

    return new Date(
        `${normalized}T${String(hour).padStart(2, "0")}:00:00+07:00`
    );
};

const normalizeRentalPeriod = (
    rentalStartAt,
    returnDueAt
) => {
    const start = parseVietnamDateAtHour(
        rentalStartAt,
        8
    );
    const end = parseVietnamDateAtHour(
        returnDueAt,
        18
    );

    if (start >= end) {
        throw new Error("INVALID_RENTAL_PERIOD");
    }

    return {
        rentalStartAt: start,
        returnDueAt: end,
    };
};

const getReservationBlockPeriod = (
    rentalStartAt,
    returnDueAt
) => ({
    blockedStartAt: new Date(
        rentalStartAt.getTime() - ONE_DAY_MS
    ),
    blockedEndAt: new Date(
        returnDueAt.getTime() + ONE_DAY_MS
    ),
});

export {
    assertNoShowEligible,
    assertReturnWithinBusinessHours,
    getPickupWindowEndAt,
    getReservationBlockPeriod,
    normalizeRentalPeriod,
};
