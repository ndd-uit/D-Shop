import { CalendarClock, CheckCircle2, LoaderCircle } from "lucide-react"

function CartRentalPeriod({
    rentalStartAt,
    returnDueAt,
    dirty,
    saving,
    error,
    success,
    onStartChange,
    onEndChange,
    onSubmit,
}) {
    return (
        <section className="rounded-2xl border border-gray-100 bg-brand-surface p-5 sm:p-6">
            <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fbe2de] text-[#a9544d]">
                    <CalendarClock size={20} strokeWidth={1.8} />
                </span>
                <div>
                    <h2 className="text-lg font-bold text-brand-text">Thời gian thuê</h2>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500 sm:text-sm">
                        Tất cả trang phục trong giỏ sử dụng chung khoảng thời gian này.
                    </p>
                </div>
            </div>

            <form onSubmit={onSubmit} className="mt-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                        <span className="mb-2 block text-xs font-semibold text-gray-600">
                            Ngày nhận
                        </span>
                        <input
                            type="date"
                            value={rentalStartAt}
                            onChange={(event) => onStartChange(event.target.value)}
                            className="min-h-11 w-full rounded-lg border border-gray-200 bg-brand-bg px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25"
                        />
                        <span className="mt-1 block text-xs text-gray-400">
                            Nhận từ 08:00
                        </span>
                    </label>

                    <label>
                        <span className="mb-2 block text-xs font-semibold text-gray-600">
                            Ngày trả
                        </span>
                        <input
                            type="date"
                            value={returnDueAt}
                            onChange={(event) => onEndChange(event.target.value)}
                            className="min-h-11 w-full rounded-lg border border-gray-200 bg-brand-bg px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25"
                        />
                        <span className="mt-1 block text-xs text-gray-400">
                            Trả trước 18:00
                        </span>
                    </label>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-h-5 text-xs">
                        {error && <p className="font-medium text-red-600">{error}</p>}
                        {!error && success && (
                            <p className="flex items-center gap-1.5 font-medium text-green-700">
                                <CheckCircle2 size={15} />
                                Đã lưu và kiểm tra toàn bộ giỏ thuê.
                            </p>
                        )}
                        {!error && !success && dirty && (
                            <p className="text-amber-700">Thời gian mới chưa được lưu.</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={saving || !dirty}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-primary px-5 text-sm font-semibold text-[#382d29] transition hover:bg-[#ee9188] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving && <LoaderCircle size={17} className="animate-spin" />}
                        {saving ? "Đang kiểm tra..." : "Lưu thời gian"}
                    </button>
                </div>
            </form>
        </section>
    )
}

export default CartRentalPeriod
