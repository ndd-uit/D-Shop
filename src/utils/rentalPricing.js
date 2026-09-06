const ONE_DAY_MS = 24 * 60 * 60 * 1000
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const vietnamDateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
})

const getVietnamDateOnly = (value) => {
    if (!value) return ""
    const date = new Date(value)
    if (!Number.isFinite(date.getTime())) return ""

    const parts = Object.fromEntries(
        vietnamDateFormatter.formatToParts(date)
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, part.value]),
    )
    return `${parts.year}-${parts.month}-${parts.day}`
}

const parseRentalDate = (value, hour) => {
    if (!value) return null
    const dateOnly = typeof value === "string" && DATE_ONLY_PATTERN.test(value)
    const date = new Date(dateOnly ? `${value}T${hour}:00:00+07:00` : value)
    if (!Number.isFinite(date.getTime())) return null
    if (dateOnly && getVietnamDateOnly(date) !== value) return null
    return date
}

// Same inclusive Vietnam calendar-day rule used when the backend creates an order.
const getRentalDayCount = (startValue, endValue) => {
    const start = parseRentalDate(startValue, "08")
    const end = parseRentalDate(endValue, "18")
    if (!start || !end || end <= start) return 0

    const ordinal = (date) => Date.parse(getVietnamDateOnly(date)) / ONE_DAY_MS
    return ordinal(end) - ordinal(start) + 1
}

const calculateRentalLineTotal = (dailyPrice, quantity, rentalDays) =>
    (Number(dailyPrice) || 0) * (Number(quantity) || 0) * rentalDays

const calculateRentalTotals = (items, rentalDays) => items.reduce(
    (totals, item) => {
        const quantity = Number(item.quantity) || 0
        totals.quantity += quantity
        totals.rental += calculateRentalLineTotal(
            item.garment?.rentalPrice, quantity, rentalDays,
        )
        totals.deposit += (Number(item.garment?.depositAmount) || 0) * quantity
        return totals
    },
    { quantity: 0, rental: 0, deposit: 0 },
)

export {
    calculateRentalLineTotal,
    calculateRentalTotals,
    getRentalDayCount,
    getVietnamDateOnly,
}
