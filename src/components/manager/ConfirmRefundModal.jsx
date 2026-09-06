import { useState } from "react"
import { LoaderCircle, X } from "lucide-react"
import { formatCurrency } from "../rental/rentalOrderUtils.js"
import { confirmRefundSucceeded } from "../../services/paymentApi.js"

function ConfirmRefundModal({ refund, onClose, onConfirmed }) {
    const [reference, setReference] = useState("")
    const [confirmed, setConfirmed] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    const submit = async (event) => {
        event.preventDefault()
        if (saving || !confirmed || !reference.trim()) return
        setSaving(true)
        setError("")
        try {
            const result = await confirmRefundSucceeded(refund.refundId, reference.trim())
            onConfirmed(result)
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Chưa ghi nhận được hoàn tiền. Kiểm tra trạng thái trước khi thử lại; không chuyển tiền thêm lần nữa.")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#453c38]/35 p-4 backdrop-blur-sm">
            <section role="dialog" aria-modal="true" aria-labelledby="confirm-refund-title" className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#eadfd6] bg-[#fffdf9] p-5 shadow-xl sm:p-7">
                <div className="flex items-center justify-between gap-4">
                    <h2 id="confirm-refund-title" className="text-xl font-semibold">Xác nhận đã hoàn tiền</h2>
                    <button type="button" onClick={onClose} disabled={saving} aria-label="Đóng" className="rounded-lg p-2 hover:bg-[#faf6ef]"><X size={20} /></button>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#766b66]">
                    Hoàn tiền cho khách bằng chuyển khoản hoặc tiền mặt trước khi xác nhận.
                    Thao tác này chỉ ghi nhận khoản đã hoàn, không tự chuyển tiền.
                </p>
                <dl className="my-5 space-y-3 rounded-xl bg-[#faf6ef] p-4 text-sm">
                    <div className="flex justify-between gap-4"><dt>Đơn thuê</dt><dd className="font-semibold">#{refund.rentalOrderId.slice(0, 8)}</dd></div>
                    <div className="flex justify-between gap-4"><dt>Loại</dt><dd>{refund.type === "DEPOSIT_RETURN" ? "Hoàn tiền cọc" : "Hoàn tiền thuê"}</dd></div>
                    <div className="flex justify-between gap-4"><dt>Số tiền phải hoàn</dt><dd className="font-semibold text-[#a9544d]">{formatCurrency(refund.amount)}</dd></div>
                </dl>
                <form onSubmit={submit}>
                    <label className="block text-sm font-medium">
                        Mã giao dịch / số phiếu chi
                        <input required maxLength={255} value={reference} onChange={(event) => setReference(event.target.value)} disabled={saving} autoFocus className="mt-2 min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef] px-3 text-sm outline-none focus:border-[#f2a39b]" />
                    </label>
                    <label className="mt-5 flex items-start gap-3 text-sm leading-relaxed text-[#665b55]">
                        <input type="checkbox" required checked={confirmed} disabled={saving} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 accent-[#a9544d]" />
                        Tôi xác nhận đã hoàn đủ {formatCurrency(refund.amount)} cho khách và đã đối chiếu chứng từ.
                    </label>
                    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-xl border border-[#e1d6cf] px-4 text-sm">Đóng</button>
                        <button type="submit" disabled={saving || !confirmed || !reference.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#f2a39b] px-4 text-sm font-semibold disabled:opacity-50">
                            {saving && <LoaderCircle size={16} className="animate-spin" />}
                            {saving ? "Đang ghi nhận..." : "Xác nhận đã hoàn"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    )
}

export default ConfirmRefundModal
