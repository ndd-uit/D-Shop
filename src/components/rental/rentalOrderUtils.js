import { getRentalDayCount } from "../../utils/rentalPricing.js"

const formatCurrency = (value) => {
    const amount = Number(value)
    return Number.isFinite(amount) ? `${amount.toLocaleString("vi-VN")}đ` : "0đ"
}

const formatDateTime = (value) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return "Chưa cập nhật"

    return new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        dateStyle: "short",
        timeStyle: "short",
    }).format(date)
}

const formatDate = (value) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return "Chưa chọn"

    return new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        dateStyle: "long",
    }).format(date)
}

const getDurationLabel = (startValue, endValue) => {
    if (!startValue || !endValue) return "Chưa chọn"
    const days = getRentalDayCount(startValue, endValue)
    return days > 0 ? `${days} ngày` : "Không hợp lệ"
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
