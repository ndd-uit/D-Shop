const formatCurrency = (value) => {
    const amount = Number(value)
    return Number.isFinite(amount) ? `${amount.toLocaleString("vi-VN")}đ` : "0đ"
}

const formatDateTime = (value) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return "Chưa cập nhật"

    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(date)
}

const formatDate = (value) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return "Chưa chọn"

    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "long",
    }).format(date)
}

const getCalendarDayOrdinal = (date) => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "numeric",
        day: "numeric",
    }).formatToParts(date)
    const values = Object.fromEntries(
        parts
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, Number(part.value)]),
    )

    return Math.floor(
        Date.UTC(values.year, values.month - 1, values.day) /
            (1000 * 60 * 60 * 24),
    )
}

const getDurationLabel = (startValue, endValue) => {
    const start = new Date(startValue)
    const end = new Date(endValue)
    const diffMs = end.getTime() - start.getTime()

    if (!Number.isFinite(diffMs) || diffMs <= 0) return "Không hợp lệ"

    const days = getCalendarDayOrdinal(end) - getCalendarDayOrdinal(start)

    return days > 0 ? `${days} ngày` : "Trong ngày"
}

const getFirstImage = (imageUrls) => {
    if (Array.isArray(imageUrls)) return imageUrls.find(Boolean) || ""
    if (typeof imageUrls !== "string" || !imageUrls.trim()) return ""

    const value = imageUrls.trim()

    if (value.startsWith("[")) {
        try {
            const parsed = JSON.parse(value)
            return Array.isArray(parsed) ? parsed.find(Boolean) || "" : value
        } catch {
            return value
        }
    }

    return value
}

const getOrderHoldExpiresAt = (order) => {
    const holdTimes = (order.items ?? [])
        .flatMap((item) => item.reservations ?? [])
        .filter(
            (reservation) =>
                reservation.status === "TEMPORARY_HOLD" &&
                reservation.holdExpiresAt,
        )
        .map((reservation) => reservation.holdExpiresAt)
        .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())

    return holdTimes[0] ?? null
}

export {
    formatCurrency,
    formatDate,
    formatDateTime,
    getDurationLabel,
    getFirstImage,
    getOrderHoldExpiresAt,
}
