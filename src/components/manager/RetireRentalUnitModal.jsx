import { Archive, LoaderCircle, X } from "lucide-react"
import { useState } from "react"

function RetireRentalUnitModal({ unit, saving, error, onClose, onSubmit }) {
    const [reason, setReason] = useState("")

    const submit = (event) => {
        event.preventDefault()
        onSubmit(reason.trim())
    }

    return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#453c38]/35 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}>
        <section role="dialog" aria-modal="true" aria-labelledby="retire-unit-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-[#eadfd6] bg-[#fffdf9] shadow-[0_24px_80px_rgba(69,60,56,.2)]">
            <header className="flex items-start justify-between border-b border-[#eadfd6] px-5 py-4 sm:px-6"><div><div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-[#fbe2de] text-[#9b4d47]"><Archive size={20} /></div><h2 id="retire-unit-title" className="font-serif text-2xl font-semibold">Ngưng vĩnh viễn RentalUnit</h2><p className="mt-1 text-sm text-[#766b66]">Mã tài sản: <strong>{unit.assetCode}</strong></p></div><button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-2 hover:bg-[#faf6ef]" aria-label="Đóng"><X size={20} /></button></header>
            <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
                {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                <label className="block"><span className="mb-2 block text-xs font-semibold">Lý do ngừng sử dụng *</span><textarea required rows="4" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ví dụ: Trang phục đã xuống cấp, không còn phù hợp để cho thuê" className="w-full resize-y rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/55 p-4 text-sm outline-none focus:border-[#d6847d] focus:ring-2 focus:ring-[#d6847d]/20" /></label>
                <p className="text-xs leading-5 text-[#766b66]">RentalUnit đã chuyển sang trạng thái này sẽ ngưng sử dụng vĩnh viễn, không thể khôi phục hoặc cấp cho đơn thuê mới.</p>
                <div className="flex justify-end gap-3 border-t border-[#eadfd6] pt-5"><button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-xl border border-[#e1d6cf] px-5 text-sm font-semibold hover:bg-[#faf6ef]">Hủy</button><button type="submit" disabled={saving || !reason.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#b85f57] px-5 text-sm font-semibold text-white hover:bg-[#a9544d] disabled:cursor-not-allowed disabled:opacity-50">{saving && <LoaderCircle size={17} className="animate-spin" />}Xác nhận ngừng</button></div>
            </form>
        </section>
    </div>
}

export default RetireRentalUnitModal
