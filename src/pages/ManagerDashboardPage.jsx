import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { AlertTriangle, Banknote, FileCheck2, HandCoins, PackageCheck, ShoppingBag } from "lucide-react"

import CustomSelect from "../components/common/CustomSelect.jsx"
import AttentionOrdersTable from "../components/manager/AttentionOrdersTable.jsx"
import InventoryStatusChart from "../components/manager/InventoryStatusChart.jsx"
import ManagerHeader from "../components/manager/ManagerHeader.jsx"
import ManagerSidebar from "../components/manager/ManagerSidebar.jsx"
import MetricCard from "../components/manager/MetricCard.jsx"
import OrderStatusChart from "../components/manager/OrderStatusChart.jsx"
import StaffOverdueTable from "../components/manager/StaffOverdueTable.jsx"
import StaffWorkQueues from "../components/manager/StaffWorkQueues.jsx"
import { formatCurrency } from "../components/rental/rentalOrderUtils.js"
import { clearAuthToken, getAuthUser, saveAuthUser } from "../services/authStorage.js"
import { getManagerReport, getOperationalDashboard } from "../services/operationsApi.js"
import { getFeeApprovalRequests } from "../services/feeApprovalApi.js"
import { getRentalOrders } from "../services/rentalApi.js"
import { getManagedRentalUnits } from "../services/rentalUnitApi.js"
import { getMyProfile } from "../services/userApi.js"

const ORDER_STATUSES = [
    ["PENDING_PAYMENT", "Chờ thanh toán"], ["CONFIRMED", "Đã xác nhận"],
    ["PREPARING", "Đang chuẩn bị"], ["READY_FOR_PICKUP", "Sẵn sàng nhận"],
    ["RENTING", "Đang thuê"], ["OVERDUE", "Quá hạn"],
    ["RETURNED", "Đã nhận trả"], ["INSPECTING", "Đang kiểm tra"],
    ["SETTLEMENT_PENDING", "Chờ quyết toán"], ["COMPLETED", "Hoàn tất"],
    ["EXPIRED", "Hết hạn"], ["NO_SHOW", "Không đến nhận"],
    ["FULFILLMENT_FAILED", "Không thể cung cấp"],
]
const ORDER_STATUS_LABELS = Object.fromEntries(ORDER_STATUSES)

const UNIT_META = {
    AVAILABLE: ["Khả dụng", "#d1e4da"], PREPARING: ["Đang chuẩn bị", "#ffdad5"],
    RENTED: ["Đang cho thuê", "#f2a39b"], RETURN_INSPECTION: ["Chờ kiểm tra trả", "#e8c6b8"],
    CLEANING: ["Đang vệ sinh", "#b8d8cb"], MAINTENANCE: ["Bảo trì", "#e6c487"],
    DAMAGED: ["Hư hỏng", "#c96860"], RETIRED: ["Ngưng vĩnh viễn", "#ccc"],
}
const ATTENTION = new Set(["OVERDUE", "NO_SHOW", "FULFILLMENT_FAILED"])
const RANGE_OPTIONS = [["day", "Hôm nay"], ["7d", "7 ngày"], ["month", "1 tháng"], ["custom", "Tùy chỉnh"]]

