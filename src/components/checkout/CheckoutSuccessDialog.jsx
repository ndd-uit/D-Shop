import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { CheckCircle2, Clock3, CreditCard, LoaderCircle } from "lucide-react"
import { formatCurrency } from "../rental/rentalOrderUtils.js"

const formatExpiresAt = (value) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return "Không xác định"

    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "medium",
    }).format(date)
}

const getRemainingTime = (expiresAt, now) => {
    if (now === null) return "Đang đồng bộ..."

    const difference = new Date(expiresAt).getTime() - now

    if (!Number.isFinite(difference) || difference <= 0) {
        return "Đã hết thời gian giữ chỗ"
    }

    const totalSeconds = Math.ceil(difference / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60

    return `${minutes}:${String(seconds).padStart(2, "0")}`
}

function CheckoutSuccessDialog({ result, paying, paymentError, onPayNow, expectedAmount }) {
    const [now, setNow] = useState(null)
    const amountMismatch = expectedAmount !== undefined && (
        Number(result.order.upfrontAmount) !== Number(expectedAmount) ||
        Number(result.order.rentalAmount) !== Number(expectedAmount)
    )

    useEffect(() => {
        const initialTimerId = window.setTimeout(() => setNow(Date.now()), 0)
        const intervalId = window.setInterval(() => setNow(Date.now()), 1000)
        return () => {
            window.clearTimeout(initialTimerId)
            window.clearInterval(intervalId)
        }
    }, [])

    const remainingTime = useMemo(
        () => getRemainingTime(result.holdExpiresAt, now),
        [now, result.holdExpiresAt],
    )
    const expired = remainingTime === "Đã hết thời gian giữ chỗ"

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-[#453c38]/35 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-success-title"
        >
            <div className="w-full max-w-md rounded-2xl border border-white/60 bg-brand-surface p-6 shadow-[0_24px_70px_rgba(69,60,56,0.2)] sm:p-8">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f3ed] text-green-700">
                    <CheckCircle2 size={28} strokeWidth={1.8} />
                </span>

                <h2
                    id="checkout-success-title"
                    className="mt-5 text-center font-serif text-3xl text-brand-text"
                >
                    Đã tạo đơn thuê
                </h2>
                <p className="mt-2 text-center text-sm leading-relaxed text-gray-500">
                    Đơn đang chờ thanh toán. Trang phục chỉ được giữ đến thời hạn do backend cung cấp.
                </p>

                <div className="mt-5 flex items-center justify-between gap-4 text-sm">
                    <span className="text-gray-500">Tiền thuê cần thanh toán</span>
                    <strong className="text-lg text-[#b85f57]">
                        {formatCurrency(result.order.upfrontAmount ?? result.order.rentalAmount)}
                    </strong>
                </div>

                <div className="mt-6 rounded-xl border border-brand-mint bg-[#eef5f1] p-4">
                    <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-2 text-sm font-semibold text-green-800">
                            <Clock3 size={18} />
                            Thời gian còn lại
                        </span>
                        <span className="font-bold tabular-nums text-green-800">
                            {remainingTime}
                        </span>
                    </div>
                    <p className="mt-2 text-xs text-green-800/75">
                        Hết hạn lúc {formatExpiresAt(result.holdExpiresAt)}
                    </p>
                </div>

                <p className="mt-4 break-all text-center text-xs text-gray-400">
                    Mã đơn: {result.order.orderId}
                </p>

                {(paymentError || amountMismatch) && (
                    <p
                        className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
                        role="alert"
                    >
                        {paymentError || `Báo giá là ${formatCurrency(expectedAmount)} nhưng đơn được tạo với số tiền khác. Chưa thể thanh toán; vui lòng liên hệ cửa hàng để kiểm tra.`}
                    </p>
                )}

                <button
                    type="button"
                    onClick={onPayNow}
                    disabled={paying || expired || amountMismatch}
                    className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 text-sm font-semibold text-[#382d29] transition hover:bg-[#ee9188] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {paying ? (
                        <LoaderCircle size={18} className="animate-spin" />
                    ) : (
                        <CreditCard size={18} />
                    )}
                    {paying ? "Đang tạo thanh toán..." : "Thanh toán ngay"}
                </button>

                <Link
                    to="/my-rentals"
                    className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl border border-gray-200 px-5 text-sm font-semibold text-brand-text transition hover:bg-brand-bg active:scale-[0.98]"
                >
                    Thanh toán sau
                </Link>
            </div>
        </div>
    )
}

export default CheckoutSuccessDialog
