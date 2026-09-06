import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
    ArrowLeft,
    CalendarClock,
    CreditCard,
    ImageOff,
    Info,
    LoaderCircle,
    PackageCheck,
    UserRound,
} from "lucide-react"

import StoreLocationCard from "../components/common/StoreLocationCard.jsx"
import OrderHoldCountdown from "../components/rental/OrderHoldCountdown.jsx"
import OrderStatusBadge from "../components/rental/OrderStatusBadge.jsx"
import RentalOrderTimeline from "../components/rental/RentalOrderTimeline.jsx"
import StaffOrderActions from "../components/manager/StaffOrderActions.jsx"
import { getOrderStatusMeta } from "../components/rental/orderStatus.js"
import {
    formatCurrency,
    formatDate,
    formatDateTime,
    getDurationLabel,
    getFirstImage,
    getOrderHoldExpiresAt,
} from "../components/rental/rentalOrderUtils.js"
import { createRentalPayment } from "../services/paymentApi.js"
import {
    getRentalOrderDetail,
    getRentalOrderHistory,
} from "../services/rentalApi.js"
import { startPaymentCheckout } from "../utils/paymentCheckout.js"

const getApiMessage = (error, fallback) =>
    error.response?.data?.message || fallback

const getLatestByCreatedAt = (records) =>
    [...records].sort(
        (left, right) =>
            new Date(right.createdAt ?? right.requestedAt).getTime() -
            new Date(left.createdAt ?? left.requestedAt).getTime(),
    )[0] ?? null

const DEPOSIT_METHOD_LABELS = {
    PAYMENT_GATEWAY: "Cổng thanh toán",
    DIRECT: "Trực tiếp tại cửa hàng",
}

