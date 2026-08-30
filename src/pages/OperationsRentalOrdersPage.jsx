
import { useEffect, useMemo, useState } from "react"
import { CalendarOff, ChevronLeft, ChevronRight, ClipboardList, Eye, RefreshCw, Search } from "lucide-react"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"

import CustomSelect from "../components/common/CustomSelect.jsx"
import ManagerHeader from "../components/manager/ManagerHeader.jsx"
import ManagerSidebar from "../components/manager/ManagerSidebar.jsx"
import OrderStatusBadge from "../components/rental/OrderStatusBadge.jsx"
import { formatCurrency, formatDate, formatDateTime } from "../components/rental/rentalOrderUtils.js"
import { clearAuthToken, getAuthUser, saveAuthUser } from "../services/authStorage.js"
import { getRentalOrders } from "../services/rentalApi.js"
import { getMyProfile } from "../services/userApi.js"

const STATUS_OPTIONS = [
    ["PENDING_PAYMENT", "Chờ thanh toán"], ["CONFIRMED", "Đã xác nhận"],
    ["PREPARING", "Đang chuẩn bị"], ["READY_FOR_PICKUP", "Sẵn sàng nhận"],
    ["RENTING", "Đang thuê"], ["OVERDUE", "Quá hạn"], ["RETURNED", "Đã trả"],
    ["INSPECTING", "Đang kiểm tra"], ["SETTLEMENT_PENDING", "Chờ quyết toán"],
    ["COMPLETED", "Hoàn tất"], ["EXPIRED", "Hết thời gian thanh toán"],
    ["NO_SHOW", "Khách không đến nhận"], ["FULFILLMENT_FAILED", "Không thể thực hiện"],
]

const STAFF_QUEUE_CONFIG = {
    preparation: {
        title: "Chuẩn bị đơn",
        subtitle: "Các đơn đã xác nhận hoặc đang được chuẩn bị",
        statuses: ["CONFIRMED", "PREPARING"],
    },
    handover: {
        title: "Bàn giao & thu cọc",
        subtitle: "Đối chiếu số CCCD và thu đủ tiền cọc trước khi bàn giao",
        statuses: ["READY_FOR_PICKUP"],
    },
    returns: {
        title: "Nhận trả & kiểm tra",
        subtitle: "Ghi nhận trả đồ và kiểm tra thủ công từng trang phục",
        statuses: ["RENTING", "OVERDUE", "RETURNED", "INSPECTING"],
    },
    settlement: {
        title: "Quyết toán",
        subtitle: "Tổng hợp phí và đề xuất quyết toán; khoản cần duyệt do Manager xử lý",
        statuses: ["SETTLEMENT_PENDING"],
    },
}

const emptyFilters = { keyword: "", status: "", from: "", to: "" }
const shortId = (value) => value?.slice(0, 8).toUpperCase() || ""

function OperationsRentalOrdersPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const [profile, setProfile] = useState(() => getAuthUser())
    const [orders, setOrders] = useState([])
    const [filters, setFilters] = useState(emptyFilters)
    const [appliedFilters, setAppliedFilters] = useState(emptyFilters)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [forbidden, setForbidden] = useState(false)
    const [reload, setReload] = useState(0)
    const queueKey = new URLSearchParams(location.search).get("queue")
    const queueConfig = STAFF_QUEUE_CONFIG[queueKey] ?? null

    useEffect(() => {
        let active = true
        const load = async () => {
            setLoading(true)
            setError("")
            try {
                const [user, data] = await Promise.all([
                    getMyProfile(),
                    getRentalOrders(),
                ])
                if (!active) return
                if (!["STORE_MANAGER", "RENTAL_STAFF"].includes(user.role)) {
                    setForbidden(true)
                    return
                }

                saveAuthUser(user)
                setProfile(user)
                setOrders(Array.isArray(data) ? data : [])
            } catch (requestError) {
                if (!active) return
                if (requestError.response?.status === 401) {
                    navigate("/login", { replace: true, state: { from: location.pathname } })
                    return
                }
                if (requestError.response?.status === 403) {
                    setForbidden(true)
                    return
                }
                setError(requestError.response?.data?.message || "Không thể tải danh sách đơn thuê.")
            } finally {
                if (active) setLoading(false)
            }
        }
        load()
        return () => { active = false }
    }, [location.pathname, location.search, navigate, reload])

    const filteredOrders = useMemo(() => {
        const keyword = appliedFilters.keyword.trim().toLowerCase()
        const from = appliedFilters.from ? new Date(`${appliedFilters.from}T00:00:00`) : null
        const to = appliedFilters.to ? new Date(`${appliedFilters.to}T23:59:59.999`) : null

        return orders.filter((order) => {
            const searchable = [order.orderId, order.customer?.fullName, order.customer?.email, order.customer?.phone]
                .filter(Boolean).join(" ").toLowerCase()
            const rentalStart = new Date(order.rentalStartAt)
            const returnDue = new Date(order.returnDueAt)
            return (!queueConfig || queueConfig.statuses.includes(order.status)) &&
                (!keyword || searchable.includes(keyword)) &&
                (!appliedFilters.status || order.status === appliedFilters.status) &&
                (!from || rentalStart >= from) && (!to || returnDue <= to)
        })
    }, [appliedFilters, orders, queueConfig])

    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize))
    const visibleOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize)
    const basePath = profile?.role === "STORE_MANAGER" ? "/manager" : "/staff"
    const updateFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value }))
    const applyFilters = (event) => { event.preventDefault(); setAppliedFilters(filters); setPage(1) }
    const resetFilters = () => { setFilters(emptyFilters); setAppliedFilters(emptyFilters); setPage(1) }
    const logout = () => { clearAuthToken(); navigate("/login", { replace: true }) }

    if (forbidden) return <Navigate to="/" replace />

    return <div className="mx-auto flex min-h-screen max-w-[1920px] bg-[#faf6ef] text-[#453c38]">
        <ManagerSidebar role={profile?.role} />
        <main className="min-w-0 flex-1">
            <ManagerHeader profile={profile} loading={loading} title={queueConfig?.title || "Đơn thuê"} subtitle={queueConfig?.subtitle || "Theo dõi và quản lý toàn bộ đơn thuê của cửa hàng"} onReload={() => setReload((value) => value + 1)} onLogout={logout} />
            <div className="mx-auto max-w-[1440px] space-y-6 px-5 py-7 sm:px-8 lg:px-12 lg:py-9 xl:px-16">
                {error && <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><span>{error}</span><button type="button" onClick={() => setReload((value) => value + 1)} className="font-semibold underline">Thử lại</button></div>}

                {profile?.role === "RENTAL_STAFF" && <div className="flex justify-end"><Link to="/staff/availability-blocks" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#e1d6cf] bg-[#fffdf9] px-4 text-sm font-semibold text-[#665b55] hover:bg-[#faf6ef]"><CalendarOff size={17} />Quản lý lịch khóa kho</Link></div>}

                <section className="grid gap-4 sm:grid-cols-3">
                    {[
                        ["Tổng số đơn", orders.length, "text-[#453c38]"],
                        ["Đang thuê", orders.filter((order) => order.status === "RENTING").length, "text-[#557b6d]"],
                        ["Quá hạn", orders.filter((order) => order.status === "OVERDUE").length, "text-[#b94740]"],
                    ].map(([label, value, tone]) => <div key={label} className="rounded-xl border border-[#eadfd6] bg-[#fffdf9] px-5 py-4"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#897d77]">{label}</p><p className={`mt-1 font-serif text-3xl font-semibold ${tone}`}>{loading ? "–" : value}</p></div>)}
                </section>

                <form onSubmit={applyFilters} className="rounded-xl border border-[#eadfd6] bg-[#fffdf9] p-5">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_190px_160px_160px_auto] xl:items-end">
                        <label><span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#766b66]">Mã đơn hoặc khách hàng</span><span className="relative block"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9c918b]" /><input type="search" value={filters.keyword} onChange={(event) => updateFilter("keyword", event.target.value)} placeholder="Tìm kiếm..." className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/60 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></span></label>
                        <label><span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#766b66]">Trạng thái</span><CustomSelect value={filters.status} onChange={(event) => updateFilter("status", event.target.value)} options={queueConfig ? STATUS_OPTIONS.filter(([status]) => queueConfig.statuses.includes(status)) : STATUS_OPTIONS} placeholder="Tất cả trạng thái" buttonClassName="bg-[#faf6ef]/60" /></label>
                        <label><span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#766b66]">Nhận từ</span><input type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/60 px-3 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></label>
                        <label><span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#766b66]">Trả đến</span><input type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/60 px-3 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></label>
                        <div className="flex gap-2"><button type="submit" className="min-h-11 flex-1 rounded-xl bg-[#f2a39b] px-5 text-sm font-semibold text-[#453c38] hover:bg-[#ee9188] active:scale-[.98]">Lọc</button><button type="button" onClick={resetFilters} className="min-h-11 rounded-xl border border-[#e1d6cf] px-4 text-sm font-semibold hover:bg-[#faf6ef]">Đặt lại</button></div>
                    </div>
                </form>

                <section className="overflow-hidden rounded-xl border border-[#eadfd6] bg-[#fffdf9]">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eadfd6] px-5 py-4 sm:px-6"><div><h2 className="font-serif text-xl font-semibold">Danh sách đơn thuê</h2><p className="mt-1 text-xs text-[#897d77]">{filteredOrders.length} đơn phù hợp</p></div><RefreshCw size={18} className={loading ? "animate-spin text-[#b65e56]" : "text-[#897d77]"} /></div>
                    <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left text-sm"><thead><tr className="border-b border-[#eadfd6] bg-[#faf6ef]/55 text-[#766b66]"><th className="px-6 py-3 font-medium">Mã đơn</th><th className="px-6 py-3 font-medium">Khách hàng</th><th className="px-6 py-3 font-medium">Ngày nhận</th><th className="px-6 py-3 font-medium">Ngày trả</th><th className="px-6 py-3 font-medium">Tiền thuê</th><th className="px-6 py-3 font-medium">Trạng thái</th><th className="px-6 py-3 font-medium">Ngày tạo</th><th className="px-6 py-3 text-right font-medium">Thao tác</th></tr></thead>
                        <tbody>{visibleOrders.map((order) => <tr key={order.orderId} className="border-b border-[#eadfd6]/70 transition-colors last:border-0 hover:bg-[#faf6ef]/55"><td className="px-6 py-4 font-bold">#{shortId(order.orderId)}</td><td className="px-6 py-4"><p className="font-semibold">{order.customer?.fullName || "Khách hàng"}</p><p className="mt-1 text-xs text-[#897d77]">{order.customer?.phone || order.customer?.email || "Chưa cập nhật"}</p></td><td className="px-6 py-4 text-[#665b55]">{formatDate(order.rentalStartAt)}</td><td className="px-6 py-4 text-[#665b55]">{formatDate(order.returnDueAt)}</td><td className="px-6 py-4 font-semibold">{formatCurrency(order.rentalAmount)}</td><td className="px-6 py-4"><OrderStatusBadge status={order.status} /></td><td className="px-6 py-4 text-xs text-[#766b66]">{formatDateTime(order.createdAt)}</td><td className="px-6 py-4 text-right"><Link to={`${basePath}/rentals/${order.orderId}`} title="Xem chi tiết" aria-label={`Xem chi tiết đơn ${shortId(order.orderId)}`} className="inline-flex size-9 items-center justify-center rounded-lg border border-[#e1d6cf] text-[#a9544d] transition-colors hover:border-[#d8bdb6] hover:bg-[#fbe2de] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b65e56]/30"><Eye size={17} /></Link></td></tr>)}
                            {!loading && !visibleOrders.length && <tr><td colSpan="8" className="px-6 py-14 text-center"><ClipboardList className="mx-auto text-[#b9ada6]" /><p className="mt-3 font-semibold">Không tìm thấy đơn thuê</p><p className="mt-1 text-xs text-[#897d77]">Thử thay đổi điều kiện lọc.</p></td></tr>}
                            {loading && <tr><td colSpan="8" className="px-6 py-14 text-center text-[#897d77]">Đang tải danh sách đơn thuê...</td></tr>}
                        </tbody></table></div>
                    <div className="flex flex-col gap-4 border-t border-[#eadfd6] px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6"><label className="flex items-center gap-2 text-[#766b66]">Hiển thị <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }} className="rounded-lg border border-[#e1d6cf] bg-white px-2 py-1.5 outline-none">{[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}</select> trên tổng số {filteredOrders.length}</label><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} aria-label="Trang trước" className="rounded-lg border border-[#e1d6cf] p-2 disabled:opacity-40"><ChevronLeft size={17} /></button><span className="min-w-20 text-center text-[#766b66]">{page} / {totalPages}</span><button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} aria-label="Trang sau" className="rounded-lg border border-[#e1d6cf] p-2 disabled:opacity-40"><ChevronRight size={17} /></button></div></div>
                </section>
            </div>
        </main>
    </div>
}

export default OperationsRentalOrdersPage
