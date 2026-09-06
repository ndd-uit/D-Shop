import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, LoaderCircle, RefreshCw, RotateCcw, Search, WalletCards } from "lucide-react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import CustomSelect from "../components/common/CustomSelect.jsx"
import ManagerHeader from "../components/manager/ManagerHeader.jsx"
import ManagerSidebar from "../components/manager/ManagerSidebar.jsx"
import ConfirmRefundModal from "../components/manager/ConfirmRefundModal.jsx"
import { formatCurrency } from "../components/rental/rentalOrderUtils.js"
import { clearAuthToken, getAuthUser, saveAuthUser } from "../services/authStorage.js"
import {
    createRentalRefund,
    getExpiredHoldReconciliations,
    getRefunds,
    retryFailedRefund,
} from "../services/paymentApi.js"
import { getMyProfile } from "../services/userApi.js"

const STATUS_META = {
    PENDING: ["Chờ hoàn tiền", "border-[#e8c98e] bg-[#fff0cf] text-[#876022]"],
    SUCCEEDED: ["Thành công", "border-[#b8d7cb] bg-[#d4e7dd] text-[#356353]"],
    FAILED: ["Thất bại", "border-[#e6beb9] bg-[#fbe2de] text-[#9b4d47]"],
}
const TYPE_LABEL = {
    DEPOSIT_RETURN: "Hoàn tiền cọc",
    RENTAL_REFUND: "Hoàn tiền thuê",
}
const RECONCILIATION_LABEL = {
    NEEDS_REFUND: "Cần tạo hoàn tiền",
    REFUND_PENDING: "Đang hoàn tiền",
    REFUND_FAILED: "Hoàn tiền thất bại",
    RESOLVED: "Đã đối soát",
}
const formatDateTime = (value) => value ? new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
}).format(new Date(value)) : "-"

function ManagerRefundsPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const [profile, setProfile] = useState(() => getAuthUser())
    const [refunds, setRefunds] = useState([])
    const [reconciliations, setReconciliations] = useState([])
    const [loading, setLoading] = useState(true)
    const [forbidden, setForbidden] = useState(false)
    const [error, setError] = useState("")
    const [reload, setReload] = useState(0)
    const [keyword, setKeyword] = useState("")
    const [status, setStatus] = useState("")
    const [actionKey, setActionKey] = useState("")
    const [confirmingRefund, setConfirmingRefund] = useState(null)

    useEffect(() => {
        let active = true
        const load = async () => {
            setLoading(true)
            setError("")
            try {
                const user = await getMyProfile()
                if (!active) return
                if (user.role !== "STORE_MANAGER") {
                    setForbidden(true)
                    return
                }
                const [refundData, reconciliationData] = await Promise.all([
                    getRefunds(),
                    getExpiredHoldReconciliations(),
                ])
                if (!active) return
                saveAuthUser(user)
                setProfile(user)
                setRefunds(Array.isArray(refundData) ? refundData : [])
                setReconciliations(Array.isArray(reconciliationData) ? reconciliationData : [])
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
                setError(requestError.response?.data?.message || "Không thể tải dữ liệu hoàn tiền.")
            } finally {
                if (active) setLoading(false)
            }
        }
        load()
        return () => { active = false }
    }, [location.pathname, navigate, reload])

    const counts = useMemo(() => ({
        pending: refunds.filter((refund) => refund.status === "PENDING").length,
        failed: refunds.filter((refund) => refund.status === "FAILED").length,
        succeeded: refunds.filter((refund) => refund.status === "SUCCEEDED").length,
        needsReconciliation: reconciliations.filter((item) => item.reconciliationStatus !== "RESOLVED").length,
    }), [reconciliations, refunds])
    const filteredRefunds = useMemo(() => {
        const query = keyword.trim().toLowerCase()
        return refunds.filter((refund) => {
            const searchable = [refund.refundId, refund.rentalOrderId, refund.transactionRef, refund.reason].filter(Boolean).join(" ").toLowerCase()
            return (!status || refund.status === status) && (!query || searchable.includes(query))
        })
    }, [keyword, refunds, status])

    const openGateway = (result) => {
        if (result.gatewayUrl || result.paymentUrl || result.refundUrl) {
            window.open(result.gatewayUrl || result.paymentUrl || result.refundUrl, "_blank", "noopener,noreferrer")
        }
    }
    const retry = async (refund) => {
        setActionKey(refund.refundId)
        try {
            const result = await retryFailedRefund(refund.refundId)
            openGateway(result)
            toast.success("Đã mở lại yêu cầu hoàn tiền. Kiểm tra giao dịch trước khi thực hiện hoàn.")
            setReload((value) => value + 1)
        } catch (requestError) {
            toast.error(requestError.response?.data?.message || "Không thể thử lại hoàn tiền.")
        } finally {
            setActionKey("")
        }
    }
    const createReconciliationRefund = async (item) => {
        setActionKey(item.paymentId)
        try {
            const result = await createRentalRefund(item.rentalOrderId)
            openGateway(result)
            toast.success("Đã tạo yêu cầu hoàn tiền thuê")
            setReload((value) => value + 1)
        } catch (requestError) {
            toast.error(requestError.response?.data?.message || "Không thể tạo hoàn tiền đối soát.")
        } finally {
            setActionKey("")
        }
    }

    if (forbidden) return <Navigate to="/" replace />
    const logout = () => { clearAuthToken(); navigate("/login", { replace: true }) }

    return <div className="mx-auto flex min-h-screen max-w-[1920px] bg-[#faf6ef] text-[#453c38]">
        <ManagerSidebar role={profile?.role} />
        <main className="min-w-0 flex-1">
            <ManagerHeader profile={profile} loading={loading} title="Hoàn tiền & đối soát" subtitle="Theo dõi hoàn cọc, hoàn tiền thuê và giao dịch đến sau khi giữ chỗ hết hạn" onReload={() => setReload((value) => value + 1)} onLogout={logout} />
            <div className="mx-auto max-w-[1440px] space-y-6 px-5 py-7 sm:px-8 lg:px-12 lg:py-9 xl:px-16">
                {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Chờ hoàn tiền", counts.pending], ["Thất bại", counts.failed], ["Thành công", counts.succeeded], ["Cần đối soát", counts.needsReconciliation]].map(([label, value]) => <div key={label} className="rounded-xl border border-[#eadfd6] bg-[#fffdf9] p-5"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#897d77]">{label}</p><p className="mt-2 font-serif text-3xl font-semibold">{loading ? "-" : value}</p></div>)}</section>
                <section className="rounded-xl border border-[#eadfd6] bg-[#fffdf9]">
                    <div className="flex items-center justify-between border-b border-[#eadfd6] px-5 py-4 sm:px-6"><div><h2 className="font-serif text-xl font-semibold">Payment cần đối soát</h2><p className="mt-1 text-xs text-[#897d77]">Chỉ gồm tiền thuê thành công khi Order đã EXPIRED.</p></div><WalletCards size={21} className="text-[#b65e56]" /></div>
                    <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b border-[#eadfd6] bg-[#faf6ef]/55 text-[#766b66]"><th className="px-6 py-3 font-medium">Đơn thuê</th><th className="px-6 py-3 font-medium">Số tiền</th><th className="px-6 py-3 font-medium">Thanh toán lúc</th><th className="px-6 py-3 font-medium">Đối soát</th><th className="px-6 py-3 text-right font-medium">Thao tác</th></tr></thead><tbody>{reconciliations.map((item) => <tr key={item.paymentId} className="border-b border-[#eadfd6]/70 last:border-0"><td className="px-6 py-4"><p className="font-semibold">#{item.rentalOrderId.slice(0, 8)}</p><p className="mt-1 text-xs text-[#897d77]">Payment #{item.paymentId.slice(0, 8)}</p></td><td className="px-6 py-4 font-semibold">{formatCurrency(item.amount)}</td><td className="px-6 py-4 text-[#665b55]">{formatDateTime(item.paidAt)}</td><td className="px-6 py-4">{RECONCILIATION_LABEL[item.reconciliationStatus] || item.reconciliationStatus}</td><td className="px-6 py-4 text-right">{item.reconciliationStatus === "NEEDS_REFUND" ? <button type="button" onClick={() => createReconciliationRefund(item)} disabled={Boolean(actionKey)} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#f2a39b] px-3.5 text-xs font-semibold disabled:opacity-50">{actionKey === item.paymentId && <LoaderCircle size={15} className="animate-spin" />}Tạo hoàn tiền</button> : item.reconciliationStatus === "REFUND_FAILED" && item.latestRefund ? <button type="button" onClick={() => retry(item.latestRefund)} disabled={Boolean(actionKey)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#e6beb9] px-3.5 text-xs font-semibold text-[#9b4d47]"><RotateCcw size={15} />Thử lại</button> : <span className="text-xs text-[#897d77]">{item.reconciliationStatus === "RESOLVED" ? "Đã hoàn tất" : "Chờ xác nhận hoàn tiền"}</span>}</td></tr>)}{!loading && !reconciliations.length && <tr><td colSpan="5" className="px-6 py-12 text-center text-[#897d77]">Không có giao dịch cần đối soát.</td></tr>}</tbody></table></div>
                </section>
                <section className="rounded-xl border border-[#eadfd6] bg-[#fffdf9]">
                    <div className="flex flex-col gap-4 border-b border-[#eadfd6] p-5 lg:flex-row lg:items-end"><div className="min-w-0 flex-1"><h2 className="font-serif text-xl font-semibold">Danh sách Refund</h2><p className="mt-1 text-xs text-[#897d77]">DEPOSIT_RETURN và RENTAL_REFUND.</p></div><label className="relative min-w-0 lg:w-72"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9c918b]" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Mã refund, đơn hoặc giao dịch" className="min-h-10 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef] pl-9 pr-3 text-sm outline-none" /></label><div className="lg:w-48"><CustomSelect value={status} onChange={(event) => setStatus(event.target.value)} options={Object.entries(STATUS_META).map(([value, meta]) => [value, meta[0]])} placeholder="Tất cả trạng thái" /></div></div>
                    <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead><tr className="border-b border-[#eadfd6] bg-[#faf6ef]/55 text-[#766b66]"><th className="px-6 py-3 font-medium">Refund</th><th className="px-6 py-3 font-medium">Đơn thuê</th><th className="px-6 py-3 font-medium">Loại</th><th className="px-6 py-3 font-medium">Số tiền</th><th className="px-6 py-3 font-medium">Trạng thái</th><th className="px-6 py-3 font-medium">Thời gian</th><th className="px-6 py-3 text-right font-medium">Thao tác</th></tr></thead><tbody>{filteredRefunds.map((refund) => { const meta = STATUS_META[refund.status] || [refund.status, "border-[#d4ccc7] bg-[#eae6e2]"]; return <tr key={refund.refundId} className="border-b border-[#eadfd6]/70 last:border-0"><td className="px-6 py-4"><p className="font-mono font-semibold">#{refund.refundId.slice(0, 8)}</p><p className="mt-1 max-w-xs truncate text-xs text-[#897d77]">{refund.reason || "Không có lý do"}</p></td><td className="px-6 py-4"><button type="button" onClick={() => navigate(`/manager/rentals/${refund.rentalOrderId}`)} className="font-semibold text-[#a9544d] hover:underline">#{refund.rentalOrderId.slice(0, 8)}</button></td><td className="px-6 py-4">{TYPE_LABEL[refund.type] || refund.type}</td><td className="px-6 py-4 font-semibold">{formatCurrency(refund.amount)}</td><td className="px-6 py-4"><span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-semibold ${meta[1]}`}>{meta[0]}</span></td><td className="px-6 py-4 text-xs leading-5 text-[#665b55]"><p>Tạo: {formatDateTime(refund.createdAt)}</p><p>Xong: {formatDateTime(refund.completedAt)}</p>{refund.transactionRef && <p className="max-w-48 break-words" title={refund.transactionRef}>Mã GD: {refund.transactionRef}</p>}</td><td className="px-6 py-4 text-right">{refund.status === "FAILED" ? <button type="button" onClick={() => retry(refund)} disabled={Boolean(actionKey)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#e6beb9] px-3.5 text-xs font-semibold text-[#9b4d47] disabled:opacity-50">{actionKey === refund.refundId ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />}Thử lại</button> : refund.status === "PENDING" ? <button type="button" onClick={() => setConfirmingRefund(refund)} disabled={Boolean(actionKey)} title="Xác nhận đã hoàn tiền" aria-label="Xác nhận đã hoàn tiền" className="inline-flex size-9 items-center justify-center rounded-lg border border-[#e1d6cf] text-[#876022] transition hover:bg-[#faf6ef] disabled:opacity-50"><CheckCircle2 size={16} /></button> : <span className="text-xs text-[#356353]">Đã hoàn tất</span>}</td></tr> })}{!loading && !filteredRefunds.length && <tr><td colSpan="7" className="px-6 py-14 text-center text-[#897d77]">Không có Refund phù hợp.</td></tr>}{loading && <tr><td colSpan="7" className="px-6 py-14 text-center text-[#897d77]"><LoaderCircle className="mx-auto mb-2 animate-spin" size={22} />Đang tải...</td></tr>}</tbody></table></div>
                </section>
            </div>
        </main>
        {confirmingRefund && <ConfirmRefundModal
            key={confirmingRefund.refundId}
            refund={confirmingRefund}
            onClose={() => setConfirmingRefund(null)}
            onConfirmed={() => {
                setConfirmingRefund(null)
                setReload((value) => value + 1)
                toast.success("Đã ghi nhận hoàn tiền thành công")
            }}
        />}
    </div>
}

export default ManagerRefundsPage
