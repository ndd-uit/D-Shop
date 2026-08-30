import { useMemo, useState } from "react"
import { AlertTriangle, Check, ClipboardCheck, LoaderCircle, RotateCcw, X } from "lucide-react"

const formatCurrency = (value) => `${new Intl.NumberFormat("vi-VN").format(Number(value || 0))}đ`

const getEvidenceUrls = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean)
    if (typeof value !== "string" || !value.trim()) return []

    try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [value]
    } catch {
        return [value]
    }
}

const decisions = [
    { value: "APPROVED", label: "Duyệt đề xuất", description: "Giữ nguyên mức phí nhân viên đề xuất.", icon: Check },
    { value: "ADJUSTED", label: "Điều chỉnh phí", description: "Chốt một mức phí khác và ghi rõ lý do.", icon: RotateCcw },
    { value: "REJECTED", label: "Không thu phí", description: "Bác đề xuất và đưa phí phát sinh về 0đ.", icon: X },
]

function FeeApprovalDecisionModal({ request, saving, error, onClose, onSubmit }) {
    const proposedAmount = Number(request.proposedAmount || 0)
    const inspectionCharge = useMemo(() => request.rentalOrder.items.reduce(
        (sum, item) => sum + Number(item.inspectionResult?.proposedCharge || 0),
        0,
    ), [request.rentalOrder.items])
    const lateFee = Math.max(proposedAmount - inspectionCharge, 0)
    const [decision, setDecision] = useState("APPROVED")
    const [finalAmount, setFinalAmount] = useState(String(proposedAmount))
    const [decisionReason, setDecisionReason] = useState("")
    const [validationError, setValidationError] = useState("")

    const submit = (event) => {
        event.preventDefault()
        const amount = Number(finalAmount)
        if (decision === "ADJUSTED" && (!Number.isFinite(amount) || amount < 0)) {
            setValidationError("Số tiền điều chỉnh phải là số không âm.")
            return
        }
        if (decision === "ADJUSTED" && !decisionReason.trim()) {
            setValidationError("Cần nhập lý do khi điều chỉnh mức phí.")
            return
        }
        setValidationError("")
        onSubmit({
            decision,
            finalAmount: decision === "ADJUSTED" ? amount : undefined,
            decisionReason: decisionReason.trim() || undefined,
        })
    }

    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#302823]/45 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}>
        <form onSubmit={submit} className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#eadfd6] bg-[#fffdf9] shadow-2xl">
            <header className="flex items-start justify-between border-b border-[#eadfd6] px-5 py-4 sm:px-7">
                <div className="flex gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#fbe2de] text-[#b65e56]"><ClipboardCheck size={22} /></span><div><h2 className="font-serif text-2xl font-semibold">Xử lý đề xuất phí</h2><p className="mt-1 text-xs text-[#897d77]">Đơn #{request.rentalOrderId.slice(0, 8)} · {request.rentalOrder.customer.fullName}</p></div></div>
                <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-2 hover:bg-[#faf6ef] disabled:opacity-50" aria-label="Đóng"><X size={20} /></button>
            </header>

            <div className="overflow-y-auto px-5 py-5 sm:px-7">
                <section className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-[#eadfd6] bg-[#faf6ef] p-4"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#897d77]">Phí kiểm tra</p><p className="mt-1 font-serif text-xl font-semibold">{formatCurrency(inspectionCharge)}</p></div>
                    <div className="rounded-xl border border-[#eadfd6] bg-[#faf6ef] p-4"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#897d77]">Phí trả trễ</p><p className="mt-1 font-serif text-xl font-semibold">{formatCurrency(lateFee)}</p></div>
                    <div className="rounded-xl border border-[#efb9b3] bg-[#fbe2de]/60 p-4"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9b4d47]">Tổng đề xuất</p><p className="mt-1 font-serif text-xl font-semibold text-[#9b4d47]">{formatCurrency(proposedAmount)}</p></div>
                </section>

                <section className="mt-5 rounded-xl border border-[#eadfd6]">
                    <div className="border-b border-[#eadfd6] px-4 py-3"><h3 className="text-sm font-semibold">Căn cứ đề xuất</h3></div>
                    <div className="divide-y divide-[#eadfd6]">{request.rentalOrder.items.map((item) => {
                        const evidenceUrls = getEvidenceUrls(item.inspectionResult?.evidenceUrls)

                        return <div key={item.orderItemId} className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-[1fr_auto]"><div><p className="font-semibold">{item.garment.name} · size {item.requestedSize}</p>{item.inspectionResult ? <p className="mt-1 text-xs text-[#766b66]">{item.inspectionResult.issueType || "Không ghi nhận sự cố"}{item.inspectionResult.description ? `: ${item.inspectionResult.description}` : ""}</p> : <p className="mt-1 text-xs text-[#897d77]">Không có phí từ kiểm tra trang phục</p>}{evidenceUrls.length > 0 && <div className="mt-3 flex flex-wrap gap-2" aria-label={`Bằng chứng kiểm tra ${item.garment.name}`}>{evidenceUrls.map((url, index) => <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-[#e1d6cf] bg-[#faf6ef] transition hover:border-[#d77b72]" title="Mở ảnh bằng chứng"><img src={url} alt={`Bằng chứng ${item.garment.name} ${index + 1}`} loading="lazy" className="h-20 w-16 object-cover" /></a>)}</div>}</div><p className="font-semibold sm:text-right">{formatCurrency(item.inspectionResult?.proposedCharge)}</p></div>
                    })}</div>
                    {lateFee > 0 && <div className="flex items-center justify-between border-t border-[#eadfd6] px-4 py-3 text-sm"><span>Phí trả trễ của đơn</span><strong>{formatCurrency(lateFee)}</strong></div>}
                </section>

                <fieldset className="mt-5"><legend className="mb-3 text-sm font-semibold">Quyết định của quản lý</legend><div className="grid gap-3 sm:grid-cols-3">{decisions.map(({ value, label, description, icon: Icon }) => <label key={value} className={`cursor-pointer rounded-xl border p-4 transition ${decision === value ? "border-[#d77b72] bg-[#fbe2de]/45 ring-2 ring-[#f2a39b]/20" : "border-[#eadfd6] hover:bg-[#faf6ef]"}`}><input type="radio" name="decision" value={value} checked={decision === value} onChange={(event) => { setDecision(event.target.value); setValidationError("") }} className="sr-only" /><span className="flex items-center gap-2 text-sm font-semibold"><Icon size={17} />{label}</span><span className="mt-1.5 block text-xs leading-5 text-[#766b66]">{description}</span></label>)}</div></fieldset>

                {decision === "ADJUSTED" && <label className="mt-5 block"><span className="mb-2 block text-xs font-semibold">Mức phí sau điều chỉnh <b className="text-red-600">*</b></span><input type="number" min="0" step="1" value={finalAmount} onChange={(event) => setFinalAmount(event.target.value)} className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-white px-4 outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></label>}
                <label className="mt-4 block"><span className="mb-2 block text-xs font-semibold">Lý do quyết định {decision === "ADJUSTED" && <b className="text-red-600">*</b>}</span><textarea rows="3" value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} placeholder={decision === "ADJUSTED" ? "Giải thích căn cứ điều chỉnh..." : "Ghi chú để lưu vết quyết định (không bắt buộc)"} className="w-full resize-none rounded-xl border border-[#e1d6cf] bg-white px-4 py-3 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></label>
                {(validationError || error) && <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertTriangle className="mt-0.5 shrink-0" size={17} />{validationError || error}</p>}
            </div>

            <footer className="flex justify-end gap-3 border-t border-[#eadfd6] px-5 py-4 sm:px-7"><button type="button" onClick={onClose} disabled={saving} className="min-h-10 rounded-xl border border-[#e1d6cf] px-4 text-sm font-semibold hover:bg-[#faf6ef] disabled:opacity-50">Đóng</button><button type="submit" disabled={saving} className="inline-flex min-h-10 min-w-36 items-center justify-center gap-2 rounded-xl bg-[#f2a39b] px-5 text-sm font-semibold hover:bg-[#ee9188] disabled:cursor-wait disabled:opacity-60">{saving && <LoaderCircle size={17} className="animate-spin" />}{decision === "APPROVED" ? "Duyệt phí" : decision === "ADJUSTED" ? "Lưu điều chỉnh" : "Không thu phí"}</button></footer>
        </form>
    </div>
}

export default FeeApprovalDecisionModal
