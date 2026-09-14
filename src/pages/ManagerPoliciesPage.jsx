import { useEffect, useMemo, useState } from "react"
import { CalendarClock, ClipboardCheck, Clock3, Plus, ShieldCheck } from "lucide-react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import ManagerHeader from "../components/manager/ManagerHeader.jsx"
import ManagerSidebar from "../components/manager/ManagerSidebar.jsx"
import PolicyVersionFormModal from "../components/manager/PolicyVersionFormModal.jsx"
import { formatCurrency } from "../components/rental/rentalOrderUtils.js"
import { clearAuthToken, getAuthUser, saveAuthUser } from "../services/authStorage.js"
import { createRentalPolicyVersion, getActiveRentalPolicy, getRentalPolicies } from "../services/policyApi.js"
import { getMyProfile } from "../services/userApi.js"

const formatDateTime = (value) => value
    ? new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(value))
    : "Không giới hạn"

const getPolicyStatus = (policy, activePolicyId, now) => {
    if (policy.policyId === activePolicyId) {
        return { label: "Đang hiệu lực", className: "border-[#b8d7cb] bg-[#d4e7dd] text-[#356353]" }
    }
    if (new Date(policy.effectiveFrom) > now) {
        return { label: "Đã lên lịch", className: "border-[#e8c98e] bg-[#fff0cf] text-[#876022]" }
    }
    return { label: "Hết hiệu lực", className: "border-[#d8cfca] bg-[#f1ece8] text-[#766b66]" }
}

const lateFeeSummary = (policy) => {
    if (!policy) return "Chưa cấu hình"
    if (policy.basis === "DAILY_RENTAL_AMOUNT") return "Đến 12:00: (ngày trễ − 0,5) × tiền thuê/ngày; sau 12:00: ngày trễ × tiền thuê/ngày"
    return `Trước ${String(policy.halfDayCutoffHour).padStart(2, "0")}:00: (ngày trễ − 0,5) × tổng tiền thuê cả kỳ; từ ${String(policy.halfDayCutoffHour).padStart(2, "0")}:00: ngày trễ × tổng tiền thuê cả kỳ`
}

function ManagerPoliciesPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const [profile, setProfile] = useState(() => getAuthUser())
    const [policies, setPolicies] = useState([])
    const [activePolicy, setActivePolicy] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [forbidden, setForbidden] = useState(false)
    const [reload, setReload] = useState(0)
    const [formOpen, setFormOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState("")

    useEffect(() => {
        let active = true
        const load = async () => {
            setLoading(true)
            setError("")
            try {
                const [user, policyList, current] = await Promise.all([
                    getMyProfile(),
                    getRentalPolicies(),
                    getActiveRentalPolicy(),
                ])
                if (!active) return
                if (user.role !== "STORE_MANAGER") { setForbidden(true); return }
                saveAuthUser(user)
                setProfile(user)
                setPolicies(Array.isArray(policyList) ? policyList : [])
                setActivePolicy(current)
            } catch (requestError) {
                if (!active) return
                if (requestError.response?.status === 401) {
                    navigate("/login", { replace: true, state: { from: location.pathname } })
                    return
                }
                if (requestError.response?.status === 403) { setForbidden(true); return }
                setError(requestError.response?.data?.message || "Không thể tải danh sách chính sách.")
            } finally { if (active) setLoading(false) }
        }
        load()
        return () => { active = false }
    }, [location.pathname, navigate, reload])

    const scheduledPolicies = useMemo(() => {
        const now = new Date()
        return policies
            .filter((policy) => new Date(policy.effectiveFrom) > now)
            .sort((first, second) => new Date(first.effectiveFrom) - new Date(second.effectiveFrom))
    }, [policies])

    const savePolicy = async (payload) => {
        setSaving(true)
        setFormError("")
        try {
            await createRentalPolicyVersion(payload)
            setFormOpen(false)
            toast.success("Đã tạo phiên bản chính sách mới")
            setReload((value) => value + 1)
        } catch (requestError) {
            setFormError(requestError.response?.data?.message || "Không thể tạo phiên bản chính sách.")
        } finally { setSaving(false) }
    }

    const logout = () => { clearAuthToken(); navigate("/login", { replace: true }) }
    if (forbidden) return <Navigate to="/" replace />

    return <div className="mx-auto flex min-h-screen max-w-[1920px] bg-[#faf6ef] text-[#453c38]">
        <ManagerSidebar role={profile?.role} />
        <main className="min-w-0 flex-1">
            <ManagerHeader profile={profile} loading={loading} title="Chính sách" subtitle="Quản lý phiên bản chính sách thuê bất biến" onReload={() => setReload((value) => value + 1)} onLogout={logout} />
            <div className="mx-auto max-w-[1440px] space-y-6 px-5 py-7 sm:px-8 lg:px-12 lg:py-9 xl:px-16">
                {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

                <section className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-[#eadfd6] bg-[#fffdf9] px-5 py-4"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#897d77]">Phiên bản hiện hành</p><p className="mt-1 font-serif text-3xl font-semibold">{loading ? "-" : activePolicy?.version || "Chưa có"}</p></div>
                    <div className="rounded-xl border border-[#eadfd6] bg-[#fffdf9] px-5 py-4"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#897d77]">Tổng phiên bản</p><p className="mt-1 font-serif text-3xl font-semibold">{loading ? "-" : policies.length}</p></div>
                    <div className="rounded-xl border border-[#eadfd6] bg-[#fffdf9] px-5 py-4"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#897d77]">Đã lên lịch</p><p className="mt-1 font-serif text-3xl font-semibold">{loading ? "-" : scheduledPolicies.length}</p></div>
                </section>

                {activePolicy && <section className="rounded-xl border border-[#cbded5] bg-[#edf5f1] p-5 sm:p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="flex gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/70 text-[#557b6d]"><ShieldCheck size={22} /></span><div><p className="text-xs font-semibold uppercase tracking-[.12em] text-[#62766e]">Chính sách đang hiệu lực</p><h2 className="mt-1 font-serif text-2xl font-semibold">{activePolicy.version}</h2><p className="mt-1 text-xs text-[#758981]">Từ {formatDateTime(activePolicy.effectiveFrom)}</p></div></div><button type="button" onClick={() => { setFormError(""); setFormOpen(true) }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#f2a39b] px-5 text-sm font-semibold hover:bg-[#ee9188] active:scale-[.98]"><Plus size={18} />Tạo phiên bản mới</button></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-white/65 p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-[#758981]">Giữ chỗ</p><p className="mt-1 font-semibold">{activePolicy.holdDuration} phút</p></div><div className="rounded-xl bg-white/65 p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-[#758981]">Ngưỡng duyệt phí</p><p className="mt-1 font-semibold">{formatCurrency(activePolicy.approvalThreshold)}</p></div><div className="rounded-xl bg-white/65 p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-[#758981]">Phí trả trễ</p><p className="mt-1 font-semibold">{lateFeeSummary(activePolicy.lateFeePolicy)}</p></div></div></section>}

                <section className="overflow-hidden rounded-xl border border-[#eadfd6] bg-[#fffdf9]">
                    <div className="flex items-center justify-between border-b border-[#eadfd6] px-5 py-4 sm:px-6"><div><h2 className="font-serif text-xl font-semibold">Lịch sử phiên bản</h2><p className="mt-1 text-xs text-[#897d77]">Chỉ đọc; thay đổi chính sách bằng cách tạo version mới.</p></div><ClipboardCheck size={21} className="text-[#b65e56]" /></div>
                    <div className="overflow-x-auto"><table className="w-full min-w-[1160px] text-left text-sm"><thead><tr className="border-b border-[#eadfd6] bg-[#faf6ef]/55 text-[#766b66]"><th className="px-6 py-3 font-medium">Phiên bản</th><th className="px-6 py-3 font-medium">Khoảng hiệu lực</th><th className="px-6 py-3 font-medium">Giữ chỗ</th><th className="px-6 py-3 font-medium">Ngưỡng duyệt</th><th className="px-6 py-3 font-medium">Quy tắc trả trễ</th><th className="px-6 py-3 font-medium">Trạng thái</th><th className="px-6 py-3 font-medium">Người tạo</th><th className="px-6 py-3 font-medium">Ngày tạo</th></tr></thead><tbody>{policies.map((policy) => { const status = getPolicyStatus(policy, activePolicy?.policyId, new Date()); return <tr key={policy.policyId} className="border-b border-[#eadfd6]/70 last:border-0 hover:bg-[#faf6ef]/55"><td className="px-6 py-4"><p className="font-semibold">{policy.version}</p><p className="mt-1 text-xs text-[#897d77]">#{policy.policyId.slice(0, 8)}</p></td><td className="px-6 py-4"><p className="flex items-center gap-1.5"><CalendarClock size={14} className="text-[#897d77]" />{formatDateTime(policy.effectiveFrom)}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-[#897d77]"><Clock3 size={13} />Đến {formatDateTime(policy.effectiveTo)}</p></td><td className="px-6 py-4">{policy.holdDuration} phút</td><td className="px-6 py-4 font-semibold">{formatCurrency(policy.approvalThreshold)}</td><td className="px-6 py-4 text-[#766b66]">{lateFeeSummary(policy.lateFeePolicy)}</td><td className="px-6 py-4"><span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-semibold ${status.className}`}>{status.label}</span></td><td className="px-6 py-4 text-[#766b66]">{policy.creator?.fullName || "Hệ thống"}</td><td className="px-6 py-4 text-[#766b66]">{formatDateTime(policy.createdAt)}</td></tr> })}{!loading && !policies.length && <tr><td colSpan="8" className="px-6 py-14 text-center text-[#897d77]">Chưa có phiên bản chính sách.</td></tr>}{loading && <tr><td colSpan="8" className="px-6 py-14 text-center text-[#897d77]">Đang tải chính sách...</td></tr>}</tbody></table></div>
                </section>
            </div>
        </main>

        {formOpen && activePolicy && <PolicyVersionFormModal currentPolicy={activePolicy} saving={saving} error={formError} onClose={() => { if (!saving) setFormOpen(false) }} onSubmit={savePolicy} />}
    </div>
}

export default ManagerPoliciesPage
