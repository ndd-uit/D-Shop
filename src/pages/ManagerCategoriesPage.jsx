import { useEffect, useMemo, useState } from "react"
import { LoaderCircle, Pencil, Plus, Search, Tags, X } from "lucide-react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"

import ManagerHeader from "../components/manager/ManagerHeader.jsx"
import ManagerSidebar from "../components/manager/ManagerSidebar.jsx"
import { clearAuthToken, getAuthUser, saveAuthUser } from "../services/authStorage.js"
import {
    createCategory,
    getManagedCategories,
    updateCategory,
    updateCategoryStatus,
} from "../services/garmentApi.js"
import { getMyProfile } from "../services/userApi.js"

function CategoryFormModal({ category, saving, error, onClose, onSubmit }) {
    const [form, setForm] = useState(() => ({
        name: category?.name || "",
        description: category?.description || "",
    }))

    const submit = (event) => {
        event.preventDefault()
        onSubmit({
            name: form.name.trim(),
            description: form.description.trim() || null,
        })
    }

    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#453c38]/35 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}>
        <section role="dialog" aria-modal="true" aria-labelledby="category-form-title" className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#eadfd6] bg-[#fffdf9] shadow-[0_24px_80px_rgba(69,60,56,.2)]">
            <header className="flex items-center justify-between border-b border-[#eadfd6] px-5 py-4 sm:px-6">
                <div><h2 id="category-form-title" className="font-serif text-2xl font-semibold">{category ? "Cập nhật danh mục" : "Thêm danh mục"}</h2><p className="mt-1 text-xs text-[#897d77]">Phân loại trang phục trong cửa hàng.</p></div>
                <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-2 hover:bg-[#faf6ef]" aria-label="Đóng"><X size={20} /></button>
            </header>
            <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
                {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                <label className="block"><span className="mb-2 block text-xs font-semibold">Tên danh mục *</span><input required maxLength={150} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/55 px-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></label>
                <label className="block"><span className="mb-2 block text-xs font-semibold">Mô tả</span><textarea rows="4" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="w-full resize-y rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/55 p-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></label>
                <div className="flex justify-end gap-3 border-t border-[#eadfd6] pt-5"><button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-xl border border-[#e1d6cf] px-5 text-sm font-semibold hover:bg-[#faf6ef]">Hủy</button><button type="submit" disabled={saving} className="inline-flex min-h-11 min-w-32 items-center justify-center gap-2 rounded-xl bg-[#f2a39b] px-5 text-sm font-semibold hover:bg-[#ee9188] disabled:cursor-wait disabled:opacity-60">{saving && <LoaderCircle size={17} className="animate-spin" />}{category ? "Lưu thay đổi" : "Thêm danh mục"}</button></div>
            </form>
        </section>
    </div>
}

function ManagerCategoriesPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const [profile, setProfile] = useState(() => getAuthUser())
    const [categories, setCategories] = useState([])
    const [keyword, setKeyword] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [forbidden, setForbidden] = useState(false)
    const [reload, setReload] = useState(0)
    const [formOpen, setFormOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState(null)
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState("")
    const [changingStatusId, setChangingStatusId] = useState(null)

    useEffect(() => {
        let active = true
        const load = async () => {
            setLoading(true)
            setError("")
            try {
                const [user, categoryData] = await Promise.all([getMyProfile(), getManagedCategories()])
                if (!active) return
                if (user.role !== "STORE_MANAGER") { setForbidden(true); return }
                saveAuthUser(user)
                setProfile(user)
                setCategories(Array.isArray(categoryData) ? categoryData : [])
            } catch (requestError) {
                if (!active) return
                if (requestError.response?.status === 401) { navigate("/login", { replace: true, state: { from: location.pathname } }); return }
                if (requestError.response?.status === 403) { setForbidden(true); return }
                setError(requestError.response?.data?.message || "Không thể tải danh sách danh mục.")
            } finally { if (active) setLoading(false) }
        }
        load()
        return () => { active = false }
    }, [location.pathname, navigate, reload])

    const filteredCategories = useMemo(() => {
        const value = keyword.trim().toLowerCase()
        if (!value) return categories
        return categories.filter((category) => [category.name, category.description].filter(Boolean).join(" ").toLowerCase().includes(value))
    }, [categories, keyword])

    const saveCategory = async (payload) => {
        setSaving(true)
        setFormError("")
        try {
            if (editingCategory) await updateCategory(editingCategory.categoryId, payload)
            else await createCategory(payload)
            setFormOpen(false)
            setReload((value) => value + 1)
        } catch (requestError) {
            setFormError(requestError.response?.data?.message || "Không thể lưu danh mục.")
        } finally { setSaving(false) }
    }

    const changeStatus = async (category) => {
        if (category.isActive && !window.confirm(`Ngừng sử dụng danh mục "${category.name}"?`)) return
        setChangingStatusId(category.categoryId)
        setError("")
        try {
            const updated = await updateCategoryStatus(category.categoryId, !category.isActive)
            setCategories((current) => current.map((item) => item.categoryId === category.categoryId ? { ...item, isActive: updated.isActive } : item))
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Không thể cập nhật trạng thái danh mục.")
        } finally { setChangingStatusId(null) }
    }

    const logout = () => { clearAuthToken(); navigate("/login", { replace: true }) }
    if (forbidden) return <Navigate to="/" replace />

    return <div className="mx-auto flex min-h-screen max-w-[1920px] bg-[#faf6ef] text-[#453c38]">
        <ManagerSidebar role={profile?.role} />
        <main className="min-w-0 flex-1">
            <ManagerHeader profile={profile} loading={loading} title="Danh mục" subtitle="Phân loại và quản lý nhóm trang phục" onReload={() => setReload((value) => value + 1)} onLogout={logout} />
            <div className="mx-auto max-w-[1440px] space-y-6 px-5 py-7 sm:px-8 lg:px-12 lg:py-9 xl:px-16">
                {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
                <section className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#eadfd6] bg-[#fffdf9] px-5 py-4"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#897d77]">Tổng danh mục</p><p className="mt-1 font-serif text-3xl font-semibold">{loading ? "-" : categories.length}</p></div>
                    <div className="rounded-xl border border-[#eadfd6] bg-[#fffdf9] px-5 py-4"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#897d77]">Đang sử dụng</p><p className="mt-1 font-serif text-3xl font-semibold">{loading ? "-" : categories.filter((item) => item.isActive).length}</p></div>
                </section>
                <section className="flex flex-col gap-4 rounded-xl border border-[#eadfd6] bg-[#fffdf9] p-5 sm:flex-row sm:items-end sm:justify-between">
                    <label className="w-full sm:w-80 lg:w-96"><span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#766b66]">Tìm danh mục</span><span className="relative block"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9c918b]" /><input type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tên hoặc mô tả danh mục" className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/60 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></span></label>
                    <button type="button" onClick={() => { setEditingCategory(null); setFormError(""); setFormOpen(true) }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#f2a39b] px-5 text-sm font-semibold hover:bg-[#ee9188] active:scale-[.98]"><Plus size={18} />Thêm danh mục</button>
                </section>
                <section className="overflow-hidden rounded-xl border border-[#eadfd6] bg-[#fffdf9]">
                    <div className="flex items-center justify-between border-b border-[#eadfd6] px-5 py-4 sm:px-6"><div><h2 className="font-serif text-xl font-semibold">Danh sách danh mục</h2><p className="mt-1 text-xs text-[#897d77]">{filteredCategories.length} kết quả</p></div><Tags size={20} className="text-[#b65e56]" /></div>
                    <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-[#eadfd6] bg-[#faf6ef]/55 text-[#766b66]"><th className="px-6 py-3 font-medium">Tên danh mục</th><th className="px-6 py-3 font-medium">Mô tả</th><th className="px-6 py-3 font-medium">Trạng thái</th><th className="px-6 py-3 text-right font-medium">Thao tác</th></tr></thead><tbody>{filteredCategories.map((category) => { const changing = changingStatusId === category.categoryId; return <tr key={category.categoryId} className="border-b border-[#eadfd6]/70 last:border-0 hover:bg-[#faf6ef]/55"><td className="px-6 py-4 font-semibold">{category.name}</td><td className="max-w-md px-6 py-4 text-[#766b66]">{category.description || "Chưa có mô tả"}</td><td className="px-6 py-4"><span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-semibold ${category.isActive ? "border-[#b8d7cb] bg-[#d4e7dd] text-[#356353]" : "border-[#e6beb9] bg-[#fbe2de] text-[#9b4d47]"}`}>{category.isActive ? "Đang sử dụng" : "Ngừng sử dụng"}</span></td><td className="px-6 py-4"><div className="flex items-center justify-end gap-2"><button type="button" onClick={() => { setEditingCategory(category); setFormError(""); setFormOpen(true) }} title="Sửa danh mục" aria-label={`Sửa danh mục ${category.name}`} className="inline-flex size-9 items-center justify-center rounded-lg border border-[#e1d6cf] text-[#665b55] transition hover:border-[#cdbfb6] hover:bg-[#faf6ef]"><Pencil size={16} /></button><button type="button" role="switch" aria-checked={category.isActive} aria-label={`${category.isActive ? "Ngừng" : "Bật"} sử dụng ${category.name}`} title={category.isActive ? "Ngừng sử dụng" : "Bật sử dụng"} disabled={changing} onClick={() => changeStatus(category)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b65e56]/35 focus-visible:ring-offset-2 active:scale-95 disabled:cursor-wait disabled:opacity-60 ${category.isActive ? "bg-[#5f9b86] hover:bg-[#4f8a76]" : "bg-[#c99a94] hover:bg-[#b98781]"}`}>{changing ? <LoaderCircle size={15} className="m-auto animate-spin text-white" /> : <span aria-hidden="true" className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${category.isActive ? "translate-x-5" : "translate-x-0"}`} />}</button></div></td></tr> })}{!loading && !filteredCategories.length && <tr><td colSpan="4" className="px-6 py-14 text-center text-[#897d77]">Không tìm thấy danh mục phù hợp.</td></tr>}{loading && <tr><td colSpan="4" className="px-6 py-14 text-center text-[#897d77]">Đang tải danh mục...</td></tr>}</tbody></table></div>
                </section>
            </div>
        </main>
        {formOpen && <CategoryFormModal category={editingCategory} saving={saving} error={formError} onClose={() => { if (!saving) setFormOpen(false) }} onSubmit={saveCategory} />}
    </div>
}

export default ManagerCategoriesPage