const toDateInputValue = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-")
const formatAxisCurrency = (value) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}M`
    if (value >= 1_000) return `${Math.round(value / 1_000).toLocaleString("vi-VN")}K`
    return Number(value).toLocaleString("vi-VN")
}

function ManagerDashboardPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const [profile, setProfile] = useState(() => getAuthUser())
    const [profileVerified, setProfileVerified] = useState(false)
    const [dashboard, setDashboard] = useState(null)
    const [orders, setOrders] = useState([])
    const [units, setUnits] = useState([])
    const [feeApprovals, setFeeApprovals] = useState([])
    const [report, setReport] = useState(null)
    const [reportLoading, setReportLoading] = useState(false)
    const [reportError, setReportError] = useState("")
    const [reportRange, setReportRange] = useState("7d")
    const [customFrom, setCustomFrom] = useState(() => toDateInputValue(new Date(Date.now() - 6 * 86400000)))
    const [customTo, setCustomTo] = useState(() => toDateInputValue(new Date()))
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [forbidden, setForbidden] = useState(false)
    const [reload, setReload] = useState(0)

    const reportDateRange = useMemo(() => {
        const today = new Date()
        const to = reportRange === "custom" ? customTo : toDateInputValue(today)
        const days = reportRange === "day" ? 1 : reportRange === "month" ? 30 : 7
        const from = reportRange === "custom" ? customFrom : toDateInputValue(new Date(today.getFullYear(), today.getMonth(), today.getDate() - days + 1))
        return { from, to, invalid: !from || !to || from > to }
    }, [customFrom, customTo, reportRange])

    useEffect(() => {
        let active = true
        const load = async () => {
            setLoading(true); setError(""); setForbidden(false); setProfileVerified(false)
            try {
                const user = await getMyProfile()
                if (!active) return
                if (!["STORE_MANAGER", "RENTAL_STAFF"].includes(user.role)) { setForbidden(true); return }
                if (location.pathname === "/manager" && user.role !== "STORE_MANAGER") {
                    navigate("/staff", { replace: true })
                    return
                }
                if (location.pathname === "/staff" && user.role !== "RENTAL_STAFF") {
                    navigate("/manager", { replace: true })
                    return
                }
                const [ops, rentalOrders, rentalUnits, approvalRequests] = await Promise.all([
                    getOperationalDashboard(),
                    getRentalOrders(),
                    user.role === "STORE_MANAGER" ? getManagedRentalUnits() : Promise.resolve([]),
                    user.role === "STORE_MANAGER" ? getFeeApprovalRequests() : Promise.resolve([]),
                ])
                if (!active) return
                saveAuthUser(user)
                setProfile(user); setDashboard(ops)
                setProfileVerified(true)
                setOrders(Array.isArray(rentalOrders) ? rentalOrders : [])
                setUnits(Array.isArray(rentalUnits) ? rentalUnits : [])
                setFeeApprovals(Array.isArray(approvalRequests) ? approvalRequests : [])
            } catch (requestError) {
                if (!active) return
                if (requestError.response?.status === 401) return navigate("/login", { replace: true, state: { from: "/manager" } })
                if (requestError.response?.status === 403) return setForbidden(true)
                setError(requestError.response?.data?.message || "Không thể tải dữ liệu vận hành.")
            } finally { if (active) setLoading(false) }
        }
        load(); return () => { active = false }
    }, [location.pathname, navigate, reload])

    useEffect(() => {
        if (!profileVerified || profile?.role !== "STORE_MANAGER" || reportDateRange.invalid) return undefined
        let active = true
        const loadReport = async () => {
            setReportLoading(true)
            setReportError("")
            try {
                const data = await getManagerReport(reportDateRange.from, reportDateRange.to)
                if (active) setReport(data)
            } catch (requestError) {
                if (active) setReportError(requestError.response?.data?.message || "Không thể tải báo cáo cửa hàng.")
            } finally {
                if (active) setReportLoading(false)
            }
        }
        loadReport()
        return () => { active = false }
    }, [profile?.role, profileVerified, reload, reportDateRange])

    const reportStatusData = useMemo(() => (report?.orderStatus ?? []).map((item) => ({
        ...item,
        label: ORDER_STATUS_LABELS[item.status] ?? item.status,
    })), [report?.orderStatus])
    const reportStatusTotal = reportStatusData.reduce((sum, item) => sum + item.count, 0)

    const inventory = useMemo(() => {
        const counts = units.reduce((out, item) => ({ ...out, [item.status]: (out[item.status] || 0) + 1 }), {})
        return { counts, segments: Object.entries(UNIT_META).map(([status, [label, color]]) => ({ status, label, color, count: counts[status] || 0 })) }
    }, [units])
    const attentionOrders = useMemo(() => orders
        .filter((order) => ATTENTION.has(order.status))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [orders])
    const attention = attentionOrders.slice(0, 5)
    const renting = orders.filter((order) => order.status === "RENTING").length
    const pending = feeApprovals.filter((request) => request.status === "PENDING").length
    const preparationCount = orders.filter((order) => ["CONFIRMED", "PREPARING"].includes(order.status)).length
    const handoverCount = orders.filter((order) => order.status === "READY_FOR_PICKUP").length
    const returnCount = orders.filter((order) => ["RENTING", "OVERDUE", "RETURNED", "INSPECTING"].includes(order.status)).length
    const isManager = profile?.role === "STORE_MANAGER"
    const isStaff = profile?.role === "RENTAL_STAFF"
    const reportOverview = report?.overview ?? {}
    const logout = () => { clearAuthToken(); navigate("/login", { replace: true }) }

    if (forbidden) return <main className="flex min-h-screen items-center justify-center bg-[#faf6ef] p-5 text-center"><div className="rounded-xl border border-[#eadfd6] bg-white p-8"><AlertTriangle className="mx-auto text-red-600" /><h1 className="mt-4 font-serif text-2xl font-semibold">Không có quyền truy cập</h1><p className="mt-2 text-sm text-[#766b66]">Trang này chỉ dành cho nhân sự vận hành cửa hàng.</p><Link to="/" className="mt-5 inline-flex rounded-lg bg-[#f2a39b] px-5 py-2.5 text-sm font-semibold">Về cửa hàng</Link></div></main>

    return <div className="mx-auto flex min-h-screen max-w-[1920px] bg-[#faf6ef] text-[#453c38]">
        <ManagerSidebar role={profile?.role} />
        <main id="overview" className="min-w-0 flex-1">
            <ManagerHeader profile={profile} loading={loading} onReload={() => setReload((value) => value + 1)} onLogout={logout} />
            <div className="mx-auto max-w-[1440px] space-y-8 px-5 py-8 sm:px-8 lg:px-12 lg:py-12 xl:px-16">
                {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
                {loading ? <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-44 animate-pulse rounded-xl bg-white" />)}</div> : dashboard && <>
                    {isManager && <section className="rounded-xl border border-[#eadfd6] bg-[#fffdf9] p-5 sm:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div><h2 className="text-xl font-semibold">Khoảng thời gian báo cáo</h2><p className="mt-1 text-xs text-[#897d77]">Mặc định 7 ngày, theo múi giờ Asia/Ho_Chi_Minh.</p></div>
                            <div className="flex flex-wrap items-end gap-3">
                                <div className="w-36"><CustomSelect value={reportRange} onChange={(event) => setReportRange(event.target.value)} options={RANGE_OPTIONS} ariaLabel="Khoảng thời gian báo cáo" /></div>
                                {reportRange === "custom" && <>
                                    <label className="grid gap-1 text-xs font-semibold text-[#766b66]">Từ ngày<input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="h-11 rounded-xl border border-[#e1d6cf] bg-[#faf6ef] px-3 font-normal outline-none focus:border-[#f2a39b]" /></label>
                                    <label className="grid gap-1 text-xs font-semibold text-[#766b66]">Đến ngày<input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="h-11 rounded-xl border border-[#e1d6cf] bg-[#faf6ef] px-3 font-normal outline-none focus:border-[#f2a39b]" /></label>
                                </>}
                            </div>
                        </div>
                        {reportDateRange.invalid && <p role="alert" className="mt-3 text-right text-xs font-semibold text-[#b94740]">Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.</p>}
                    </section>}

                    <section className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
                        {isManager ? <>
                            <MetricCard label="Doanh thu tiền thuê" value={reportLoading ? "..." : formatCurrency(reportOverview.rentalRevenue)} icon={Banknote} tone="bg-[#fbe2de]/70 text-[#b65e56]" valueSizeClass="text-[34px]" />
                            <MetricCard label="Đơn đang thuê" value={renting} icon={ShoppingBag} tone="bg-[#d4e7dd]/65 text-[#557b6d]" />
                            <MetricCard label="Đơn quá hạn" value={dashboard.summary.overdueOrderCount} icon={AlertTriangle} tone="bg-[#ffdad5]/60 text-[#b94740]" valueClass="text-[#b94740]" />
                            <MetricCard label="Phí chờ phê duyệt" value={pending} icon={FileCheck2} tone="bg-[#f0dfd9]/70 text-[#8b4d47]" />
                        </> : isStaff ? <>
                            <MetricCard label="Đơn cần chuẩn bị" value={preparationCount} icon={PackageCheck} tone="bg-[#fbe2de]/70 text-[#b65e56]" />
                            <MetricCard label="Đơn chờ bàn giao" value={handoverCount} icon={HandCoins} tone="bg-[#d4e7dd]/65 text-[#557b6d]" />
                            <MetricCard label="Đơn cần nhận trả" value={returnCount} icon={ShoppingBag} tone="bg-[#f0dfd9]/70 text-[#8b4d47]" />
                            <MetricCard label="Đơn quá hạn" value={dashboard.summary.overdueOrderCount} icon={AlertTriangle} tone="bg-[#ffdad5]/60 text-[#b94740]" valueClass="text-[#b94740]" />
                        </> : null}
                    </section>
                    {isStaff && <StaffWorkQueues orders={orders} />}
                    {isStaff && <StaffOverdueTable orders={dashboard.overdueOrders ?? []} />}
                    {isManager && (
                        <>
                            <section>
                                <div className="mb-4"><h2 className="text-2xl font-semibold">Biểu đồ tổng quan</h2><p className="mt-1 text-sm text-[#897d77]">Trạng thái đơn theo khoảng đã chọn; RentalUnit là dữ liệu kho hiện tại.</p></div>
                                <div className="grid gap-6 lg:grid-cols-10">{reportLoading ? <div className="h-[500px] animate-pulse rounded-xl bg-[#fffdf9] lg:col-span-6" /> : <OrderStatusChart data={reportStatusData} total={reportStatusTotal} />}<InventoryStatusChart segments={inventory.segments} /></div>
                            </section>

                            <section className="rounded-xl border border-[#eadfd6] bg-[#fffdf9] p-6 sm:p-8">
                                <div><h2 className="font-serif text-xl font-semibold">Tổng quan tài chính</h2><p className="mt-1 text-xs text-[#897d77]">Tiền cọc không được tính vào doanh thu tiền thuê.</p></div>
                                <div className="mt-6 h-[330px]">{reportLoading ? <div className="h-full animate-pulse rounded-xl bg-[#faf6ef]" /> : (report?.finance?.periods?.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={report.finance.periods} margin={{ top: 10, right: 12, left: 8, bottom: 10 }}><CartesianGrid stroke="#eadfd6" vertical={false} /><XAxis dataKey="label" tick={{ fill: "#766b66", fontSize: 11 }} minTickGap={20} /><YAxis width={50} tick={{ fill: "#897d77", fontSize: 10 }} tickFormatter={formatAxisCurrency} /><Tooltip formatter={(value, name) => [formatCurrency(value), name]} cursor={{ fill: "#faf6ef" }} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar name="Doanh thu tiền thuê" dataKey="rentalRevenue" fill="#f2a39b" radius={[4, 4, 0, 0]} /><Bar name="Phí phát sinh" dataKey="additionalFees" fill="#8b4d47" radius={[4, 4, 0, 0]} /><Bar name="Refund" dataKey="refunds" fill="#857371" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center rounded-xl bg-[#faf6ef]/60 text-sm text-[#897d77]">Chưa có dữ liệu tài chính trong khoảng này.</div>)}</div>
                                <dl className="mt-5 grid gap-3 border-t border-[#eadfd6] pt-5 sm:grid-cols-2 xl:grid-cols-4">
                                    {[
                                        ["Phí phát sinh", reportOverview.additionalFees],
                                        ["Tiền cọc đã thu", reportOverview.collectedDeposits],
                                        ["Tiền cọc đã hoàn", reportOverview.returnedDeposits],
                                        ["Refund", reportOverview.totalRefunds],
                                    ].map(([label, value]) => <div key={label} className="rounded-lg bg-[#faf6ef]/70 px-4 py-3"><dt className="text-xs text-[#897d77]">{label}</dt><dd className="mt-1 text-base font-semibold text-[#534944]">{reportLoading ? "-" : formatCurrency(value)}</dd></div>)}
                                </dl>
                            </section>

                            {reportError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{reportError}</p>}
                            <AttentionOrdersTable orders={attention} detailBasePath="/manager/rentals" />

                            <section className="overflow-hidden rounded-xl border border-[#eadfd6] bg-[#fffdf9]">
                                <div className="border-b border-[#eadfd6] px-6 py-5"><h2 className="font-serif text-xl font-semibold">Trang phục được thuê nhiều</h2><p className="mt-1 text-xs text-[#897d77]">Xếp theo số lượt thuê trong khoảng đã chọn.</p></div>
                                <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-[#eadfd6] bg-[#faf6ef]/55 text-[#766b66]"><th className="px-6 py-3 font-medium">Trang phục</th><th className="px-6 py-3 text-right font-medium">Số lượt thuê</th><th className="px-6 py-3 text-right font-medium">Doanh thu tiền thuê</th></tr></thead><tbody>{(report?.popularGarments ?? []).map((garment) => <tr key={garment.garmentId} className="border-b border-[#eadfd6]/70 last:border-0"><td className="px-6 py-4 font-semibold">{garment.name}</td><td className="px-6 py-4 text-right">{garment.rentalCount}</td><td className="px-6 py-4 text-right font-semibold">{formatCurrency(garment.rentalRevenue)}</td></tr>)}{!reportLoading && !(report?.popularGarments?.length) && <tr><td colSpan="3" className="px-6 py-12 text-center text-[#897d77]">Chưa có trang phục phát sinh lượt thuê trong khoảng này.</td></tr>}</tbody></table></div>
                            </section>
                        </>
                    )}
                </>}
            </div>
        </main>
    </div>
}

export default ManagerDashboardPage
