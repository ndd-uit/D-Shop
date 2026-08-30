import { useState } from "react"
import { LoaderCircle, X } from "lucide-react"
import CustomSelect from "../common/CustomSelect.jsx"

const CONDITION_OPTIONS = [
    ["Tốt", "Tốt"],
    ["Có dấu hiệu sử dụng", "Có dấu hiệu sử dụng"],
    ["Cần vệ sinh", "Cần vệ sinh"],
    ["Hư hỏng nhẹ", "Hư hỏng nhẹ"],
    ["Hư hỏng", "Hư hỏng"],
]

const emptyForm = {
    garmentId: "",
    assetCode: "",
    size: "",
    condition: "",
}

function RentalUnitFormModal({ unit, garments, saving, error, onClose, onSubmit }) {
    const isEditing = Boolean(unit)

    const [form, setForm] = useState(() =>
        unit
            ? {
                garmentId: unit.garmentId || "",
                assetCode: unit.assetCode || "",
                size: unit.size || "",
                condition: unit.condition || "",
            }
            : emptyForm
    )

    const updateField = (name, value) =>
        setForm((current) => ({ ...current, [name]: value }))

    const submit = (event) => {
        event.preventDefault()
        if (isEditing) {
            // Backend only allows: assetCode, size, condition
            const payload = {}
            if (form.assetCode !== unit.assetCode) payload.assetCode = form.assetCode.trim()
            if (form.size !== unit.size) payload.size = form.size.trim()
            if ((form.condition || "") !== (unit.condition || "")) payload.condition = form.condition.trim() || null
            onSubmit(payload)
        } else {
            onSubmit({
                garmentId: form.garmentId,
                assetCode: form.assetCode.trim(),
                size: form.size.trim(),
                condition: form.condition.trim() || null,
            })
        }
    }

    const garmentOptions = garments.map((g) => [g.garmentId, g.name])

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-[#453c38]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !saving) onClose()
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="ru-form-title"
                className="flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[#eadfd6] bg-[#fffdf9] shadow-[0_24px_80px_rgba(69,60,56,.2)] sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-2xl"
            >
                <header className="z-10 flex shrink-0 items-center justify-between border-b border-[#eadfd6] bg-[#fffdf9] px-5 py-4 sm:px-7">
                    <div>
                        <h2 id="ru-form-title" className="font-serif text-2xl font-semibold">
                            {isEditing ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm vào kho"}
                        </h2>
                        <p className="mt-1 text-xs text-[#897d77]">
                            {isEditing
                                ? `Mã tài sản: ${unit.assetCode}`
                                : "Thêm sản phẩm vật lý mới vào kho cho thuê"}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-lg p-2 hover:bg-[#faf6ef]"
                        aria-label="Đóng"
                    >
                        <X size={20} />
                    </button>
                </header>

                <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
                        {error && (
                            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                {error}
                            </p>
                        )}

                        {/* Garment (chỉ hiển thị khi tạo mới) */}
                        {!isEditing ? (
                            <label>
                                <span className="mb-2 block text-xs font-semibold">
                                    Trang phục <span className="text-red-500">*</span>
                                </span>
                                <CustomSelect
                                    value={form.garmentId}
                                    onChange={(event) => updateField("garmentId", event.target.value)}
                                    options={garmentOptions}
                                    placeholder="Chọn trang phục"
                                    buttonClassName="bg-[#faf6ef]/55"
                                />
                            </label>
                        ) : (
                            <div className="rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/40 px-4 py-3">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-[#897d77]">Trang phục</p>
                                <p className="mt-1 text-sm font-semibold">{unit.garment?.name || "–"}</p>
                                <p className="text-xs text-[#897d77]">{unit.garment?.category?.name || ""}</p>
                            </div>
                        )}

                        <div className="grid gap-5 sm:grid-cols-2">
                            {/* Mã tài sản */}
                            <label className="sm:col-span-2">
                                <span className="mb-2 block text-xs font-semibold">
                                    Mã tài sản <span className="text-red-500">*</span>
                                </span>
                                <input
                                    required
                                    maxLength={100}
                                    value={form.assetCode}
                                    onChange={(event) => updateField("assetCode", event.target.value)}
                                    placeholder="VD: D-V089-01"
                                    className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/55 px-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20"
                                />
                            </label>

                            {/* Kích thước */}
                            <label>
                                <span className="mb-2 block text-xs font-semibold">
                                    Kích thước <span className="text-red-500">*</span>
                                </span>
                                <input
                                    required
                                    maxLength={50}
                                    value={form.size}
                                    onChange={(event) => updateField("size", event.target.value)}
                                    placeholder="VD: S, M, L, XL"
                                    className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/55 px-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20"
                                />
                            </label>

                            {/* Tình trạng */}
                            <label>
                                <span className="mb-2 block text-xs font-semibold">Tình trạng</span>
                                <CustomSelect
                                    value={form.condition}
                                    onChange={(event) => updateField("condition", event.target.value)}
                                    options={CONDITION_OPTIONS}
                                    placeholder="Chọn tình trạng"
                                    buttonClassName="bg-[#faf6ef]/55"
                                />
                            </label>
                        </div>

                        {!isEditing && (
                            <p className="rounded-xl border border-[#eadfd6] bg-[#faf6ef]/60 px-4 py-3 text-xs text-[#766b66]">
                                Trạng thái ban đầu sẽ được đặt là <strong>Khả dụng</strong> tự động.
                            </p>
                        )}
                    </div>

                    <footer className="flex shrink-0 justify-end gap-3 border-t border-[#eadfd6] bg-[#fffdf9] px-5 py-4 sm:px-7">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="min-h-11 rounded-xl border border-[#e1d6cf] px-5 text-sm font-semibold hover:bg-[#faf6ef]"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex min-h-11 min-w-28 items-center justify-center gap-2 rounded-xl bg-[#f2a39b] px-5 text-sm font-semibold hover:bg-[#ee9188] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving && <LoaderCircle size={17} className="animate-spin" />}
                            Lưu
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    )
}

export default RentalUnitFormModal
