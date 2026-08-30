import { useEffect, useMemo, useState } from "react"
import { Archive, Boxes, CalendarOff, Eye, LoaderCircle, Pencil, Plus, Search } from "lucide-react"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"

import CustomSelect from "../components/common/CustomSelect.jsx"
import ManagerHeader from "../components/manager/ManagerHeader.jsx"
import ManagerPageSkeleton from "../components/manager/ManagerPageSkeleton.jsx"
import ManagerSidebar from "../components/manager/ManagerSidebar.jsx"
import RentalUnitDetailDrawer from "../components/manager/RentalUnitDetailDrawer.jsx"
import RentalUnitFormModal from "../components/manager/RentalUnitFormModal.jsx"
import RetireRentalUnitModal from "../components/manager/RetireRentalUnitModal.jsx"
import { clearAuthToken, getAuthUser, saveAuthUser } from "../services/authStorage.js"
import { getManagedGarments } from "../services/garmentApi.js"
import { changeRentalUnitStatus } from "../services/rentalApi.js"
import { createRentalUnit, getManagedRentalUnits, retireRentalUnit, updateRentalUnit } from "../services/rentalUnitApi.js"
import { getMyProfile } from "../services/userApi.js"

const STATUS_LABEL = {
    AVAILABLE: "Khả dụng",
    PREPARING: "Đang chuẩn bị",
    RENTED: "Đang cho thuê",
    RETURN_INSPECTION: "Chờ kiểm tra trả",
    CLEANING: "Đang vệ sinh",
    MAINTENANCE: "Bảo trì",
    DAMAGED: "Hư hỏng",
    RETIRED: "Ngưng vĩnh viễn",
}

const STATUS_STYLE = {
    AVAILABLE: "border-[#b8d7cb] bg-[#d4e7dd] text-[#356353]",
    PREPARING: "border-[#c8d9f0] bg-[#ddeaf9] text-[#2d5fa0]",
    RENTED: "border-[#e6c57d] bg-[#fdf0cc] text-[#7c5a10]",
    RETURN_INSPECTION: "border-[#dbc9ec] bg-[#eedff8] text-[#6e3d97]",
    CLEANING: "border-[#c8d9f0] bg-[#ddeaf9] text-[#2d5fa0]",
    MAINTENANCE: "border-[#f0d2aa] bg-[#fde8c8] text-[#8c5415]",
    DAMAGED: "border-[#e6beb9] bg-[#fbe2de] text-[#9b4d47]",
    RETIRED: "border-[#d4ccc7] bg-[#eae6e2] text-[#6e6560]",
}

const STATUS_FILTER_OPTIONS = Object.entries(STATUS_LABEL).map(([value, label]) => [value, label])

