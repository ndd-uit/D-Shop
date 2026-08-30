import { useEffect, useMemo, useState } from "react"
import { Clock3 } from "lucide-react"

const getRemaining = (expiresAt, currentTime) => {
    if (currentTime === null) {
        return {
            expired: false,
            label: "Đang đồng bộ...",
        }
    }

    const remainingMs = new Date(expiresAt).getTime() - currentTime

    if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
        return {
            expired: true,
            label: "Đã hết thời gian giữ chỗ",
        }
    }

    const totalSeconds = Math.ceil(remainingMs / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const clock = [minutes, seconds]
        .map((value) => String(value).padStart(2, "0"))
        .join(":")

    return {
        expired: false,
        label: hours > 0 ? `${hours}:${clock}` : clock,
    }
}

function OrderHoldCountdown({ expiresAt, onExpiryChange }) {
    const [currentTime, setCurrentTime] = useState(null)

    useEffect(() => {
        const initialTimerId = window.setTimeout(
            () => setCurrentTime(Date.now()),
            0,
        )
        const intervalId = window.setInterval(
            () => setCurrentTime(Date.now()),
            1000,
        )

        return () => {
            window.clearTimeout(initialTimerId)
            window.clearInterval(intervalId)
        }
    }, [])

    const remaining = useMemo(
        () => getRemaining(expiresAt, currentTime),
        [currentTime, expiresAt],
    )

    useEffect(() => {
        const timerId = window.setTimeout(
            () => onExpiryChange?.(remaining.expired),
            0,
        )

        return () => window.clearTimeout(timerId)
    }, [onExpiryChange, remaining.expired])

    return (
        <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums ${
                remaining.expired ? "text-red-700" : "text-[#a9544d]"
            }`}
        >
            <Clock3 size={15} strokeWidth={1.8} />
            {remaining.expired ? remaining.label : `Còn ${remaining.label} để thanh toán`}
        </span>
    )
}

export default OrderHoldCountdown
