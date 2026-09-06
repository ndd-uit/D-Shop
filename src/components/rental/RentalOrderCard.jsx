import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
    CalendarDays,
    CreditCard,
    Eye,
    ImageOff,
    LoaderCircle,
} from "lucide-react"

import OrderHoldCountdown from "./OrderHoldCountdown.jsx"
import OrderStatusBadge from "./OrderStatusBadge.jsx"
import { getOrderStatusMeta } from "./orderStatus.js"
import {
    formatCurrency,
    formatDateTime,
    getFirstImage,
    getOrderHoldExpiresAt,
} from "./rentalOrderUtils.js"

const getGarmentNames = (items) =>
    Array.from(
        new Set(
            items
                .map((item) => item.garment?.name)
                .filter(Boolean),
        ),
    )

function RentalOrderCard({ order, paying, paymentError, onPay }) {
    const [holdExpired, setHoldExpired] = useState(false)
    const items = useMemo(() => order.items ?? [], [order.items])
    const statusMeta = getOrderStatusMeta(order.status)
    const holdExpiresAt = useMemo(() => getOrderHoldExpiresAt(order), [order])
    const garmentNames = useMemo(() => getGarmentNames(items), [items])
    const thumbnails = items.slice(0, 3)
    const canPay =
        order.status === "PENDING_PAYMENT" &&
        Boolean(holdExpiresAt) &&
        !holdExpired
    const subdued = ["COMPLETED", "EXPIRED", "NO_SHOW", "FULFILLMENT_FAILED"].includes(order.status)

    return (
        <article
            className={`rounded-2xl border border-[#e9e0d8] bg-brand-surface p-5 transition-opacity sm:p-6 ${
                subdued ? "opacity-80 hover:opacity-100" : ""
            }`}
        >
            <div className="flex flex-col gap-4 border-b border-[#e9e0d8] pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                        <span
                            title={order.orderId}
                            className="text-xs font-semibold text-gray-500 sm:text-sm"
                        >
                            Mã đơn: {order.orderId.slice(0, 8).toUpperCase()}
                        </span>
                        <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-500 sm:text-sm">
                        {statusMeta.description}
                    </p>
                    {order.status === "PENDING_PAYMENT" && holdExpiresAt && (
                        <div className="mt-2">
                            <OrderHoldCountdown
                                expiresAt={holdExpiresAt}
                                onExpiryChange={setHoldExpired}
                            />
                        </div>
                    )}
                </div>

                <div className="shrink-0 sm:text-right">
                    <p className="flex items-center gap-1.5 text-xs text-gray-500 sm:justify-end">
                        <CalendarDays size={14} strokeWidth={1.8} />
                        Thời gian thuê
                    </p>
                    <p className="mt-1 text-sm font-semibold text-brand-text">
                        {formatDateTime(order.rentalStartAt)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                        đến {formatDateTime(order.returnDueAt)}
                    </p>
                </div>
            </div>

            <div className="grid gap-6 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                    <p className="text-sm leading-relaxed text-brand-text">
                        <span className="font-semibold">Sản phẩm ({items.length}):</span>{" "}
                        {garmentNames.length > 0
                            ? garmentNames.join(", ")
                            : "Chưa có thông tin trang phục"}
                    </p>

                    <div className="mt-3 flex gap-2">
                        {thumbnails.map((item) => {
                            const imageUrl = getFirstImage(item.garment?.imageUrls)

                            return (
                                <div
                                    key={item.orderItemId}
                                    className="h-16 w-12 overflow-hidden rounded-lg bg-[#f3eae5]"
                                >
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt={item.garment?.name || "Trang phục thuê"}
                                            loading="lazy"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span className="flex h-full items-center justify-center text-gray-400">
                                            <ImageOff size={17} strokeWidth={1.6} />
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                        {items.length > thumbnails.length && (
                            <span className="flex h-16 w-12 items-center justify-center rounded-lg bg-[#f3eae5] text-xs font-semibold text-gray-500">
                                +{items.length - thumbnails.length}
                            </span>
                        )}
                    </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:min-w-64 md:text-right">
                    <div>
                        <dt className="text-xs text-gray-500">Tiền thuê</dt>
                        <dd className="mt-1 font-semibold text-brand-text">
                            {formatCurrency(order.rentalAmount)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-gray-500">Tiền cọc</dt>
                        <dd className="mt-1 font-semibold text-brand-text">
                            {formatCurrency(order.depositAmount)}
                        </dd>
                    </div>
                    <div className="col-span-2 mt-1 border-t border-[#e9e0d8] pt-2">
                        <dt className="text-xs text-gray-500">
                            {order.status === "PENDING_PAYMENT"
                                ? "Tiền thuê cần thanh toán"
                                : "Tổng đã thanh toán"}
                        </dt>
                        <dd className="mt-1 text-lg font-bold text-[#a9544d]">
                            {formatCurrency(order.status === "PENDING_PAYMENT"
                                ? order.upfrontAmount ?? order.rentalAmount
                                : order.totalPaid)}
                        </dd>
                    </div>
                </dl>
            </div>

            {paymentError && (
                <p
                    className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
                    role="alert"
                >
                    {paymentError}
                </p>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-[#e9e0d8] pt-4 sm:flex-row sm:justify-end">
                <Link
                    to={`/my-rentals/${order.orderId}`}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d9cdc7] px-5 text-sm font-semibold text-brand-text transition hover:bg-brand-bg active:scale-[0.98]"
                >
                    <Eye size={17} strokeWidth={1.8} />
                    Xem chi tiết
                </Link>

                {order.status === "PENDING_PAYMENT" && (
                    <button
                        type="button"
                        onClick={() => onPay(order.orderId)}
                        disabled={!canPay || paying}
                        className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-primary px-6 text-sm font-semibold text-[#382d29] transition hover:bg-[#ee9188] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {paying ? (
                            <LoaderCircle size={18} className="animate-spin" />
                        ) : (
                            <CreditCard size={18} strokeWidth={1.8} />
                        )}
                        {paying ? "Đang tạo thanh toán..." : "Thanh toán"}
                    </button>
                )}
            </div>
        </article>
    )
}

export default RentalOrderCard
