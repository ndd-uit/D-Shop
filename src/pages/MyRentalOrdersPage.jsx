import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
    ChevronRight,
    ClipboardList,
    RefreshCw,
    Search,
} from "lucide-react"

import CustomSelect from "../components/common/CustomSelect.jsx"
import RentalOrderCard from "../components/rental/RentalOrderCard.jsx"
import { createRentalPayment } from "../services/paymentApi.js"
import { getRentalOrders } from "../services/rentalApi.js"

const STATUS_OPTIONS = [
    ["PENDING_PAYMENT", "Chờ thanh toán"],
    ["CONFIRMED", "Đã xác nhận"],
    ["PREPARING", "Đang chuẩn bị"],
    ["READY_FOR_PICKUP", "Sẵn sàng nhận"],
    ["RENTING", "Đang thuê"],
    ["OVERDUE", "Quá hạn"],
    ["RETURNED", "Đã trả"],
    ["INSPECTING", "Đang kiểm tra"],
    ["SETTLEMENT_PENDING", "Chờ quyết toán"],
    ["COMPLETED", "Hoàn tất"],
    ["EXPIRED", "Hết thời gian thanh toán"],
    ["NO_SHOW", "Khách không đến nhận"],
    ["FULFILLMENT_FAILED", "Cửa hàng không thể thực hiện đơn"],
]

const getApiMessage = (error, fallback) =>
    error.response?.data?.message || fallback

