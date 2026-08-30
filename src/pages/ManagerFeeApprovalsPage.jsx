import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, ClipboardCheck, Clock3, Eye, LoaderCircle, Search, SlidersHorizontal, XCircle } from "lucide-react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import CustomSelect from "../components/common/CustomSelect.jsx"
import FeeApprovalDecisionModal from "../components/manager/FeeApprovalDecisionModal.jsx"
import ManagerHeader from "../components/manager/ManagerHeader.jsx"
import ManagerSidebar from "../components/manager/ManagerSidebar.jsx"
import { clearAuthToken, getAuthUser, saveAuthUser } from "../services/authStorage.js"
import { decideFeeApproval, getFeeApprovalRequests } from "../services/feeApprovalApi.js"
import { getMyProfile } from "../services/userApi.js"

const statusMeta = {
    PENDING: { label: "Chờ phê duyệt", className: "border-[#e8c98e] bg-[#fff0cf] text-[#876022]" },
    APPROVED: { label: "Đã duyệt", className: "border-[#b8d7cb] bg-[#d4e7dd] text-[#356353]" },
    ADJUSTED: { label: "Đã điều chỉnh", className: "border-[#b9cce3] bg-[#e5eef7] text-[#496985]" },
    REJECTED: { label: "Không thu phí", className: "border-[#e6beb9] bg-[#fbe2de] text-[#9b4d47]" },
}

const formatCurrency = (value) => `${new Intl.NumberFormat("vi-VN").format(Number(value || 0))}đ`
const formatDateTime = (value) => value ? new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
}).format(new Date(value)) : "-"

function ManagerFeeApprovalsPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const [profile, setProfile] = useState(() => getAuthUser())
    const [requests, setRequests] = useState([])
    const [keyword, setKeyword] = useState("")
    const [status, setStatus] = useState("PENDING")
    const [loading, setLoading] = useState(true)
    const [forbidden, setForbidden] = useState(false)
    const [error, setError] = useState("")
    const [reload, setReload] = useState(0)
    const [selectedRequest, setSelectedRequest] = useState(null)
    const [saving, setSaving] = useState(false)
    const [decisionError, setDecisionError] = useState("")

    useEffect(() => {
        let active = true
        const load = async () => {
            setLoading(true)
            setError("")
            try {
                const [user, data] = await Promise.all([
                    getMyProfile(),
                    getFeeApprovalRequests(),
                ])
                if (!active) return
                if (user.role !== "STORE_MANAGER") { setForbidden(true); return }
                saveAuthUser(user)
                setProfile(user)
                setRequests(Array.isArray(data) ? data : [])
            } catch (requestError) {
                if (!active) return
                if (requestError.response?.status === 401) {
                    navigate("/login", { replace: true, state: { from: location.pathname } })
                    return
                }
                if (requestError.response?.status === 403) { setForbidden(true); return }
                setError(requestError.response?.data?.message || "Không thể tải danh sách phí cần phê duyệt.")
            } finally { if (active) setLoading(false) }
        }
        load()
        return () => { active = false }
    }, [location.pathname, navigate, reload])

    const counts = useMemo(() => ({
        pending: requests.filter((item) => item.status === "PENDING").length,
        resolved: requests.filter((item) => ["APPROVED", "ADJUSTED"].includes(item.status)).length,
        rejected: requests.filter((item) => item.status === "REJECTED").length,
    }), [requests])

    const filteredRequests = useMemo(() => {
        const value = keyword.trim().toLowerCase()
        return requests.filter((item) => {
            const order = item.rentalOrder
            const searchable = [item.rentalOrderId, order.customer.fullName, order.customer.email, order.customer.phone]
                .filter(Boolean).join(" ").toLowerCase()
            return (!status || item.status === status) && (!value || searchable.includes(value))
        })
    }, [keyword, requests, status])

    const submitDecision = async (payload) => {
        setSaving(true)
        setDecisionError("")
        try {
            const result = await decideFeeApproval(selectedRequest.feeApprovalRequestId, payload)
            const updated = result.approvalRequest
            setRequests((current) => current.map((item) => item.feeApprovalRequestId === updated.feeApprovalRequestId
                ? { ...item, ...updated, decider: profile }
                : item))
            setSelectedRequest(null)
            toast.success(payload.decision === "REJECTED" ? "Đã xác nhận không thu phí" : "Đã chốt phí phát sinh")
        } catch (requestError) {
            setDecisionError(requestError.response?.data?.message || "Không thể xử lý yêu cầu phê duyệt.")
            if (requestError.response?.status === 409) setReload((value) => value + 1)
        } finally { setSaving(false) }
    }

    const logout = () => { clearAuthToken(); navigate("/login", { replace: true }) }
    if (forbidden) return <Navigate to="/" replace />

    return <div className="mx-auto flex min-h-screen max-w-[1920px] bg-[#faf6ef] text-[#453c38]">
        <ManagerSidebar role={profile?.role} />
        <main className="min-w-0 flex-1">
            <ManagerHeader profile={profile} loading={loading} title="Phê duyệt phí" subtitle="Kiểm tra và chốt phí phát sinh sau khi hoàn trả" onReload={() => setReload((value) => value + 1)} onLogout={logout} />
            <div className="mx-auto max-w-[1440px] space-y-6 px-5 py-7 sm:px-8 lg:px-12 lg:py-9 xl:px-16">
                {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

                <section className="grid gap-4 sm:grid-cols-3">
                    {[
                        ["Đang chờ xử lý", counts.pending, Clock3, "bg-[#fff0cf] text-[#876022]"],
                        ["Đã chốt phí", counts.resolved, CheckCircle2, "bg-[#d4e7dd] text-[#356353]"],
                        ["Không thu phí", counts.rejected, XCircle, "bg-[#fbe2de] text-[#9b4d47]"],
                    ].map(([label, value, Icon, tone]) => <div key={label} className="flex items-center justify-between rounded-xl border border-[#eadfd6] bg-[#fffdf9] px-5 py-4"><div><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#897d77]">{label}</p><p className="mt-1 font-serif text-3xl font-semibold">{loading ? "-" : value}</p></div><span className={`flex size-11 items-center justify-center rounded-xl ${tone}`}><Icon size={21} /></span></div>)}
                </section>

                <section className="flex flex-col gap-4 rounded-xl border border-[#eadfd6] bg-[#fffdf9] p-5 lg:flex-row lg:items-end">
                    <label className="min-w-0 flex-1"><span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#766b66]">Tìm yêu cầu</span><span className="relative block"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9c918b]" /><input type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Mã đơn, tên, email hoặc số điện thoại" className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/60 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></span></label>
                    <label className="lg:w-60"><span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#766b66]">Trạng thái</span><CustomSelect value={status} onChange={(event) => setStatus(event.target.value)} options={Object.entries(statusMeta).map(([value, meta]) => [value, meta.label])} placeholder="Tất cả trạng thái" buttonClassName="bg-[#faf6ef]/60" /></label>
                </section>

                <section className="overflow-hidden rounded-xl border border-[#eadfd6] bg-[#fffdf9]">
                    <div className="flex items-center justify-between border-b border-[#eadfd6] px-5 py-4 sm:px-6"><div><h2 className="font-serif text-xl font-semibold">Danh sách đề xuất phí</h2><p className="mt-1 text-xs text-[#897d77]">{filteredRequests.length} kết quả</p></div><ClipboardCheck size={21} className="text-[#b65e56]" /></div>
                    <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead><tr className="border-b border-[#eadfd6] bg-[#faf6ef]/55 text-[#766b66]"><th className="px-6 py-3 font-medium">Đơn thuê</th><th className="px-6 py-3 font-medium">Khách hàng</th><th className="px-6 py-3 font-medium">Phí đề xuất</th><th className="px-6 py-3 font-medium">Phí đã chốt</th><th className="px-6 py-3 font-medium">Trạng thái</th><th className="px-6 py-3 font-medium">Ngày đề xuất</th><th className="px-6 py-3 text-right font-medium">Thao tác</th></tr></thead>
                        <tbody>{filteredRequests.map((item) => { const meta = statusMeta[item.status] || statusMeta.PENDING; return <tr key={item.feeApprovalRequestId} className="border-b border-[#eadfd6]/70 last:border-0 hover:bg-[#faf6ef]/55"><td className="px-6 py-4"><p className="font-semibold">#{item.rentalOrderId.slice(0, 8)}</p><p className="mt-1 text-xs text-[#897d77]">{item.rentalOrder.items.length} trang phục</p></td><td className="px-6 py-4"><p className="font-semibold">{item.rentalOrder.customer.fullName}</p><p className="mt-1 text-xs text-[#897d77]">{item.rentalOrder.customer.phone || item.rentalOrder.customer.email}</p></td><td className="px-6 py-4 font-semibold text-[#9b4d47]">{formatCurrency(item.proposedAmount)}</td><td className="px-6 py-4">{item.finalAmount == null ? "-" : formatCurrency(item.finalAmount)}</td><td className="px-6 py-4"><span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-semibold ${meta.className}`}>{meta.label}</span></td><td className="px-6 py-4 text-[#766b66]">{formatDateTime(item.createdAt)}</td><td className="px-6 py-4 text-right">{item.status === "PENDING" ? <button type="button" onClick={() => { setDecisionError(""); setSelectedRequest(item) }} title="Xử lý đề xuất phí" aria-label={`Xử lý đề xuất phí của đơn ${item.rentalOrderId.slice(0, 8)}`} className="inline-flex size-9 items-center justify-center rounded-lg bg-[#f2a39b] text-[#453c38] transition hover:bg-[#ee9188]"><SlidersHorizontal size={16} /></button> : <button type="button" onClick={() => navigate(`/manager/rentals/${item.rentalOrderId}`)} title="Xem đơn thuê" aria-label={`Xem đơn ${item.rentalOrderId.slice(0, 8)}`} className="inline-flex size-9 items-center justify-center rounded-lg border border-[#e1d6cf] text-[#665b55] transition hover:border-[#cdbfb6] hover:bg-[#faf6ef]"><Eye size={16} /></button>}</td></tr> })}
                            {!loading && !filteredRequests.length && <tr><td colSpan="7" className="px-6 py-16 text-center"><ClipboardCheck className="mx-auto text-[#c8bbb4]" size={30} /><p className="mt-3 font-semibold">Không có yêu cầu phù hợp</p><p className="mt-1 text-xs text-[#897d77]">Các đề xuất phí phát sinh sẽ xuất hiện tại đây.</p></td></tr>}
                            {loading && <tr><td colSpan="7" className="px-6 py-16 text-center text-[#897d77]"><LoaderCircle className="mx-auto mb-2 animate-spin" size={22} />Đang tải danh sách...</td></tr>}
                        </tbody></table></div>
                </section>
            </div>
        </main>
        {selectedRequest && <FeeApprovalDecisionModal request={selectedRequest} saving={saving} error={decisionError} onClose={() => { if (!saving) setSelectedRequest(null) }} onSubmit={submitDecision} />}
    </div>
}

export default ManagerFeeApprovalsPage
