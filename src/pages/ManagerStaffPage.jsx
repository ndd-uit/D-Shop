import { useEffect, useMemo, useState } from "react"
import { LoaderCircle, Mail, Pencil, Phone, Plus, Search, UsersRound } from "lucide-react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"

import CustomSelect from "../components/common/CustomSelect.jsx"
import ManagerHeader from "../components/manager/ManagerHeader.jsx"
import ManagerSidebar from "../components/manager/ManagerSidebar.jsx"
import StaffFormModal from "../components/manager/StaffFormModal.jsx"
import { clearAuthToken, getAuthUser, saveAuthUser } from "../services/authStorage.js"
import { createStaff, getStaff, updateStaff, updateStaffStatus } from "../services/staffApi.js"
import { getMyProfile } from "../services/userApi.js"

const formatCreatedAt = (value) => value
    ? new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(value))
    : "-"

function ManagerStaffPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const [profile, setProfile] = useState(() => getAuthUser())
    const [staff, setStaff] = useState([])
    const [keyword, setKeyword] = useState("")
    const [status, setStatus] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [forbidden, setForbidden] = useState(false)
    const [reload, setReload] = useState(0)
    const [formOpen, setFormOpen] = useState(false)
    const [editingStaff, setEditingStaff] = useState(null)
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState("")
    const [changingStatusId, setChangingStatusId] = useState(null)

    useEffect(() => {
        let active = true
        const load = async () => {
            setLoading(true)
            setError("")
            try {
                const [user, staffData] = await Promise.all([getMyProfile(), getStaff()])
                if (!active) return
                if (user.role !== "STORE_MANAGER") { setForbidden(true); return }
                saveAuthUser(user)
                setProfile(user)
                setStaff(Array.isArray(staffData) ? staffData : [])
            } catch (requestError) {
                if (!active) return
                if (requestError.response?.status === 401) { navigate("/login", { replace: true, state: { from: location.pathname } }); return }
                if (requestError.response?.status === 403) { setForbidden(true); return }
                setError(requestError.response?.data?.message || "Không thể tải danh sách nhân viên.")
            } finally { if (active) setLoading(false) }
        }
        load()
        return () => { active = false }
    }, [location.pathname, navigate, reload])

    const filteredStaff = useMemo(() => {
        const value = keyword.trim().toLowerCase()
        return staff.filter((item) => {
            const searchable = [item.fullName, item.email, item.phone].filter(Boolean).join(" ").toLowerCase()
            return (!value || searchable.includes(value)) && (!status || String(item.isActive) === status)
        })
    }, [keyword, staff, status])

    const openCreate = () => { setEditingStaff(null); setFormError(""); setFormOpen(true) }
    const openEdit = (item) => { setEditingStaff(item); setFormError(""); setFormOpen(true) }
    const saveStaff = async (payload) => {
        setSaving(true)
        setFormError("")
        try {
            const saved = editingStaff
                ? await updateStaff(editingStaff.userId, payload)
                : await createStaff(payload)
            setStaff((current) => editingStaff
                ? current.map((item) => item.userId === saved.userId ? saved : item)
                : [saved, ...current])
            setFormOpen(false)
            setEditingStaff(null)
        } catch (requestError) {
            setFormError(requestError.response?.data?.message || "Không thể lưu thông tin nhân viên.")
        } finally { setSaving(false) }
    }

    const changeStatus = async (item) => {
        const action = item.isActive ? "khóa" : "mở lại"
        if (!window.confirm(`${action === "khóa" ? "Khóa" : "Mở lại"} tài khoản của ${item.fullName}?`)) return
        setChangingStatusId(item.userId)
        setError("")
        try {
            const updated = await updateStaffStatus(item.userId, !item.isActive)
            setStaff((current) => current.map((staffItem) => staffItem.userId === updated.userId ? updated : staffItem))
        } catch (requestError) {
            setError(requestError.response?.data?.message || `Không thể ${action} tài khoản nhân viên.`)
        } finally { setChangingStatusId(null) }
    }

    const logout = () => { clearAuthToken(); navigate("/login", { replace: true }) }
    if (forbidden) return <Navigate to="/" replace />

    return <div className="mx-auto flex min-h-screen max-w-[1920px] bg-[#faf6ef] text-[#453c38]">
        <ManagerSidebar role={profile?.role} />
        <main className="min-w-0 flex-1">
            <ManagerHeader profile={profile} loading={loading} title="Nhân viên" subtitle="Quản lý tài khoản nhân viên cho thuê" onReload={() => setReload((value) => value + 1)} onLogout={logout} />
            <div className="mx-auto max-w-[1440px] space-y-6 px-5 py-7 sm:px-8 lg:px-12 lg:py-9 xl:px-16">
                {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
                <section className="grid gap-4 sm:grid-cols-3">
                    {[["Tổng nhân viên", staff.length], ["Đang hoạt động", staff.filter((item) => item.isActive).length], ["Đã khóa", staff.filter((item) => !item.isActive).length]].map(([label, value]) => <div key={label} className="rounded-xl border border-[#eadfd6] bg-[#fffdf9] px-5 py-4"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#897d77]">{label}</p><p className="mt-1 font-serif text-3xl font-semibold">{loading ? "-" : value}</p></div>)}
                </section>

                <section className="flex flex-col gap-4 rounded-xl border border-[#eadfd6] bg-[#fffdf9] p-5 lg:flex-row lg:items-end">
                    <label className="min-w-0 flex-1"><span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#766b66]">Tìm nhân viên</span><span className="relative block"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9c918b]" /><input type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tên, email hoặc số điện thoại" className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/60 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></span></label>
                    <label className="lg:w-56"><span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#766b66]">Trạng thái</span><CustomSelect value={status} onChange={(event) => setStatus(event.target.value)} options={[["true", "Đang hoạt động"], ["false", "Đã khóa"]]} placeholder="Tất cả trạng thái" buttonClassName="bg-[#faf6ef]/60" /></label>
                    <button type="button" onClick={openCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#f2a39b] px-5 text-sm font-semibold hover:bg-[#ee9188] active:scale-[.98]"><Plus size={18} />Thêm nhân viên</button>
                </section>

                <section className="overflow-hidden rounded-xl border border-[#eadfd6] bg-[#fffdf9]">
                    <div className="flex items-center justify-between border-b border-[#eadfd6] px-5 py-4 sm:px-6"><div><h2 className="font-serif text-xl font-semibold">Danh sách nhân viên</h2><p className="mt-1 text-xs text-[#897d77]">{filteredStaff.length} kết quả</p></div><UsersRound size={21} className="text-[#b65e56]" /></div>
                    <div className="overflow-x-auto"><table className="w-full min-w-[940px] text-left text-sm"><thead><tr className="border-b border-[#eadfd6] bg-[#faf6ef]/55 text-[#766b66]"><th className="px-6 py-3 font-medium">Nhân viên</th><th className="px-6 py-3 font-medium">Liên hệ</th><th className="px-6 py-3 font-medium">Vai trò</th><th className="px-6 py-3 font-medium">Ngày tạo</th><th className="px-6 py-3 font-medium">Trạng thái</th><th className="px-6 py-3 text-right font-medium">Thao tác</th></tr></thead>
                        <tbody>{filteredStaff.map((item) => { const changing = changingStatusId === item.userId; return <tr key={item.userId} className="border-b border-[#eadfd6]/70 last:border-0 hover:bg-[#faf6ef]/55"><td className="px-6 py-4"><div className="flex items-center gap-3"><span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fbe2de] font-serif text-lg font-semibold text-[#9b4d47]">{item.fullName?.trim()?.charAt(0)?.toUpperCase() || "N"}</span><div><p className="font-semibold">{item.fullName}</p><p className="mt-0.5 text-xs text-[#897d77]">ID: {item.userId.slice(0, 8)}</p></div></div></td><td className="px-6 py-4"><div className="space-y-1.5"><p className="flex items-center gap-2"><Mail size={14} className="text-[#897d77]" />{item.email}</p><p className="flex items-center gap-2 text-[#766b66]"><Phone size={14} className="text-[#897d77]" />{item.phone || "Chưa cập nhật"}</p></div></td><td className="px-6 py-4"><span className="rounded-lg bg-[#faf6ef] px-2.5 py-1.5 text-xs font-semibold">Nhân viên cho thuê</span></td><td className="px-6 py-4 text-[#766b66]">{formatCreatedAt(item.createdAt)}</td><td className="px-6 py-4"><span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-semibold ${item.isActive ? "border-[#b8d7cb] bg-[#d4e7dd] text-[#356353]" : "border-[#e6beb9] bg-[#fbe2de] text-[#9b4d47]"}`}>{item.isActive ? "Đang hoạt động" : "Đã khóa"}</span></td><td className="px-6 py-4"><div className="flex items-center justify-end gap-2"><button type="button" onClick={() => openEdit(item)} title="Sửa nhân viên" aria-label={`Sửa nhân viên ${item.fullName}`} className="inline-flex size-9 items-center justify-center rounded-lg border border-[#e1d6cf] text-[#665b55] transition hover:border-[#cdbfb6] hover:bg-[#faf6ef]"><Pencil size={16} /></button><button type="button" role="switch" aria-checked={item.isActive} aria-label={`${item.isActive ? "Khóa" : "Mở"} tài khoản ${item.fullName}`} title={item.isActive ? "Khóa tài khoản" : "Mở lại tài khoản"} disabled={changing} onClick={() => changeStatus(item)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b65e56]/35 focus-visible:ring-offset-2 active:scale-95 disabled:cursor-wait disabled:opacity-60 ${item.isActive ? "bg-[#5f9b86] hover:bg-[#4f8a76]" : "bg-[#c99a94] hover:bg-[#b98781]"}`}>{changing ? <LoaderCircle size={15} className="m-auto animate-spin text-white" /> : <span aria-hidden="true" className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${item.isActive ? "translate-x-5" : "translate-x-0"}`} />}</button></div></td></tr> })}
                            {!loading && !filteredStaff.length && <tr><td colSpan="6" className="px-6 py-14 text-center text-[#897d77]">Không tìm thấy nhân viên phù hợp.</td></tr>}
                            {loading && <tr><td colSpan="6" className="px-6 py-14 text-center text-[#897d77]">Đang tải danh sách nhân viên...</td></tr>}
                        </tbody></table></div>
                </section>
            </div>
        </main>
        {formOpen && <StaffFormModal staff={editingStaff} saving={saving} error={formError} onClose={() => { if (!saving) { setFormOpen(false); setEditingStaff(null) } }} onSubmit={saveStaff} />}
    </div>
}

export default ManagerStaffPage
