import { useState } from "react"
import { Clock3, FilePlus2, LoaderCircle, ShieldCheck, X } from "lucide-react"

const toDateTimeLocal = (date) => {
    const value = new Date(date)
    const offset = value.getTimezoneOffset() * 60000
    return new Date(value.getTime() - offset).toISOString().slice(0, 16)
}

const lateFeeDescription = (policy) => {
    if (!policy) return "Chưa cấu hình"
    if (policy.basis === "DAILY_RENTAL_AMOUNT") return "Đến 12:00: (số ngày trễ − 0,5) × tiền thuê/ngày; sau 12:00: số ngày trễ × tiền thuê/ngày. Tiền thuê/ngày = tổng tiền thuê đã chốt ÷ số ngày thuê."

    return `Trước ${String(policy.halfDayCutoffHour).padStart(2, "0")}:00: (số ngày trễ − 0,5) × tổng tiền thuê cả kỳ; từ ${String(policy.halfDayCutoffHour).padStart(2, "0")}:00: số ngày trễ × tổng tiền thuê cả kỳ.`
}

function PolicyVersionFormModal({ currentPolicy, saving, error, onClose, onSubmit }) {
    const [minimumStart] = useState(() =>
        toDateTimeLocal(new Date(Date.now() + 60000)),
    )
    const [form, setForm] = useState(() => ({
        version: "",
        effectiveFrom: minimumStart,
        holdDuration: String(currentPolicy?.holdDuration ?? 15),
        approvalThreshold: String(currentPolicy?.approvalThreshold ?? 0),
        damageFeePolicy: currentPolicy?.damageFeePolicy ?? "",
    }))
    const [validationError, setValidationError] = useState("")

    const updateField = (event) => {
        const { name, value } = event.target
        setForm((current) => ({ ...current, [name]: value }))
        setValidationError("")
    }

    const submit = (event) => {
        event.preventDefault()
        const effectiveFrom = new Date(form.effectiveFrom)
        const holdDuration = Number(form.holdDuration)
        const approvalThreshold = Number(form.approvalThreshold)

        if (!form.version.trim()) {
            setValidationError("Cần nhập tên phiên bản chính sách.")
            return
        }
        if (Number.isNaN(effectiveFrom.getTime()) || effectiveFrom <= new Date()) {
            setValidationError("Thời điểm hiệu lực phải ở tương lai.")
            return
        }
        if (!Number.isInteger(holdDuration) || holdDuration < 0) {
            setValidationError("Thời gian giữ chỗ phải là số phút nguyên không âm.")
            return
        }
        if (!Number.isFinite(approvalThreshold) || approvalThreshold < 0) {
            setValidationError("Ngưỡng phê duyệt phải là số không âm.")
            return
        }

        onSubmit({
            version: form.version.trim(),
            effectiveFrom: effectiveFrom.toISOString(),
            holdDuration,
            approvalThreshold,
            ...(form.damageFeePolicy.trim()
                ? { damageFeePolicy: form.damageFeePolicy.trim() }
                : {}),
        })
    }

    return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#453c38]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}>
        <form onSubmit={submit} className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-[#eadfd6] bg-[#fffdf9] shadow-[0_24px_80px_rgba(69,60,56,.2)] sm:rounded-2xl">
            <header className="flex items-start justify-between border-b border-[#eadfd6] px-5 py-4 sm:px-7">
                <div className="flex gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#fbe2de] text-[#b65e56]"><FilePlus2 size={22} /></span><div><h2 className="font-serif text-2xl font-semibold">Tạo phiên bản chính sách</h2><p className="mt-1 text-xs text-[#897d77]">Tạo snapshot mới, không thay đổi các phiên bản đã dùng.</p></div></div>
                <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-2 hover:bg-[#faf6ef] disabled:opacity-50" aria-label="Đóng"><X size={20} /></button>
            </header>

            <div className="overflow-y-auto px-5 py-5 sm:px-7">
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block"><span className="mb-2 block text-xs font-semibold">Phiên bản *</span><input name="version" required maxLength={50} value={form.version} onChange={updateField} placeholder="Ví dụ: v2.1" className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/55 px-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></label>
                    <label className="block"><span className="mb-2 block text-xs font-semibold">Bắt đầu hiệu lực *</span><input name="effectiveFrom" type="datetime-local" required min={minimumStart} value={form.effectiveFrom} onChange={updateField} className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/55 px-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></label>
                    <label className="block"><span className="mb-2 block text-xs font-semibold">Thời gian giữ chỗ (phút) *</span><input name="holdDuration" type="number" required min="0" step="1" value={form.holdDuration} onChange={updateField} className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/55 px-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></label>
                    <label className="block"><span className="mb-2 block text-xs font-semibold">Ngưỡng phê duyệt phí *</span><input name="approvalThreshold" type="number" required min="0" step="1" value={form.approvalThreshold} onChange={updateField} className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/55 px-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></label>
                </div>

                <label className="mt-4 block"><span className="mb-2 block text-xs font-semibold">Ghi chú chính sách hư hỏng</span><textarea name="damageFeePolicy" rows="3" value={form.damageFeePolicy} onChange={updateField} placeholder="Giữ trống để kế thừa cấu hình hiện hành" className="w-full resize-y rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/55 p-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></label>

                <section className="mt-5 rounded-xl border border-[#cbded5] bg-[#edf5f1] p-4">
                    <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-[#557b6d]" size={19} /><div><h3 className="text-sm font-semibold">Quy tắc phí trả trễ được kế thừa</h3><p className="mt-1 text-xs leading-5 text-[#62766e]">{lateFeeDescription(currentPolicy?.lateFeePolicy)}</p><p className="mt-1 flex items-center gap-1.5 text-[11px] text-[#758981]"><Clock3 size={13} />Múi giờ {currentPolicy?.lateFeePolicy?.timezone || "Asia/Ho_Chi_Minh"}, giờ cửa hàng 08:00–18:00.</p></div></div>
                </section>

                {(validationError || error) && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{validationError || error}</p>}
            </div>

            <footer className="flex justify-end gap-3 border-t border-[#eadfd6] px-5 py-4 sm:px-7"><button type="button" onClick={onClose} disabled={saving} className="min-h-10 rounded-xl border border-[#e1d6cf] px-4 text-sm font-semibold hover:bg-[#faf6ef] disabled:opacity-50">Hủy</button><button type="submit" disabled={saving} className="inline-flex min-h-10 min-w-40 items-center justify-center gap-2 rounded-xl bg-[#f2a39b] px-5 text-sm font-semibold hover:bg-[#ee9188] active:scale-[.98] disabled:cursor-wait disabled:opacity-60">{saving && <LoaderCircle size={17} className="animate-spin" />}Tạo phiên bản</button></footer>
        </form>
    </div>
}

export default PolicyVersionFormModal
