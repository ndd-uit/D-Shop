import { Archive, Clock3, LoaderCircle, Pencil, RefreshCw, X } from "lucide-react"
import { useMemo, useState } from "react"

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

const RETIRABLE_STATUSES = new Set(["AVAILABLE", "DAMAGED", "MAINTENANCE"])
const STATUS_TRANSITIONS = {
    AVAILABLE: ["MAINTENANCE", "DAMAGED"],
    PREPARING: ["MAINTENANCE", "DAMAGED"],
    RETURN_INSPECTION: ["CLEANING", "MAINTENANCE", "DAMAGED"],
    DAMAGED: ["MAINTENANCE"],
    CLEANING: ["AVAILABLE"],
    MAINTENANCE: ["AVAILABLE"],
}

function Field({ label, value }) {
    return <div><p className="text-[10px] font-bold uppercase tracking-wide text-[#897d77]">{label}</p><p className="mt-1 text-sm font-medium">{value || "-"}</p></div>
}

const formatDateTime = (value) => value
    ? new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value))
    : "-"

function RentalUnitDetailDrawer({ unit, statusChanging, onStatusChange, onClose, onEdit, onRetire }) {
    const transitionOptions = useMemo(() => STATUS_TRANSITIONS[unit?.status] ?? [], [unit?.status])
    const [newStatus, setNewStatus] = useState("")
    const [reason, setReason] = useState("")
    const [statusError, setStatusError] = useState("")
    if (!unit) return null
    const status = unit.status || "AVAILABLE"
    const statusLabel = STATUS_LABEL[status] || status
    const statusStyle = STATUS_STYLE[status] || "border-[#e1d6cf] bg-[#faf6ef] text-[#453c38]"
    const createdAt = formatDateTime(unit.createdAt)
    const statusHistory = Array.isArray(unit.statusHistory) ? unit.statusHistory : []

    const submitStatus = async (event) => {
        event.preventDefault()
        if (!newStatus || !reason.trim()) return
        setStatusError("")
        try {
            await onStatusChange(unit, newStatus, reason.trim())
            setNewStatus("")
            setReason("")
        } catch (error) {
            setStatusError(error.response?.data?.message || "Không thể cập nhật trạng thái RentalUnit.")
        }
    }

    return <div className="fixed inset-0 z-50 flex justify-end bg-[#453c38]/30 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
        <aside role="dialog" aria-modal="true" aria-labelledby="ru-detail-title" className="flex h-full w-full max-w-sm flex-col border-l border-[#eadfd6] bg-[#fffdf9] shadow-[0_0_60px_rgba(69,60,56,.18)]">
            <header className="flex shrink-0 items-start justify-between border-b border-[#eadfd6] px-5 py-5"><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#897d77]">Chi tiết RentalUnit</p><h2 id="ru-detail-title" className="mt-1 font-serif text-2xl font-semibold">{unit.assetCode}</h2></div><button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-[#faf6ef]" aria-label="Đóng"><X size={20} /></button></header>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <div><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#897d77]">Trạng thái</p><span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-semibold ${statusStyle}`}>{statusLabel}</span></div>
                <div className="h-px bg-[#eadfd6]" />
                <div className="space-y-4"><p className="text-[10px] font-bold uppercase tracking-widest text-[#897d77]">Thông tin trang phục</p><Field label="Tên trang phục" value={unit.garment?.name} /><Field label="Danh mục" value={unit.garment?.category?.name} /></div>
                <div className="h-px bg-[#eadfd6]" />
                <div className="space-y-4"><p className="text-[10px] font-bold uppercase tracking-widest text-[#897d77]">Thông tin RentalUnit</p><Field label="Mã tài sản" value={unit.assetCode} /><Field label="Kích thước" value={unit.size} /><Field label="Tình trạng" value={unit.condition || "Chưa cập nhật"} /><Field label="Ngày tạo" value={createdAt} /></div>
                <div className="h-px bg-[#eadfd6]" />
                <section>
                    <div className="flex items-center gap-2"><Clock3 size={15} className="text-[#b65e56]" /><p className="text-[10px] font-bold uppercase tracking-widest text-[#897d77]">Lịch sử trạng thái</p></div>
                    {statusHistory.length > 0 ? <ol className="mt-4 space-y-4 border-l border-[#e1d6cf] pl-4">{statusHistory.map((entry) => <li key={entry.historyId} className="relative"><span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-[#fffdf9] bg-[#d77b72]" /><p className="text-sm font-semibold">{entry.oldStatus ? `${STATUS_LABEL[entry.oldStatus] || entry.oldStatus} → ` : ""}{STATUS_LABEL[entry.newStatus] || entry.newStatus}</p><p className="mt-1 text-xs text-[#897d77]">{formatDateTime(entry.changedAt)} · {entry.changedByUser?.fullName || "Hệ thống"}</p>{entry.reason && <p className="mt-1 text-xs leading-5 text-[#665b55]">{entry.reason}</p>}</li>)}</ol> : <p className="mt-3 rounded-xl bg-[#faf6ef] p-3 text-xs text-[#897d77]">Chưa có lần chuyển trạng thái nào được ghi nhận.</p>}
                </section>
                {transitionOptions.length > 0 && <><div className="h-px bg-[#eadfd6]" /><form onSubmit={submitStatus} className="space-y-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#897d77]">Chuyển trạng thái vận hành</p><p className="mt-1 text-xs leading-5 text-[#897d77]">Chỉ hiển thị transition backend cho phép. RETIRED không thể khôi phục.</p></div><select value={newStatus} onChange={(event) => setNewStatus(event.target.value)} className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef] px-3 text-sm outline-none focus:border-[#f2a39b]"><option value="">Chọn trạng thái tiếp theo</option>{transitionOptions.map((value) => <option key={value} value={value}>{STATUS_LABEL[value]}</option>)}</select><textarea rows="2" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Lý do thay đổi trạng thái" className="w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef] p-3 text-sm outline-none focus:border-[#f2a39b]" />{statusError && <p role="alert" className="text-xs text-red-600">{statusError}</p>}<button type="submit" disabled={statusChanging || !newStatus || !reason.trim()} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#f2a39b] px-4 text-sm font-semibold disabled:opacity-50">{statusChanging ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />}Cập nhật trạng thái</button></form></>}
            </div>
            <footer className="flex shrink-0 gap-3 border-t border-[#eadfd6] px-5 py-4"><button type="button" onClick={() => onEdit(unit)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#e1d6cf] px-4 py-2.5 text-sm font-semibold hover:bg-[#faf6ef]"><Pencil size={16} />Chỉnh sửa</button>{RETIRABLE_STATUSES.has(status) && <button type="button" onClick={() => onRetire(unit)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e6beb9] px-4 py-2.5 text-sm font-semibold text-[#9b4d47] hover:bg-[#fbe2de]"><Archive size={16} />Ngưng vĩnh viễn</button>}</footer>
        </aside>
    </div>
}

export default RentalUnitDetailDrawer
