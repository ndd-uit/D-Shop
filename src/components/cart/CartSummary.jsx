import { Info } from "lucide-react"
import { Link } from "react-router-dom"

const formatCurrency = (value) => {
    const number = Number(value)

    return Number.isFinite(number)
        ? `${number.toLocaleString("vi-VN")}đ`
        : "Liên hệ"
}

function CartSummary({
    itemTypeCount,
    totalQuantity,
    rentalSubtotal,
    depositSubtotal,
    durationLabel,
    rentalDays,
    canContinue,
    onContinue,
    continueNotice,
}) {
    return (
        <aside className="rounded-2xl border border-[#e9e0d8] bg-brand-surface p-5 lg:sticky lg:top-[96px] lg:p-6">
            <h2 className="text-lg font-bold text-brand-text">Tóm tắt giỏ thuê</h2>

            <dl className="mt-6 space-y-3 border-b border-[#e9e0d8] pb-5 text-sm">
                <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Thời lượng</dt>
                    <dd className="font-medium text-brand-text">
                        {durationLabel || "Chưa chọn"}
                    </dd>
                </div>
                <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Số loại đã chọn</dt>
                    <dd className="font-medium text-brand-text">{itemTypeCount}</dd>
                </div>
                <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Tổng số lượng</dt>
                    <dd className="font-medium text-brand-text">{totalQuantity}</dd>
                </div>
            </dl>

            <dl className="space-y-3 border-b border-[#e9e0d8] py-5 text-sm">
                <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Tiền thuê</dt>
                    <dd className="font-semibold text-brand-text">
                        {rentalDays > 0 ? formatCurrency(rentalSubtotal) : "Chọn ngày thuê"}
                    </dd>
                </div>
                <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Tiền cọc yêu cầu</dt>
                    <dd className="font-semibold text-brand-text">
                        {formatCurrency(depositSubtotal)}
                    </dd>
                </div>
            </dl>

            <div className="py-5">
                <p className="text-sm font-semibold text-brand-text">
                    Tiền cần thanh toán ngay
                </p>
                <p className="mt-1 text-right text-2xl font-bold text-[#b85f57]">
                    {rentalDays > 0 ? formatCurrency(rentalSubtotal) : "Chọn ngày thuê"}
                </p>
                <p className="mt-2 text-right text-xs leading-relaxed text-gray-500">
                    Tiền thuê = giá/ngày × số ngày × số lượng.
                    Tính cả ngày nhận và ngày trả theo giờ Việt Nam.
                </p>
            </div>

            <div className="flex gap-2 rounded-xl bg-brand-bg p-3 text-xs leading-relaxed text-gray-600">
                <Info size={16} className="mt-0.5 shrink-0 text-[#a9544d]" />
                <span>
                    Tiền cọc sẽ được thu khi nhận đồ, không cộng vào thanh toán trước.
                    Cọc được quyết toán sau khi hoàn trả và kiểm tra trang phục.
                </span>
            </div>

            <button
                type="button"
                onClick={onContinue}
                disabled={!canContinue}
                className="mt-5 min-h-12 w-full rounded-xl bg-brand-primary px-5 text-sm font-semibold text-[#382d29] transition hover:bg-[#ee9188] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
                Tiếp tục đặt thuê
            </button>

            {!canContinue && (
                <p className="mt-2 text-center text-xs leading-relaxed text-amber-700">
                    Chọn ít nhất một trang phục và lưu thời gian thuê hợp lệ.
                </p>
            )}

            {continueNotice && (
                <p className="mt-3 text-center text-xs leading-relaxed text-gray-600" role="status">
                    {continueNotice}
                </p>
            )}

            <Link
                to="/garments"
                className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#fbe2de] px-5 text-sm font-semibold text-brand-text transition hover:bg-brand-primary/70 active:scale-[0.98]"
            >
                Tiếp tục chọn trang phục
            </Link>
        </aside>
    )
}

export default CartSummary