function MyRentalOrdersPage() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [authRequired, setAuthRequired] = useState(false)
    const [loadError, setLoadError] = useState("")
    const [keyword, setKeyword] = useState("")
    const [status, setStatus] = useState("")
    const [payingOrderId, setPayingOrderId] = useState(null)
    const [paymentErrors, setPaymentErrors] = useState({})

    useEffect(() => {
        let active = true

        const loadOrders = async () => {
            try {
                const data = await getRentalOrders()

                if (!active) return
                setOrders(Array.isArray(data) ? data : [])
            } catch (error) {
                if (!active) return

                if (error.response?.status === 401) {
                    setAuthRequired(true)
                } else {
                    setLoadError(
                        getApiMessage(error, "Không thể tải danh sách đơn thuê."),
                    )
                }
            } finally {
                if (active) setLoading(false)
            }
        }

        loadOrders()

        return () => {
            active = false
        }
    }, [])

    const filteredOrders = useMemo(() => {
        const normalizedKeyword = keyword.trim().toLowerCase()

        return orders.filter((order) => {
            const matchesStatus = !status || order.status === status
            const searchableText = [
                order.orderId,
                ...(order.items ?? []).map((item) => item.garment?.name),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()

            return (
                matchesStatus &&
                (!normalizedKeyword || searchableText.includes(normalizedKeyword))
            )
        })
    }, [keyword, orders, status])


    const reloadOrders = async () => {
        setLoadError("")
        setLoading(true)

        try {
            const data = await getRentalOrders()
            setOrders(Array.isArray(data) ? data : [])
            setAuthRequired(false)
        } catch (error) {
            if (error.response?.status === 401) {
                setAuthRequired(true)
            } else {
                setLoadError(
                    getApiMessage(error, "Không thể tải danh sách đơn thuê."),
                )
            }
        } finally {
            setLoading(false)
        }
    }

    const handlePayment = async (orderId) => {
        setPayingOrderId(orderId)
        setPaymentErrors((current) => ({ ...current, [orderId]: "" }))

        try {
            const result = await createRentalPayment(orderId)

            if (result.paymentUrl) {
                window.location.assign(result.paymentUrl)
                return
            }

            if (result.payment?.status === "SUCCEEDED") {
                await reloadOrders()
                return
            }

            setPaymentErrors((current) => ({
                ...current,
                [orderId]: "Cổng thanh toán chưa trả về đường dẫn thanh toán.",
            }))
        } catch (error) {
            setPaymentErrors((current) => ({
                ...current,
                [orderId]: getApiMessage(
                    error,
                    "Không thể khởi tạo giao dịch thanh toán.",
                ),
            }))
        } finally {
            setPayingOrderId(null)
        }
    }

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:py-14">
                <div className="h-9 w-64 animate-pulse rounded-lg bg-gray-200" />
                <div className="mt-4 h-5 w-96 max-w-full animate-pulse rounded bg-gray-200" />
                <div className="mt-10 grid gap-4 md:grid-cols-[1fr_256px]">
                    <div className="h-11 animate-pulse rounded-xl bg-white" />
                    <div className="h-11 animate-pulse rounded-xl bg-white" />
                </div>
                <div className="mt-8 space-y-5">
                    {[1, 2, 3].map((item) => (
                        <div
                            key={item}
                            className="h-64 animate-pulse rounded-2xl bg-white"
                        />
                    ))}
                </div>
            </div>
        )
    }

    if (authRequired) {
        return (
            <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fbe2de] text-[#a9544d]">
                    <ClipboardList size={26} strokeWidth={1.8} />
                </span>
                <h1 className="mt-5 font-serif text-3xl font-semibold text-brand-text">
                    Đăng nhập để xem đơn thuê
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">
                    Danh sách đơn thuê được bảo vệ theo tài khoản Customer.
                </p>
                <Link
                    to="/login"
                    state={{ from: "/my-rentals" }}
                    className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-brand-primary px-6 text-sm font-semibold text-[#382d29] transition hover:bg-[#ee9188] active:scale-[0.98]"
                >
                    Đăng nhập
                </Link>
            </div>
        )
    }

    return (
        <>
            <main className="mx-auto w-full max-w-[1200px] px-4 py-9 sm:px-6 lg:py-14">
                <nav
                    aria-label="Đường dẫn trang"
                    className="flex items-center gap-1.5 text-xs text-gray-500 sm:text-sm"
                >
                    <Link to="/" className="transition hover:text-[#a9544d]">
                        Tài khoản
                    </Link>
                    <ChevronRight size={14} />
                    <span className="font-medium text-brand-text">
                        Đơn thuê của tôi
                    </span>
                </nav>

                <div className="mt-6">
                    <h1 className="font-serif text-3xl font-semibold text-brand-text sm:text-4xl">
                        Đơn thuê của tôi
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500 sm:text-base">
                        Theo dõi trạng thái, thời gian và thông tin các đơn thuê của bạn.
                    </p>
                </div>

                <section
                    aria-label="Tìm và lọc đơn thuê"
                    className="mt-9 grid gap-4 md:grid-cols-[minmax(0,384px)_256px_auto] md:items-center"
                >
                    <label className="relative block">
                        <span className="sr-only">Tìm đơn thuê</span>
                        <Search
                            size={18}
                            strokeWidth={1.8}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            type="search"
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                            placeholder="Tìm theo mã đơn hoặc trang phục"
                            className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-brand-surface py-2.5 pl-11 pr-4 text-sm text-brand-text outline-none placeholder:text-gray-500 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25"
                        />
                    </label>

                    <div className="relative block">
                        <CustomSelect
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                            options={STATUS_OPTIONS}
                            placeholder="Tất cả trạng thái"
                            ariaLabel="Lọc theo trạng thái"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={reloadOrders}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#e1d6cf] bg-brand-surface px-4 text-sm font-semibold text-brand-text transition hover:bg-white active:scale-[0.98] md:justify-self-end"
                    >
                        <RefreshCw size={17} strokeWidth={1.8} />
                        Làm mới
                    </button>
                </section>

                {loadError && (
                    <div
                        className="mt-7 flex flex-col items-start justify-between gap-4 rounded-2xl border border-red-100 bg-red-50 p-5 sm:flex-row sm:items-center"
                        role="alert"
                    >
                        <p className="text-sm text-red-700">{loadError}</p>
                        <button
                            type="button"
                            onClick={reloadOrders}
                            className="shrink-0 text-sm font-semibold text-red-700 hover:underline"
                        >
                            Thử lại
                        </button>
                    </div>
                )}

                {!loadError && orders.length === 0 && (
                    <section className="mt-10 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[#dacdc6] bg-brand-surface px-5 py-12 text-center">
                        <ClipboardList size={32} strokeWidth={1.6} className="text-[#a9544d]" />
                        <h2 className="mt-4 text-xl font-semibold text-brand-text">
                            Bạn chưa có đơn thuê
                        </h2>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-500">
                            Chọn trang phục và thời gian thuê phù hợp để bắt đầu.
                        </p>
                        <Link
                            to="/garments"
                            className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-brand-primary px-6 text-sm font-semibold text-[#382d29] transition hover:bg-[#ee9188] active:scale-[0.98]"
                        >
                            Xem trang phục
                        </Link>
                    </section>
                )}

                {!loadError && orders.length > 0 && filteredOrders.length === 0 && (
                    <section className="mt-10 rounded-2xl border border-[#e9e0d8] bg-brand-surface px-5 py-12 text-center">
                        <Search size={28} className="mx-auto text-gray-400" />
                        <h2 className="mt-4 text-lg font-semibold text-brand-text">
                            Không tìm thấy đơn phù hợp
                        </h2>
                        <button
                            type="button"
                            onClick={() => {
                                setKeyword("")
                                setStatus("")
                            }}
                            className="mt-4 text-sm font-semibold text-[#a9544d] hover:underline"
                        >
                            Xóa bộ lọc
                        </button>
                    </section>
                )}

                {!loadError && filteredOrders.length > 0 && (
                    <section aria-label="Danh sách đơn thuê" className="mt-8 space-y-5">
                        <p className="text-sm text-gray-500">
                            Hiển thị {filteredOrders.length} đơn thuê
                        </p>
                        {filteredOrders.map((order) => (
                            <RentalOrderCard
                                key={order.orderId}
                                order={order}
                                paying={payingOrderId === order.orderId}
                                paymentError={paymentErrors[order.orderId]}
                                onPay={handlePayment}
                            />
                        ))}
                    </section>
                )}
            </main>
        </>
    )
}

export default MyRentalOrdersPage
