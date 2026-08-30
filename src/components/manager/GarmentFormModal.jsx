import { useEffect, useMemo, useState } from "react"
import { Image, ImagePlus, LoaderCircle, Trash2, X } from "lucide-react"

import CustomSelect from "../common/CustomSelect.jsx"

const emptyForm = {
    categoryId: "",
    name: "",
    description: "",
    color: "",
    rentalPrice: "",
    depositAmount: "",
}

const parseImageUrls = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean)
    if (typeof value !== "string" || !value.trim()) return []
    try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [value]
    } catch {
        return [value]
    }
}

function GarmentFormModal({ garment, categories, saving, error, onClose, onSubmit }) {
    const [form, setForm] = useState(() => garment ? {
        categoryId: garment.categoryId || "",
        name: garment.name || "",
        description: garment.description || "",
        color: garment.color || "",
        rentalPrice: String(garment.rentalPrice ?? ""),
        depositAmount: String(garment.depositAmount ?? ""),
    } : emptyForm)
    const [images, setImages] = useState([])
    const [imageError, setImageError] = useState("")
    const [categoryError, setCategoryError] = useState("")
    const [isDraggingImages, setIsDraggingImages] = useState(false)
    const isEditing = Boolean(garment)
    const existingImages = useMemo(
        () => parseImageUrls(garment?.imageUrls),
        [garment?.imageUrls],
    )
    const imagePreviews = useMemo(
        () => images.map((file) => ({ file, url: URL.createObjectURL(file) })),
        [images],
    )

    useEffect(() => () => {
        imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url))
    }, [imagePreviews])

    const updateField = (name, value) => setForm((current) => ({ ...current, [name]: value }))
    const submit = (event) => {
        event.preventDefault()

        if (!form.categoryId) {
            setCategoryError("Vui lòng chọn danh mục.")
            return
        }

        setCategoryError("")
        const payload = {
            name: form.name.trim(),
            description: form.description.trim() || null,
            color: form.color.trim() || null,
            rentalPrice: Number(form.rentalPrice),
            depositAmount: Number(form.depositAmount),
        }
        if (!isEditing || form.categoryId !== garment.categoryId) payload.categoryId = form.categoryId
        onSubmit(payload, images)
    }

    const addImages = (selected) => {
        const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"])

        if (selected.some((file) => !allowedTypes.has(file.type))) {
            setImageError("Ảnh phải là JPG, PNG hoặc WEBP.")
            return
        }

        if (selected.some((file) => file.size > 5 * 1024 * 1024)) {
            setImageError("Mỗi ảnh không được vượt quá 5MB.")
            return
        }

        const nextImages = [...images]

        selected.forEach((file) => {
            const duplicated = nextImages.some((current) =>
                current.name === file.name &&
                current.size === file.size &&
                current.lastModified === file.lastModified
            )

            if (!duplicated) nextImages.push(file)
        })

        if (nextImages.length > 5) {
            setImageError(`Chỉ được chọn tối đa 5 ảnh (hiện đã chọn ${images.length}).`)
            return
        }

        setImageError("")
        setImages(nextImages)
    }

    const selectImages = (event) => {
        addImages(Array.from(event.target.files ?? []))
        event.target.value = ""
    }

    const dropImages = (event) => {
        event.preventDefault()
        setIsDraggingImages(false)
        addImages(Array.from(event.dataTransfer.files ?? []))
    }

    const removeImage = (fileToRemove) => {
        setImages((current) => current.filter((file) => file !== fileToRemove))
        setImageError("")
    }

    return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#453c38]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}>
        <section role="dialog" aria-modal="true" aria-labelledby="garment-form-title" className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[#eadfd6] bg-[#fffdf9] shadow-[0_24px_80px_rgba(69,60,56,.2)] sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-2xl">
            <header className="z-10 flex shrink-0 items-center justify-between border-b border-[#eadfd6] bg-[#fffdf9] px-5 py-4 sm:px-7"><div><h2 id="garment-form-title" className="font-serif text-2xl font-semibold">{isEditing ? "Cập nhật trang phục" : "Thêm trang phục"}</h2><p className="mt-1 text-xs text-[#897d77]">Giá thuê là giá cố định cho một lượt thuê.</p></div><button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-2 hover:bg-[#faf6ef]" aria-label="Đóng"><X size={20} /></button></header>
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
                {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                <div className="grid gap-5 sm:grid-cols-2">
                    <label className="sm:col-span-2"><span className="mb-2 block text-xs font-semibold">Tên trang phục *</span><input required maxLength={200} value={form.name} onChange={(event) => updateField("name", event.target.value)} className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/55 px-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></label>
                    <label><span className="mb-2 block text-xs font-semibold">Danh mục *</span><CustomSelect value={form.categoryId} onChange={(event) => { updateField("categoryId", event.target.value); setCategoryError("") }} options={categories.map((category) => [category.categoryId, category.name])} placeholder="Chọn danh mục" buttonClassName="bg-[#faf6ef]/55" />{categoryError && <span className="mt-2 block text-xs text-red-600">{categoryError}</span>}</label>
                    <label><span className="mb-2 block text-xs font-semibold">Màu sắc</span><input maxLength={100} value={form.color} onChange={(event) => updateField("color", event.target.value)} className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/55 px-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></label>
                    <label><span className="mb-2 block text-xs font-semibold">Giá thuê cố định *</span><input required min="1" step="1" type="number" value={form.rentalPrice} onChange={(event) => updateField("rentalPrice", event.target.value)} className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/55 px-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></label>
                    <label><span className="mb-2 block text-xs font-semibold">Tiền cọc *</span><input required min="0" step="1" type="number" value={form.depositAmount} onChange={(event) => updateField("depositAmount", event.target.value)} className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/55 px-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></label>
                    <label className="sm:col-span-2"><span className="mb-2 block text-xs font-semibold">Mô tả</span><textarea rows="3" value={form.description} onChange={(event) => updateField("description", event.target.value)} className="w-full resize-y rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/55 p-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></label>
                    <div className="sm:col-span-2"><span className="mb-2 flex items-center gap-2 text-xs font-semibold"><Image size={15} />Ảnh trang phục</span><label onDragEnter={(event) => { event.preventDefault(); setIsDraggingImages(true) }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy" }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsDraggingImages(false) }} onDrop={dropImages} className={`flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-5 py-5 text-center transition ${isDraggingImages ? "border-[#dc7167] bg-[#fde9e6] ring-2 ring-[#f2a39b]/25" : "border-[#d8c9c0] bg-[#faf6ef]/55 hover:border-[#f2a39b] hover:bg-[#fff7f5]"}`}><ImagePlus size={24} className="text-[#b65e56]" /><span className="mt-2 text-sm font-semibold">{isDraggingImages ? "Thả ảnh vào đây" : "Kéo thả ảnh hoặc chọn từ máy"}</span><span className="mt-1 text-xs text-[#6f6560]">JPG, PNG hoặc WEBP, tối đa 5 ảnh, 5MB mỗi ảnh</span><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={selectImages} className="sr-only" /></label>{imageError && <p className="mt-2 text-xs text-red-600">{imageError}</p>}
                        {imagePreviews.length > 0 && <div className="mt-4"><div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs font-semibold">Đã chọn {imagePreviews.length}/5 ảnh{isEditing ? " · ảnh mới sẽ thay ảnh hiện tại" : ""}</p><button type="button" onClick={() => setImages([])} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#a9544d] hover:underline"><Trash2 size={14} />Bỏ tất cả</button></div><div className="grid grid-cols-3 gap-3 sm:grid-cols-5">{imagePreviews.map((preview) => <div key={`${preview.file.name}-${preview.file.lastModified}`} className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-[#e1d6cf] bg-[#eee6df]"><img src={preview.url} alt={`Xem trước ${preview.file.name}`} className="h-full w-full object-cover" /><button type="button" onClick={() => removeImage(preview.file)} aria-label={`Bỏ ảnh ${preview.file.name}`} className="absolute right-1.5 top-1.5 inline-flex size-7 items-center justify-center rounded-full bg-white/95 text-[#7d4a45] shadow-sm transition hover:bg-[#fbe4e1]"><X size={14} /></button></div>)}</div></div>}
                        {!imagePreviews.length && existingImages.length > 0 && <div className="mt-4"><p className="mb-2 text-xs font-semibold">Ảnh hiện tại</p><div className="grid grid-cols-3 gap-3 sm:grid-cols-5">{existingImages.map((url) => <div key={url} className="aspect-[3/4] overflow-hidden rounded-lg border border-[#e1d6cf] bg-[#eee6df]"><img src={url} alt="Ảnh trang phục hiện tại" className="h-full w-full object-cover" /></div>)}</div><p className="mt-2 text-xs text-[#897d77]">Không chọn ảnh mới thì các ảnh này được giữ nguyên.</p></div>}
                    </div>
                </div>
                </div>
                <footer className="flex shrink-0 justify-end gap-3 border-t border-[#eadfd6] bg-[#fffdf9] px-5 py-4 sm:px-7"><button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-xl border border-[#e1d6cf] px-5 text-sm font-semibold hover:bg-[#faf6ef]">Hủy</button><button type="submit" disabled={saving} className="inline-flex min-h-11 min-w-32 items-center justify-center gap-2 rounded-xl bg-[#f2a39b] px-5 text-sm font-semibold hover:bg-[#ee9188] disabled:cursor-not-allowed disabled:opacity-60">{saving && <LoaderCircle size={17} className="animate-spin" />}{isEditing ? "Lưu thay đổi" : "Thêm trang phục"}</button></footer>
            </form>
        </section>
    </div>
}

export default GarmentFormModal