function RentalOrderDetailPage({
    operationsMode = false,
    staffActionsEnabled = false,
    backPath = "/my-rentals",
}) {
    const { id } = useParams()
    const [order, setOrder] = useState(null)
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [authRequired, setAuthRequired] = useState(false)
    const [notFound, setNotFound] = useState(false)
    const [loadError, setLoadError] = useState("")
    const [holdExpired, setHoldExpired] = useState(false)
    const [paymentSubmitting, setPaymentSubmitting] = useState(false)
    const [paymentError, setPaymentError] = useState("")
    const [actionSuccess, setActionSuccess] = useState("")

    useEffect(() => {
        let active = true

        const loadOrder = async () => {
            try {
                const [detailData, historyData] = await Promise.all([
                    getRentalOrderDetail(id),
                    getRentalOrderHistory(id),
                ])

                if (!active) return
                setOrder(detailData)
                setHistory(Array.isArray(historyData) ? historyData : [])
            } catch (error) {
                if (!active) return

                if (error.response?.status === 401) {
                    setAuthRequired(true)
                } else if (error.response?.status === 404) {
                    setNotFound(true)
                } else {
                    setLoadError(
                        getApiMessage(error, "Không thể tải chi tiết đơn thuê."),
                    )
                }
            } finally {
                if (active) setLoading(false)
            }
        }

        loadOrder()

        return () => {
            active = false
        }
    }, [id])

    const refreshOrder = async () => {
        const [detailData, historyData] = await Promise.all([
            getRentalOrderDetail(id),
            getRentalOrderHistory(id),
        ])
        setOrder(detailData)
        setHistory(Array.isArray(historyData) ? historyData : [])
    }

    const handleStaffActionCompleted = async (message) => {
        await refreshOrder()
        setPaymentError("")
        setActionSuccess(message)
    }

    const items = useMemo(() => order?.items ?? [], [order?.items])
    const orderLines = useMemo(() => {
        const lines = new Map()

        items.forEach((item) => {
            const key = `${item.garmentId}:${item.requestedSize}`
            const current = lines.get(key)

            if (current) {
                current.quantity += 1
                return
            }

            lines.set(key, {
                key,
                garment: item.garment ?? {},
                requestedSize: item.requestedSize,
                quantity: 1,
            })
        })

        return [...lines.values()]
    }, [items])
    const durationLabel = useMemo(
        () =>
            order
                ? getDurationLabel(order.rentalStartAt, order.returnDueAt)
                : "Không hợp lệ",
        [order],
    )
    const holdExpiresAt = useMemo(
        () => (order ? getOrderHoldExpiresAt(order) : null),
        [order],
    )
    const rentalPayment = useMemo(
        () =>
            getLatestByCreatedAt(
                (order?.payments ?? []).filter(
                    (payment) => payment.purpose === "RENTAL",
                ),
            ),
        [order?.payments],
    )


    const handlePayment = async () => {
        setPaymentSubmitting(true)
        setPaymentError("")
        setActionSuccess("")

        try {
            const result = await createRentalPayment(id)

            if (startPaymentCheckout(result)) {
                return
            }

            if (result.payment?.status === "SUCCEEDED") {
                await refreshOrder()
                setActionSuccess("Thanh toán đã được ghi nhận.")
                return
            }

            setPaymentError("Cổng thanh toán chưa trả về đường dẫn thanh toán.")
        } catch (error) {
            setPaymentError(
                getApiMessage(error, "Không thể khởi tạo giao dịch thanh toán."),
            )
        } finally {
            setPaymentSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6">
                <div className="h-9 w-64 animate-pulse rounded-lg bg-gray-200" />
                <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
                    <div className="space-y-6">
                        <div className="h-40 animate-pulse rounded-2xl bg-white" />
                        <div className="h-64 animate-pulse rounded-2xl bg-white" />
                        <div className="h-80 animate-pulse rounded-2xl bg-white" />
                    </div>
                    <div className="h-[430px] animate-pulse rounded-2xl bg-white" />
                </div>
            </div>
        )
    }

    if (authRequired || notFound || loadError || !order) {
        const title = authRequired
            ? "Đăng nhập để xem đơn thuê"
            : notFound
                ? "Không tìm thấy đơn thuê"
                : "Chưa thể tải đơn thuê"
        const message = authRequired
            ? "Bạn cần đăng nhập để tiếp tục."
            : notFound
                ? "Đơn thuê không tồn tại hoặc bạn không có quyền truy cập."
                : loadError

        return (
            <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
                <PackageCheck size={32} className="text-[#a9544d]" />
                <h1 className="mt-5 font-serif text-3xl font-semibold text-brand-text">{title}</h1>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">{message}</p>
                <Link
                    to={authRequired ? "/login" : backPath}
                    className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-brand-primary px-6 text-sm font-semibold text-[#382d29] transition hover:bg-[#ee9188] active:scale-[0.98]"
                >
                    {authRequired ? "Đăng nhập" : "Quay lại danh sách"}
                </Link>
            </div>
        )
    }

    const statusMeta = getOrderStatusMeta(order.status)
    const additionalPaymentRequired =
        order.status === "SETTLEMENT_PENDING" &&
        Number(order.additionalPayment) > 0
    const rentalPaymentAllowed =
        order.status === "PENDING_PAYMENT" &&
        Boolean(holdExpiresAt) &&
        !holdExpired &&
        rentalPayment?.status !== "SUCCEEDED"
    const rentalActionLabel =
        rentalPayment?.status === "FAILED"
            ? "Thử thanh toán lại"
            : rentalPayment?.status === "PENDING"
                ? "Tiếp tục thanh toán"
                : "Thanh toán ngay"

    const summary = (() => {
        if (additionalPaymentRequired) {
            return {
                label: "Cần thanh toán bổ sung",
                value: order.additionalPayment,
            }
        }

        if (["COMPLETED", "EXPIRED", "NO_SHOW", "FULFILLMENT_FAILED"].includes(order.status)) {
            return {
                label: "Thực thu",
                value: order.netCollected,
            }
        }

        if (order.status === "PENDING_PAYMENT") {
            return {
                label: "Tiền cần thanh toán",
                value: order.rentalAmount,
            }
        }

        return {
            label: "Đã thanh toán",
            value: order.totalPaid,
        }
    })()

    return (
        <>
            <main className="mx-auto w-full max-w-[1200px] px-4 py-9 sm:px-6 lg:py-14">
                <Link
                    to={backPath}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-[#a9544d]"
                >
                    <ArrowLeft size={17} />
                    {operationsMode ? "Danh sách vận hành" : "Đơn thuê của tôi"}
                </Link>

                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="font-serif text-3xl font-semibold text-brand-text sm:text-4xl">
                            Chi tiết đơn thuê
                        </h1>
                        <p className="mt-2 break-all text-sm text-gray-500">
                            Mã đơn: {order.orderId}
                        </p>
                    </div>
                    <p className="text-xs text-gray-500">
                        Tạo lúc {formatDateTime(order.createdAt)}
                    </p>
                </div>

                <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] lg:items-start">
                    <div className="space-y-6">
                        <section className="rounded-2xl border border-[#e9e0d8] bg-brand-surface p-5 sm:p-7">
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <OrderStatusBadge status={order.status} />
                                    </div>
                                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-500">
                                        {statusMeta.description}
                                    </p>
                                </div>

                                {order.status === "PENDING_PAYMENT" && holdExpiresAt && (
                                    <div className="shrink-0 rounded-xl bg-brand-bg px-4 py-3 sm:text-right">
                                        <p className="mb-1 text-xs text-gray-500">
                                            Thời gian giữ chỗ
                                        </p>
                                        <OrderHoldCountdown
                                            expiresAt={holdExpiresAt}
                                            onExpiryChange={setHoldExpired}
                                        />
                                    </div>
                                )}
                            </div>
                        </section>

                        {actionSuccess && (
                            <p className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
                                {actionSuccess}
                            </p>
                        )}

                        {staffActionsEnabled && (
                            <StaffOrderActions
                                order={order}
                                onCompleted={handleStaffActionCompleted}
                            />
                        )}

                        <RentalOrderTimeline
                            history={history}
                            currentStatus={order.status}
                        />

                        <section className="rounded-2xl border border-[#e9e0d8] bg-brand-surface p-5 sm:p-7">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#fbe2de] text-[#a9544d]">
                                    <UserRound size={20} strokeWidth={1.8} />
                                </span>
                                <div>
                                    <h2 className="text-lg font-bold text-brand-text">
                                        Thông tin người thuê
                                    </h2>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Thông tin đối chiếu khi nhận trang phục.
                                    </p>
                                </div>
                            </div>

                            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                                <div className="rounded-xl border border-[#e9e0d8] bg-brand-bg p-4">
                                    <dt className="text-xs text-gray-500">Họ và tên</dt>
                                    <dd className="mt-1 font-semibold text-brand-text">
                                        {order.customer?.fullName || "Chưa cập nhật"}
                                    </dd>
                                </div>
                                <div className="rounded-xl border border-[#e9e0d8] bg-brand-bg p-4">
                                    <dt className="text-xs text-gray-500">Số điện thoại</dt>
                                    <dd className="mt-1 font-semibold text-brand-text">
                                        {order.customer?.phone || "Chưa cập nhật"}
                                    </dd>
                                </div>
                                <div className="rounded-xl border border-[#e9e0d8] bg-brand-bg p-4 sm:col-span-2">
                                    <dt className="text-xs text-gray-500">Số CCCD</dt>
                                    <dd className="mt-1 font-semibold text-brand-text">
                                        {order.customer?.nationalId || "Chưa cập nhật"}
                                    </dd>
                                </div>
                            </dl>
                        </section>

                        <section className="rounded-2xl border border-[#e9e0d8] bg-brand-surface p-5 sm:p-7">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#fbe2de] text-[#a9544d]">
                                    <CalendarClock size={20} strokeWidth={1.8} />
                                </span>
                                <h2 className="text-lg font-bold text-brand-text">
                                    Thời gian thuê
                                </h2>
                            </div>

                            <div className="mt-5 grid gap-4 rounded-xl border border-[#e9e0d8] bg-brand-bg p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                                <div>
                                    <p className="text-xs text-gray-500">Ngày nhận</p>
                                    <p className="mt-1 font-semibold text-brand-text">
                                        {formatDate(order.rentalStartAt)}
                                    </p>
                                    <p className="mt-0.5 text-xs text-gray-400">
                                        Nhận từ 08:00
                                    </p>
                                </div>
                                <span className="text-center text-xs font-semibold text-[#a9544d]">
                                    {durationLabel}
                                </span>
                                <div className="sm:text-right">
                                    <p className="text-xs text-gray-500">Ngày trả</p>
                                    <p className="mt-1 font-semibold text-brand-text">
                                        {formatDate(order.returnDueAt)}
                                    </p>
                                    <p className="mt-0.5 text-xs text-gray-400">
                                        Trả trước 18:00
                                    </p>
                                </div>
                            </div>
                        </section>

                        <StoreLocationCard />

                        <section className="rounded-2xl border border-[#e9e0d8] bg-brand-surface p-5 sm:p-7">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#fbe2de] text-[#a9544d]">
                                        <PackageCheck size={20} strokeWidth={1.8} />
                                    </span>
                                    <h2 className="text-lg font-bold text-brand-text">
                                        Trang phục thuê
                                    </h2>
                                </div>
                                <span className="text-xs font-medium text-gray-500">
                                    {items.length} sản phẩm
                                </span>
                            </div>
                            <div className="mt-5 space-y-3">
                                {orderLines.map((line) => {
                                    const imageUrl = getFirstImage(line.garment.imageUrls)

                                    return (
                                        <article
                                            key={line.key}
                                            className="grid gap-4 rounded-xl border border-[#e9e0d8] bg-brand-bg p-4 sm:grid-cols-[72px_1fr] sm:items-center"
                                        >
                                            <div className="aspect-[3/4] w-[72px] overflow-hidden rounded-lg bg-[#eee6df]">
                                                {imageUrl ? (
                                                    <img
                                                        src={imageUrl}
                                                        alt={line.garment.name || "Trang phục thuê"}
                                                        loading="lazy"
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="flex h-full items-center justify-center text-gray-400">
                                                        <ImageOff size={20} strokeWidth={1.6} />
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-brand-text">
                                                    {line.garment.name || "Trang phục"}
                                                </h3>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    Kích thước: {line.requestedSize}, số lượng: {line.quantity}
                                                </p>
                                            </div>
                                        </article>
                                    )
                                })}
                            </div>
                            <p className="mt-4 text-xs leading-relaxed text-gray-500">
                                Tiền thuê và tiền cọc đã chốt khi đặt đơn được hiển thị
                                tại phần Tổng quan thanh toán.
                            </p>
                        </section>
                    </div>

                    <aside className="rounded-2xl border border-[#e9e0d8] bg-brand-surface p-5 lg:sticky lg:top-[96px] lg:p-6">
                        <h2 className="text-lg font-bold text-brand-text">
                            Tổng quan thanh toán
                        </h2>
                        <dl className="mt-6 space-y-3 border-b border-[#e9e0d8] pb-5 text-sm">
                            <div className="flex justify-between gap-4">
                                <dt className="text-gray-500">Tiền thuê</dt>
                                <dd className="font-medium text-brand-text">
                                    {formatCurrency(order.rentalAmount)}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-gray-500">Tiền cọc yêu cầu</dt>
                                <dd className="font-medium text-brand-text">
                                    {formatCurrency(order.depositAmount)}
                                </dd>
                            </div>
                            {Number(order.collectedDepositAmount) > 0 && (
                                <div className="flex justify-between gap-4">
                                    <dt className="text-gray-500">Tiền cọc đã thu</dt>
                                    <dd className="font-medium text-brand-text">
                                        {formatCurrency(order.collectedDepositAmount)}
                                    </dd>
                                </div>
                            )}
                            {order.depositCollectionMethod && (
                                <div className="flex justify-between gap-4">
                                    <dt className="text-gray-500">Hình thức thu cọc</dt>
                                    <dd className="font-medium text-brand-text">
                                        {DEPOSIT_METHOD_LABELS[order.depositCollectionMethod] || order.depositCollectionMethod}
                                    </dd>
                                </div>
                            )}
                            {Number(order.additionalCharge) > 0 && (
                                <div className="flex justify-between gap-4">
                                    <dt className="text-gray-500">Phí phát sinh</dt>
                                    <dd className="font-medium text-brand-text">
                                        {formatCurrency(order.additionalCharge)}
                                    </dd>
                                </div>
                            )}
                            {Number(order.depositRefundAmount) > 0 && (
                                <div className="flex justify-between gap-4">
                                    <dt className="text-gray-500">Hoàn cọc</dt>
                                    <dd className="font-medium text-brand-text">
                                        {formatCurrency(order.depositRefundAmount)}
                                    </dd>
                                </div>
                            )}
                            {Number(order.additionalPayment) > 0 && (
                                <div className="flex justify-between gap-4">
                                    <dt className="text-gray-500">Cần thanh toán bổ sung</dt>
                                    <dd className="font-medium text-brand-text">
                                        {formatCurrency(order.additionalPayment)}
                                    </dd>
                                </div>
                            )}
                            {Number(order.finalCharge) > 0 && (
                                <div className="flex justify-between gap-4">
                                    <dt className="text-gray-500">Tổng chi phí cuối</dt>
                                    <dd className="font-medium text-brand-text">
                                        {formatCurrency(order.finalCharge)}
                                    </dd>
                                </div>
                            )}
                            {Number(order.totalPaid) > 0 && (
                                <div className="flex justify-between gap-4">
                                    <dt className="text-gray-500">Tổng đã thanh toán</dt>
                                    <dd className="font-medium text-brand-text">
                                        {formatCurrency(order.totalPaid)}
                                    </dd>
                                </div>
                            )}
                            {Number(order.totalRefunded) > 0 && (
                                <div className="flex justify-between gap-4">
                                    <dt className="text-gray-500">Đã hoàn tiền</dt>
                                    <dd className="font-medium text-brand-text">
                                        {formatCurrency(order.totalRefunded)}
                                    </dd>
                                </div>
                            )}
                        </dl>

                        <div className="py-5">
                            <div className="flex items-end justify-between gap-4">
                                <p className="text-sm font-semibold text-brand-text">
                                    {summary.label}
                                </p>
                                <p className="text-2xl font-bold text-[#a9544d]">
                                    {formatCurrency(summary.value)}
                                </p>
                            </div>
                            {order.netCollected != null && ["COMPLETED", "EXPIRED", "NO_SHOW", "FULFILLMENT_FAILED"].includes(order.status) && (
                                <p className="mt-2 flex justify-between gap-4 text-xs text-gray-500">
                                    <span>Thực thu (net)</span>
                                    <span className="font-semibold">{formatCurrency(order.netCollected)}</span>
                                </p>
                            )}
                            <p className="mt-3 flex gap-2 text-xs leading-relaxed text-gray-500">
                                <Info size={15} className="mt-0.5 shrink-0" />
                                {operationsMode
                                    ? "Đối chiếu số CCCD và thu đủ tiền cọc trước khi bàn giao."
                                    : "Tiền cọc được thu khi nhận đồ và quyết toán sau khi trả và kiểm tra trang phục."}
                            </p>
                        </div>

                        {paymentError && (
                            <p
                                className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
                                role="alert"
                            >
                                {paymentError}
                            </p>
                        )}

                        <div className="space-y-3">
                            {!operationsMode && rentalPaymentAllowed && (
                                <button
                                    type="button"
                                    onClick={handlePayment}
                                    disabled={paymentSubmitting}
                                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 text-sm font-semibold text-[#382d29] transition hover:bg-[#ee9188] active:scale-[0.98] disabled:opacity-50"
                                >
                                    {paymentSubmitting ? (
                                        <LoaderCircle size={18} className="animate-spin" />
                                    ) : (
                                        <CreditCard size={18} />
                                    )}
                                    {paymentSubmitting
                                        ? "Đang tạo thanh toán..."
                                        : rentalActionLabel}
                                </button>
                            )}

                            {!operationsMode && additionalPaymentRequired && (
                                <div className="rounded-xl border border-[#e8c98e] bg-[#fff7e3] p-4 text-sm leading-6 text-[#76561f]">
                                    Thanh toán khoản bổ sung theo hướng dẫn của cửa hàng. Rental Staff sẽ xác nhận sau khi đã nhận đủ số tiền.
                                </div>
                            )}

                            <Link
                                to={backPath}
                                className="flex min-h-11 w-full items-center justify-center rounded-xl border border-[#d9cdc7] px-5 text-sm font-semibold text-brand-text transition hover:bg-brand-bg active:scale-[0.98]"
                            >
                                Quay lại danh sách
                            </Link>

                            {!operationsMode && ["EXPIRED", "NO_SHOW", "FULFILLMENT_FAILED"].includes(order.status) && (
                                <Link
                                    to="/garments"
                                    className="flex min-h-11 w-full items-center justify-center text-sm font-semibold text-[#a9544d] transition hover:underline"
                                >
                                    Tiếp tục xem trang phục
                                </Link>
                            )}
                        </div>
                    </aside>
                </div>
            </main>
        </>
    )
}

export default RentalOrderDetailPage
