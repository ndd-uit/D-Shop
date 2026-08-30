import { useEffect, useMemo, useState } from "react"
import { CalendarOff, Clock3, LoaderCircle, Plus, Search, Square } from "lucide-react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import CustomSelect from "../components/common/CustomSelect.jsx"
import ManagerHeader from "../components/manager/ManagerHeader.jsx"
import ManagerSidebar from "../components/manager/ManagerSidebar.jsx"
import {
    cancelAvailabilityBlock,
    createAvailabilityBlock,
    endAvailabilityBlock,
    getAvailabilityBlocks,
} from "../services/availabilityBlockApi.js"
import { clearAuthToken, getAuthUser, saveAuthUser } from "../services/authStorage.js"
import { getManagedRentalUnits } from "../services/rentalUnitApi.js"
import { getMyProfile } from "../services/userApi.js"

const TYPE_LABELS = {
    CLEANING: "Vệ sinh",
    MAINTENANCE: "Bảo trì",
    REPAIR: "Sửa chữa",
    MANUAL_BLOCK: "Khóa thủ công",
}

const toLocalInput = (value) => {
    const date = new Date(value)
    const offset = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const formatDateTime = (value) => new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
}).format(new Date(value))

function AvailabilityBlocksPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const [profile, setProfile] = useState(() => getAuthUser())
    const [blocks, setBlocks] = useState([])
    const [units, setUnits] = useState([])
    const [loading, setLoading] = useState(true)
    const [forbidden, setForbidden] = useState(false)
    const [error, setError] = useState("")
    const [reload, setReload] = useState(0)
    const [keyword, setKeyword] = useState("")
    const [saving, setSaving] = useState(false)
    const [referenceNow] = useState(() => Date.now())
    const [formOpen, setFormOpen] = useState(false)
    const [form, setForm] = useState(() => ({
        rentalUnitId: "",
        type: "CLEANING",
        startAt: toLocalInput(new Date()),
        endAt: toLocalInput(new Date(Date.now() + 60 * 60 * 1000)),
        reason: "",
    }))

    useEffect(() => {
        let active = true
        const load = async () => {
            setLoading(true)
            setError("")
            try {
                const user = await getMyProfile()
                if (!active) return
                if (!["RENTAL_STAFF", "STORE_MANAGER"].includes(user.role)) {
                    setForbidden(true)
                    return
                }
                const [blockData, unitData] = await Promise.all([
                    getAvailabilityBlocks(),
                    getManagedRentalUnits(),
                ])
                if (!active) return
                saveAuthUser(user)
                setProfile(user)
                setBlocks(Array.isArray(blockData) ? blockData : [])
                setUnits(Array.isArray(unitData) ? unitData : [])
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
                setError(requestError.response?.data?.message || "Không thể tải lịch khóa RentalUnit.")
            } finally {
                if (active) setLoading(false)
            }
        }
        load()
        return () => { active = false }
    }, [location.pathname, navigate, reload])

    const unitOptions = useMemo(() => units.map((unit) => [
        unit.rentalUnitId,
        `${unit.assetCode} · ${unit.garment?.name || "Trang phục"} · ${unit.size || "-"}`,
    ]), [units])
    const filteredBlocks = useMemo(() => {
        const query = keyword.trim().toLowerCase()
        if (!query) return blocks
        return blocks.filter((block) => [
            block.rentalUnit?.assetCode,
            block.rentalUnit?.garment?.name,
            block.reason,
            TYPE_LABELS[block.type],
        ].filter(Boolean).join(" ").toLowerCase().includes(query))
    }, [blocks, keyword])

    const submit = async (event) => {
        event.preventDefault()
        setSaving(true)
        setError("")
        try {
            await createAvailabilityBlock({
                rentalUnitId: form.rentalUnitId,
                type: form.type,
                startAt: new Date(form.startAt).toISOString(),
                endAt: new Date(form.endAt).toISOString(),
                reason: form.reason.trim(),
            })
            toast.success("Đã tạo khoảng khóa RentalUnit")
            setFormOpen(false)
            setForm((current) => ({ ...current, rentalUnitId: "", reason: "" }))
            setReload((value) => value + 1)
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Không thể tạo khoảng khóa RentalUnit.")
        } finally {
            setSaving(false)
        }
    }

    const endBlock = async (block) => {
        try {
            await endAvailabilityBlock(block.blockId)
            toast.success("Đã kết thúc khoảng khóa")
            setReload((value) => value + 1)
        } catch (requestError) {
            toast.error(requestError.response?.data?.message || "Không thể kết thúc khoảng khóa.")
        }
    }
    const cancelBlock = async (block) => {
        if (!window.confirm("Hủy khoảng khóa chưa bắt đầu này?")) return
        try {
            await cancelAvailabilityBlock(block.blockId)
            toast.success("Đã hủy khoảng khóa")
            setReload((value) => value + 1)
        } catch (requestError) {
            toast.error(requestError.response?.data?.message || "Không thể hủy khoảng khóa.")
        }
    }

    if (forbidden) return <Navigate to="/" replace />
    const logout = () => { clearAuthToken(); navigate("/login", { replace: true }) }
    const now = referenceNow

    return <div className="mx-auto flex min-h-screen max-w-[1920px] bg-[#faf6ef] text-[#453c38]">
        <ManagerSidebar role={profile?.role} />
        <main className="min-w-0 flex-1">
            <ManagerHeader profile={profile} loading={loading} title="Lịch khóa kho" subtitle="Khóa RentalUnit khi vệ sinh, bảo trì, sửa chữa hoặc tạm ngừng cho thuê" onReload={() => setReload((value) => value + 1)} onLogout={logout} />
            <div className="mx-auto max-w-[1440px] space-y-6 px-5 py-7 sm:px-8 lg:px-12 lg:py-9 xl:px-16">
                {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
                <section className="flex flex-col gap-4 rounded-xl border border-[#eadfd6] bg-[#fffdf9] p-5 lg:flex-row lg:items-end">
                    <label className="min-w-0 flex-1"><span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#766b66]">Tìm khoảng khóa</span><span className="relative block"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9c918b]" /><input type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Mã tài sản, trang phục hoặc lý do" className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/60 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></span></label>
                    <button type="button" onClick={() => { setError(""); setFormOpen((open) => !open) }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#f2a39b] px-5 text-sm font-semibold hover:bg-[#ee9188]"><Plus size={17} />Tạo khoảng khóa</button>
                </section>
                {formOpen && <form onSubmit={submit} className="rounded-xl border border-[#e6c9c4] bg-[#fffdf9] p-5 sm:p-6">
                    <div className="flex items-center gap-3"><CalendarOff size={21} className="text-[#b65e56]" /><div><h2 className="font-serif text-xl font-semibold">Khóa lịch RentalUnit</h2><p className="mt-1 text-xs text-[#897d77]">Khoảng khóa không thay thế buffer Reservation và sẽ bị từ chối nếu trùng đơn thuê hiện hành.</p></div></div>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <label className="sm:col-span-2"><span className="mb-2 block text-xs font-semibold">RentalUnit *</span><CustomSelect value={form.rentalUnitId} onChange={(event) => setForm((current) => ({ ...current, rentalUnitId: event.target.value }))} options={unitOptions} placeholder="Chọn mã tài sản" /></label>
                        <label><span className="mb-2 block text-xs font-semibold">Loại khóa *</span><CustomSelect value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} options={Object.entries(TYPE_LABELS)} /></label>
                        <label><span className="mb-2 block text-xs font-semibold">Lý do *</span><input required value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/60 px-4 text-sm outline-none focus:border-[#f2a39b]" /></label>
                        <label><span className="mb-2 block text-xs font-semibold">Bắt đầu *</span><input type="datetime-local" required value={form.startAt} onChange={(event) => setForm((current) => ({ ...current, startAt: event.target.value }))} className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/60 px-4 text-sm outline-none focus:border-[#f2a39b]" /></label>
                        <label><span className="mb-2 block text-xs font-semibold">Kết thúc *</span><input type="datetime-local" required min={form.startAt} value={form.endAt} onChange={(event) => setForm((current) => ({ ...current, endAt: event.target.value }))} className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/60 px-4 text-sm outline-none focus:border-[#f2a39b]" /></label>
                    </div>
                    <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setFormOpen(false)} className="min-h-10 rounded-xl border border-[#e1d6cf] px-4 text-sm font-semibold">Đóng</button><button type="submit" disabled={saving || !form.rentalUnitId || !form.reason.trim() || form.startAt >= form.endAt} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#f2a39b] px-5 text-sm font-semibold disabled:opacity-50">{saving && <LoaderCircle size={16} className="animate-spin" />}Lưu khoảng khóa</button></div>
                </form>}
                <section className="overflow-hidden rounded-xl border border-[#eadfd6] bg-[#fffdf9]">
                    <div className="flex items-center justify-between border-b border-[#eadfd6] px-5 py-4 sm:px-6"><div><h2 className="font-serif text-xl font-semibold">Các khoảng khóa</h2><p className="mt-1 text-xs text-[#897d77]">{loading ? "Đang tải..." : `${filteredBlocks.length} kết quả`}</p></div><CalendarOff size={21} className="text-[#b65e56]" /></div>
                    <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead><tr className="border-b border-[#eadfd6] bg-[#faf6ef]/55 text-[#766b66]"><th className="px-6 py-3 font-medium">RentalUnit</th><th className="px-6 py-3 font-medium">Loại</th><th className="px-6 py-3 font-medium">Thời gian</th><th className="px-6 py-3 font-medium">Lý do</th><th className="px-6 py-3 font-medium">Trạng thái</th><th className="px-6 py-3 text-right font-medium">Thao tác</th></tr></thead><tbody>
                        {filteredBlocks.map((block) => { const start = new Date(block.startAt).getTime(); const end = new Date(block.endAt).getTime(); const future = start > now; const active = start <= now && end > now; return <tr key={block.blockId} className="border-b border-[#eadfd6]/70 last:border-0"><td className="px-6 py-4"><p className="font-mono font-semibold">{block.rentalUnit?.assetCode || "-"}</p><p className="mt-1 text-xs text-[#897d77]">{block.rentalUnit?.garment?.name || "-"} · {block.rentalUnit?.size || "-"}</p></td><td className="px-6 py-4 font-medium">{TYPE_LABELS[block.type] || block.type}</td><td className="px-6 py-4 text-xs leading-5 text-[#665b55]"><p>{formatDateTime(block.startAt)}</p><p>đến {formatDateTime(block.endAt)}</p></td><td className="max-w-xs px-6 py-4 text-[#665b55]">{block.reason}</td><td className="px-6 py-4"><span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-semibold ${active ? "border-[#e8c98e] bg-[#fff0cf] text-[#876022]" : future ? "border-[#b9cce3] bg-[#e5eef7] text-[#496985]" : "border-[#d4ccc7] bg-[#eae6e2] text-[#6e6560]"}`}>{active ? "Đang khóa" : future ? "Sắp diễn ra" : "Đã kết thúc"}</span></td><td className="px-6 py-4 text-right">{active ? <button type="button" onClick={() => endBlock(block)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#e8c98e] px-3 text-xs font-semibold text-[#876022]"><Square size={14} />Kết thúc</button> : future ? <button type="button" onClick={() => cancelBlock(block)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#e6beb9] px-3 text-xs font-semibold text-[#9b4d47]">Hủy lịch</button> : <span className="text-xs text-[#aaa09a]">Không còn thao tác</span>}</td></tr> })}
                        {!loading && !filteredBlocks.length && <tr><td colSpan="6" className="px-6 py-14 text-center text-[#897d77]"><Clock3 className="mx-auto mb-3" size={25} />Chưa có khoảng khóa phù hợp.</td></tr>}
                        {loading && <tr><td colSpan="6" className="px-6 py-14 text-center text-[#897d77]"><LoaderCircle className="mx-auto mb-2 animate-spin" size={22} />Đang tải...</td></tr>}
                    </tbody></table></div>
                </section>
            </div>
        </main>
    </div>
}

export default AvailabilityBlocksPage
