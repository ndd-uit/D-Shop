import { useEffect, useMemo, useState } from "react"
import { ImageOff, LoaderCircle, Pencil, Plus, Search, Shirt } from "lucide-react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"

import CustomSelect from "../components/common/CustomSelect.jsx"
import GarmentFormModal from "../components/manager/GarmentFormModal.jsx"
import ManagerHeader from "../components/manager/ManagerHeader.jsx"
import ManagerSidebar from "../components/manager/ManagerSidebar.jsx"
import { formatCurrency, getFirstImage } from "../components/rental/rentalOrderUtils.js"
import { clearAuthToken, getAuthUser, saveAuthUser } from "../services/authStorage.js"
import { createGarment, getManagedCategories, getManagedGarments, updateGarment, updateGarmentStatus } from "../services/garmentApi.js"
import { getMyProfile } from "../services/userApi.js"

function ManagerGarmentsPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const [profile, setProfile] = useState(() => getAuthUser())
    const [garments, setGarments] = useState([])
    const [categories, setCategories] = useState([])
    const [keyword, setKeyword] = useState("")
    const [categoryId, setCategoryId] = useState("")
    const [status, setStatus] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [forbidden, setForbidden] = useState(false)
    const [reload, setReload] = useState(0)
    const [editingGarment, setEditingGarment] = useState(undefined)
    const [formOpen, setFormOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState("")
    const [changingStatusId, setChangingStatusId] = useState(null)

    useEffect(() => {
        let active = true
        const load = async () => {
            setLoading(true)
            setError("")
            try {
                const [user, garmentData, categoryData] = await Promise.all([
                    getMyProfile(),
                    getManagedGarments(),
                    getManagedCategories(),
                ])
                if (!active) return
                if (user.role !== "STORE_MANAGER") { setForbidden(true); return }
                saveAuthUser(user)
                setProfile(user)
                setGarments(Array.isArray(garmentData) ? garmentData : [])
                setCategories(Array.isArray(categoryData) ? categoryData : [])
            } catch (requestError) {
                if (!active) return
                if (requestError.response?.status === 401) { navigate("/login", { replace: true, state: { from: location.pathname } }); return }
                if (requestError.response?.status === 403) { setForbidden(true); return }
                setError(requestError.response?.data?.message || "Không thể tải danh sách trang phục.")
            } finally { if (active) setLoading(false) }
        }
        load()
        return () => { active = false }
    }, [location.pathname, navigate, reload])

    const filteredGarments = useMemo(() => {
        const normalizedKeyword = keyword.trim().toLowerCase()
        return garments.filter((garment) => {
            const searchable = [garment.name, garment.color, garment.category?.name].filter(Boolean).join(" ").toLowerCase()
            return (!normalizedKeyword || searchable.includes(normalizedKeyword)) &&
                (!categoryId || garment.categoryId === categoryId) &&
                (!status || String(garment.isActive) === status)
        })
    }, [categoryId, garments, keyword, status])

    const activeCategories = categories.filter((category) => category.isActive || category.categoryId === editingGarment?.categoryId)
    const openCreate = () => { setEditingGarment(null); setFormError(""); setFormOpen(true) }
    const openEdit = (garment) => { setEditingGarment(garment); setFormError(""); setFormOpen(true) }
    const saveGarment = async (payload, images) => {
        setSaving(true); setFormError("")
        try {
            if (editingGarment) await updateGarment(editingGarment.garmentId, payload, images)
            else await createGarment(payload, images)
            setFormOpen(false)
            setReload((value) => value + 1)
        } catch (requestError) {
            setFormError(requestError.response?.data?.message || "Không thể lưu trang phục.")
        } finally { setSaving(false) }
    }
    const changeStatus = async (garment) => {
        if (
            garment.isActive &&
            !window.confirm(`Ngừng kinh doanh "${garment.name}"? Trang phục sẽ không còn xuất hiện trong danh sách thuê của khách hàng.`)
        ) return

        setChangingStatusId(garment.garmentId)
        setError("")
        try {
            const updated = await updateGarmentStatus(garment.garmentId, !garment.isActive)
            setGarments((current) => current.map((item) => item.garmentId === garment.garmentId ? { ...item, isActive: updated.isActive } : item))
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Không thể cập nhật trạng thái trang phục.")
        } finally { setChangingStatusId(null) }
    }
    const logout = () => { clearAuthToken(); navigate("/login", { replace: true }) }

    if (forbidden) return <Navigate to="/" replace />

    return <div className="mx-auto flex min-h-screen max-w-[1920px] bg-[#faf6ef] text-[#453c38]">
        <ManagerSidebar role={profile?.role} />
        <main className="min-w-0 flex-1">
            <ManagerHeader profile={profile} loading={loading} title="Trang phục" subtitle="Quản lý thông tin và trạng thái trang phục cho thuê" onReload={() => setReload((value) => value + 1)} onLogout={logout} />
            <div className="mx-auto max-w-[1440px] space-y-6 px-5 py-7 sm:px-8 lg:px-12 lg:py-9 xl:px-16">
                {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
                <section className="grid gap-4 sm:grid-cols-3">{[
                    ["Tổng trang phục", garments.length], ["Đang kinh doanh", garments.filter((item) => item.isActive).length], ["RentalUnit", garments.reduce((sum, item) => sum + Number(item._count?.rentalUnits || 0), 0)],
                ].map(([label, value]) => <div key={label} className="rounded-xl border border-[#eadfd6] bg-[#fffdf9] px-5 py-4"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#897d77]">{label}</p><p className="mt-1 font-serif text-3xl font-semibold">{loading ? "–" : value}</p></div>)}</section>

                <section className="flex flex-col gap-4 rounded-xl border border-[#eadfd6] bg-[#fffdf9] p-5 xl:flex-row xl:items-end">
                    <label className="min-w-0 flex-1"><span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#766b66]">Tìm trang phục</span><span className="relative block"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9c918b]" /><input type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tên, màu sắc hoặc danh mục" className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/60 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></span></label>
                    <label className="xl:w-56"><span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#766b66]">Danh mục</span><CustomSelect value={categoryId} onChange={(event) => setCategoryId(event.target.value)} options={categories.map((category) => [category.categoryId, category.name])} placeholder="Tất cả danh mục" buttonClassName="bg-[#faf6ef]/60" /></label>
                    <label className="xl:w-48"><span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#766b66]">Trạng thái</span><CustomSelect value={status} onChange={(event) => setStatus(event.target.value)} options={[["true", "Đang kinh doanh"], ["false", "Ngừng kinh doanh"]]} placeholder="Tất cả trạng thái" buttonClassName="bg-[#faf6ef]/60" /></label>
                    <button type="button" onClick={openCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#f2a39b] px-5 text-sm font-semibold hover:bg-[#ee9188] active:scale-[.98]"><Plus size={18} />Thêm trang phục</button>
                </section>

                <section className="rounded-xl border border-[#eadfd6] bg-[#fffdf9]">
                    <div className="flex items-center justify-between border-b border-[#eadfd6] px-5 py-4 sm:px-6"><div><h2 className="font-serif text-xl font-semibold">Danh sách trang phục</h2><p className="mt-1 text-xs text-[#897d77]">{filteredGarments.length} kết quả</p></div><Shirt size={20} className="text-[#b65e56]" /></div>
                    <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left text-sm"><thead><tr className="border-b border-[#eadfd6] bg-[#faf6ef]/55 text-[#766b66]"><th className="px-6 py-3 font-medium">Trang phục</th><th className="px-6 py-3 font-medium">Danh mục</th><th className="px-6 py-3 font-medium">Giá thuê/ngày</th><th className="px-6 py-3 font-medium">Tiền cọc</th><th className="px-6 py-3 font-medium">RentalUnit</th><th className="px-6 py-3 font-medium">Trạng thái</th><th className="px-6 py-3 text-right font-medium">Thao tác</th></tr></thead><tbody>{filteredGarments.map((garment) => { const imageUrl = getFirstImage(garment.imageUrls); const changing = changingStatusId === garment.garmentId; return <tr key={garment.garmentId} className="border-b border-[#eadfd6]/70 last:border-0 hover:bg-[#faf6ef]/55"><td className="px-6 py-3"><div className="flex items-center gap-3"><div className="flex h-14 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#eee6df]">{imageUrl ? <img src={imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ImageOff size={17} className="text-[#aa9f99]" />}</div><div><p className="font-semibold">{garment.name}</p><p className="mt-1 text-xs text-[#897d77]">{garment.color || "Chưa cập nhật màu"}</p></div></div></td><td className="px-6 py-3">{garment.category?.name || "Chưa phân loại"}</td><td className="px-6 py-3 font-semibold">{formatCurrency(garment.rentalPrice)}</td><td className="px-6 py-3">{formatCurrency(garment.depositAmount)}</td><td className="px-6 py-3">{garment._count?.rentalUnits || 0}</td><td className="px-6 py-3"><span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-semibold ${garment.isActive ? "border-[#b8d7cb] bg-[#d4e7dd] text-[#356353]" : "border-[#e6beb9] bg-[#fbe2de] text-[#9b4d47]"}`}>{garment.isActive ? "Đang kinh doanh" : "Ngừng kinh doanh"}</span></td><td className="px-6 py-3"><div className="flex items-center justify-end gap-2"><button type="button" onClick={() => openEdit(garment)} title="Sửa trang phục" aria-label={`Sửa trang phục ${garment.name}`} className="inline-flex size-9 items-center justify-center rounded-lg border border-[#e1d6cf] text-[#665b55] transition hover:border-[#cdbfb6] hover:bg-[#faf6ef]"><Pencil size={16} /></button><button type="button" role="switch" aria-checked={garment.isActive} aria-label={`${garment.isActive ? "Ngừng" : "Bật"} kinh doanh ${garment.name}`} title={garment.isActive ? "Ngừng kinh doanh" : "Bật kinh doanh"} disabled={changing} onClick={() => changeStatus(garment)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b65e56]/35 focus-visible:ring-offset-2 active:scale-95 disabled:cursor-wait disabled:opacity-60 ${garment.isActive ? "bg-[#5f9b86] hover:bg-[#4f8a76]" : "bg-[#c99a94] hover:bg-[#b98781]"}`}>{changing ? <LoaderCircle size={15} className="m-auto animate-spin text-white" /> : <span aria-hidden="true" className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${garment.isActive ? "translate-x-5" : "translate-x-0"}`} />}</button></div></td></tr> })}{!loading && !filteredGarments.length && <tr><td colSpan="7" className="px-6 py-14 text-center text-[#897d77]">Không tìm thấy trang phục phù hợp.</td></tr>}{loading && <tr><td colSpan="7" className="px-6 py-14 text-center text-[#897d77]">Đang tải danh sách trang phục...</td></tr>}</tbody></table></div>
                </section>
            </div>
        </main>
        {formOpen && <GarmentFormModal garment={editingGarment} categories={activeCategories} saving={saving} error={formError} onClose={() => { if (!saving) setFormOpen(false) }} onSubmit={saveGarment} />}
    </div>
}

export default ManagerGarmentsPage