function ManagerRentalUnitsPage() {
    const navigate = useNavigate()
    const location = useLocation()

    const [profile, setProfile] = useState(() => getAuthUser())
    const [forbidden, setForbidden] = useState(false)
    const [units, setUnits] = useState([])
    const [garments, setGarments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [reload, setReload] = useState(0)

    const [keyword, setKeyword] = useState("")
    const [garmentId, setGarmentId] = useState("")
    const [size, setSize] = useState("")
    const [status, setStatus] = useState("")

    const [formOpen, setFormOpen] = useState(false)
    const [editingUnit, setEditingUnit] = useState(undefined)
    const [detailUnit, setDetailUnit] = useState(null)
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState("")
    const [retiringUnit, setRetiringUnit] = useState(null)
    const [retiring, setRetiring] = useState(false)
    const [retireError, setRetireError] = useState("")
    const [statusChanging, setStatusChanging] = useState(false)

    useEffect(() => {
        let active = true
        const load = async () => {
            setLoading(true)
            setError("")
            try {
                const user = await getMyProfile()
                if (!active) return
                if (user.role !== "STORE_MANAGER") { setForbidden(true); return }
                const [unitData, garmentData] = await Promise.all([getManagedRentalUnits(), getManagedGarments()])
                if (!active) return
                saveAuthUser(user)
                setProfile(user)
                setUnits(Array.isArray(unitData) ? unitData : [])
                setGarments(Array.isArray(garmentData) ? garmentData : [])
            } catch (requestError) {
                if (!active) return
                if (requestError.response?.status === 401) {
                    navigate("/login", { replace: true, state: { from: location.pathname } })
                    return
                }
                if (requestError.response?.status === 403) { setForbidden(true); return }
                setError(requestError.response?.data?.message || "Không thể tải danh sách kho.")
            } finally {
                if (active) setLoading(false)
            }
        }
        load()
        return () => { active = false }
    }, [location.pathname, navigate, reload])

    const summary = useMemo(() => ({
        total: units.length,
        available: units.filter((u) => u.status === "AVAILABLE").length,
        rented: units.filter((u) => u.status === "RENTED").length,
        maintenance: units.filter((u) => ["MAINTENANCE", "DAMAGED"].includes(u.status)).length,
    }), [units])

    const filteredUnits = useMemo(() => {
        const kw = keyword.trim().toLowerCase()
        return units.filter((unit) => {
            const searchable = [unit.assetCode, unit.garment?.name].filter(Boolean).join(" ").toLowerCase()
            return (
                (!kw || searchable.includes(kw)) &&
                (!garmentId || unit.garmentId === garmentId) &&
                (!size || unit.size?.toLowerCase() === size.trim().toLowerCase()) &&
                (!status || unit.status === status)
            )
        })
    }, [units, keyword, garmentId, size, status])

    const garmentOptions = useMemo(() => garments.map((g) => [g.garmentId, g.name]), [garments])

    const sizeOptions = useMemo(() => {
        const sizes = [...new Set(units.map((u) => u.size).filter(Boolean))].sort()
        return sizes.map((s) => [s, s])
    }, [units])

    const openCreate = () => { setEditingUnit(null); setFormError(""); setFormOpen(true) }
    const openEdit = (unit) => { setDetailUnit(null); setEditingUnit(unit); setFormError(""); setFormOpen(true) }
    const openDetail = (unit) => { setDetailUnit(unit) }
    const closeForm = () => { if (!saving) { setFormOpen(false); setEditingUnit(undefined) } }

    const saveUnit = async (payload) => {
        setSaving(true); setFormError("")
        try {
            if (editingUnit) {
                const updated = await updateRentalUnit(editingUnit.rentalUnitId, payload)
                setUnits((current) => current.map((u) => (u.rentalUnitId === editingUnit.rentalUnitId ? updated : u)))
                if (detailUnit?.rentalUnitId === editingUnit.rentalUnitId) setDetailUnit(updated)
            } else {
                await createRentalUnit(payload)
                setReload((v) => v + 1)
            }
            setFormOpen(false); setEditingUnit(undefined)
        } catch (requestError) {
            setFormError(requestError.response?.data?.message || "Không thể lưu RentalUnit.")
        } finally { setSaving(false) }
    }

    const openRetire = (unit) => {
        setDetailUnit(null)
        setRetireError("")
        setRetiringUnit(unit)
    }

    const confirmRetire = async (reason) => {
        setRetiring(true)
        setRetireError("")
        try {
            const updated = await retireRentalUnit(retiringUnit.rentalUnitId, reason)
            setUnits((current) => current.map((unit) => unit.rentalUnitId === updated.rentalUnitId ? updated : unit))
            setRetiringUnit(null)
        } catch (requestError) {
            setRetireError(requestError.response?.data?.message || "Không thể ngưng vĩnh viễn RentalUnit.")
        } finally { setRetiring(false) }
    }

    const changeStatus = async (unit, newStatus, reason) => {
        setStatusChanging(true)
        try {
            const updated = await changeRentalUnitStatus(unit.rentalUnitId, newStatus, reason)
            const merged = { ...unit, ...updated }
            setUnits((current) => current.map((item) => item.rentalUnitId === unit.rentalUnitId ? merged : item))
            setDetailUnit(merged)
        } finally {
            setStatusChanging(false)
        }
    }

    const logout = () => { clearAuthToken(); navigate("/login", { replace: true }) }

    if (forbidden) return <Navigate to="/" replace />
    if (loading) return <ManagerPageSkeleton />

    const formatDate = (value) => {
        if (!value) return "-"
        return new Intl.DateTimeFormat("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric",
        }).format(new Date(value))
    }

    return (
        <div className="mx-auto flex min-h-screen max-w-[1920px] bg-[#faf6ef] text-[#453c38]">
            <ManagerSidebar role={profile?.role} />
            <main className="min-w-0 flex-1">
                <ManagerHeader
                    profile={profile} loading={loading}
                    title="Kho cho thuê"
                    subtitle="Quản lý từng RentalUnit vật lý của các mẫu trang phục"
                    onReload={() => setReload((v) => v + 1)} onLogout={logout}
                />
                <div className="mx-auto max-w-[1440px] space-y-6 px-5 py-7 sm:px-8 lg:px-12 lg:py-9 xl:px-16">
                    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

                    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            ["Tổng RentalUnit", summary.total],
                            ["Khả dụng", summary.available],
                            ["Đang thuê", summary.rented],
                            ["Bảo trì / hư hỏng", summary.maintenance],
                        ].map(([label, value]) => (
                            <div key={label} className="rounded-xl border border-[#eadfd6] bg-[#fffdf9] px-5 py-4">
                                <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#897d77]">{label}</p>
                                <p className="mt-1 font-serif text-3xl font-semibold">{loading ? "-" : value}</p>
                            </div>
                        ))}
                    </section>

                    <section className="flex flex-col gap-4 rounded-xl border border-[#eadfd6] bg-[#fffdf9] p-5 xl:flex-row xl:items-end">
                        <label className="min-w-0 flex-1">
                            <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#766b66]">Tìm kiếm</span>
                            <span className="relative block">
                                <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9c918b]" />
                                <input
                                    type="search"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    placeholder="Mã tài sản hoặc tên trang phục"
                                    className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/60 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20"
                                />
                            </span>
                        </label>
                        <label className="xl:w-52">
                            <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#766b66]">Trang phục</span>
                            <CustomSelect
                                value={garmentId}
                                onChange={(e) => setGarmentId(e.target.value)}
                                options={garmentOptions}
                                placeholder="Tất cả trang phục"
                                buttonClassName="bg-[#faf6ef]/60"
                            />
                        </label>
                        <label className="xl:w-36">
                            <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#766b66]">Kích thước</span>
                            <CustomSelect
                                value={size}
                                onChange={(e) => setSize(e.target.value)}
                                options={sizeOptions}
                                placeholder="Tất cả kích thước"
                                buttonClassName="bg-[#faf6ef]/60"
                            />
                        </label>
                        <label className="xl:w-44">
                            <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#766b66]">Trạng thái</span>
                            <CustomSelect
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                options={STATUS_FILTER_OPTIONS}
                                placeholder="Tất cả trạng thái"
                                buttonClassName="bg-[#faf6ef]/60"
                            />
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <Link to="/manager/availability-blocks" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#e1d6cf] px-4 text-sm font-semibold text-[#665b55] hover:bg-[#faf6ef]">
                                <CalendarOff size={17} />Lịch khóa
                            </Link>
                            <button
                                type="button"
                                onClick={openCreate}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#f2a39b] px-5 text-sm font-semibold hover:bg-[#ee9188] active:scale-[.98]"
                            >
                                <Plus size={18} />Thêm sản phẩm vào kho
                            </button>
                        </div>
                    </section>

                    <section className="rounded-xl border border-[#eadfd6] bg-[#fffdf9]">
                        <div className="flex items-center justify-between border-b border-[#eadfd6] px-5 py-4 sm:px-6">
                            <div>
                                <h2 className="font-serif text-xl font-semibold">Danh sách kho</h2>
                                <p className="mt-1 text-xs text-[#897d77]">{loading ? "Đang tải..." : `${filteredUnits.length} kết quả`}</p>
                            </div>
                            <Boxes size={20} className="text-[#b65e56]" />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-[#eadfd6] bg-[#faf6ef]/55 text-[#766b66]">
                                        <th className="px-6 py-3 font-medium">Mã tài sản</th>
                                        <th className="px-6 py-3 font-medium">Trang phục</th>
                                        <th className="px-6 py-3 font-medium">Kích thước</th>
                                        <th className="px-6 py-3 font-medium">Tình trạng</th>
                                        <th className="px-6 py-3 font-medium">Trạng thái</th>
                                        <th className="px-6 py-3 font-medium">Ngày tạo</th>
                                        <th className="px-6 py-3 text-right font-medium">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUnits.map((unit) => {
                                        const sl = STATUS_LABEL[unit.status] || unit.status
                                        const ss = STATUS_STYLE[unit.status] || "border-[#e1d6cf] bg-[#faf6ef] text-[#453c38]"
                                        return (
                                            <tr key={unit.rentalUnitId} className="border-b border-[#eadfd6]/70 last:border-0 hover:bg-[#faf6ef]/55">
                                                <td className="px-6 py-3"><span className="font-mono text-sm font-semibold">{unit.assetCode}</span></td>
                                                <td className="px-6 py-3">
                                                    <p className="font-medium">{unit.garment?.name || "-"}</p>
                                                    {unit.garment?.category?.name && <p className="mt-0.5 text-xs text-[#897d77]">{unit.garment.category.name}</p>}
                                                </td>
                                                <td className="px-6 py-3">{unit.size || "-"}</td>
                                                <td className="px-6 py-3"><span className="text-sm">{unit.condition || <span className="text-[#aaa29d]">Chưa cập nhật</span>}</span></td>
                                                <td className="px-6 py-3"><span className={"inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-semibold " + ss}>{sl}</span></td>
                                                <td className="px-6 py-3 text-xs text-[#897d77]">{formatDate(unit.createdAt)}</td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button type="button" onClick={() => openDetail(unit)}
                                                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#e1d6cf] text-[#665b55] transition hover:border-[#cdbfb6] hover:bg-[#faf6ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2a39b]/40"
                                                            aria-label="Xem chi tiết RentalUnit"
                                                            title="Chi tiết">
                                                            <Eye size={16} />
                                                        </button>
                                                        <button type="button" onClick={() => openEdit(unit)}
                                                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#e1d6cf] text-[#665b55] transition hover:border-[#cdbfb6] hover:bg-[#faf6ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2a39b]/40"
                                                            aria-label="Sửa RentalUnit"
                                                            title="Sửa">
                                                            <Pencil size={16} />
                                                        </button>
                                                        {["AVAILABLE", "DAMAGED", "MAINTENANCE"].includes(unit.status) && <button type="button" onClick={() => openRetire(unit)} className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#e6beb9] text-[#9b4d47] transition hover:bg-[#fbe2de] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2a39b]/40" aria-label="Ngưng RentalUnit vĩnh viễn" title="Ngưng vĩnh viễn"><Archive size={16} /></button>}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {!loading && filteredUnits.length === 0 && (
                                        <tr><td colSpan={7} className="px-6 py-14 text-center text-[#897d77]">Không tìm thấy RentalUnit phù hợp.</td></tr>
                                    )}
                                    {loading && (
                                        <tr><td colSpan={7} className="px-6 py-14 text-center">
                                            <LoaderCircle size={24} className="mx-auto animate-spin text-[#b65e56]" />
                                        </td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </main>
            {formOpen && <RentalUnitFormModal unit={editingUnit} garments={garments} saving={saving} error={formError} onClose={closeForm} onSubmit={saveUnit} />}
            {detailUnit && <RentalUnitDetailDrawer unit={detailUnit} statusChanging={statusChanging} onStatusChange={changeStatus} onClose={() => setDetailUnit(null)} onEdit={openEdit} onRetire={openRetire} />}
            {retiringUnit && <RetireRentalUnitModal unit={retiringUnit} saving={retiring} error={retireError} onClose={() => { if (!retiring) setRetiringUnit(null) }} onSubmit={confirmRetire} />}
        </div>
    )
}

export default ManagerRentalUnitsPage
