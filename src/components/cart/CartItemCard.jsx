import { Link } from "react-router-dom"
import { Minus, Plus, Trash2 } from "lucide-react"
import { calculateRentalLineTotal } from "../../utils/rentalPricing.js"

const formatCurrency = (value) => {
    const number = Number(value)

    return Number.isFinite(number)
        ? `${number.toLocaleString("vi-VN")}đ`
        : "Liên hệ"
}

const getFirstImage = (imageUrls) => {
    if (Array.isArray(imageUrls)) return imageUrls.find(Boolean) || ""
    if (typeof imageUrls !== "string" || !imageUrls.trim()) return ""

    const value = imageUrls.trim()

    if (value.startsWith("[")) {
        try {
            const parsed = JSON.parse(value)
            return Array.isArray(parsed) ? parsed.find(Boolean) || "" : value
        } catch {
            return value
        }
    }

    return value
}

function CartItemCard({
    item,
    rentalDays,
    busy,
    periodDirty,
    selected,
    onSelectedChange,
    onQuantityChange,
    onRemove,
}) {
    const garment = item.garment ?? {}
    const imageUrl = getFirstImage(garment.imageUrls)
    const quantity = Number(item.quantity)
    const rentalLineTotal = calculateRentalLineTotal(garment.rentalPrice, quantity, rentalDays)
    const depositLineTotal = Number(garment.depositAmount) * quantity
    const controlsDisabled = busy || periodDirty

    return (
        <article className={`rounded-2xl border bg-brand-surface p-4 transition ${
            selected ? "border-[#efa39b]" : "border-gray-100"
        }`}>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-brand-text">
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => onSelectedChange(
                        item.cartItemId,
                        event.target.checked,
                    )}
                    className="h-4 w-4 accent-[#d9776f]"
                />
                Chọn để đặt thuê
            </label>

            <div className="mt-3 grid gap-4 sm:grid-cols-[112px_1fr] sm:gap-6">
                <Link
                to={`/garments/${garment.garmentId}`}
                className="aspect-[3/4] w-28 overflow-hidden rounded-xl bg-[#eee6df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={garment.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <span className="flex h-full items-center justify-center px-3 text-center text-xs text-gray-400">
                        Chưa có ảnh
                    </span>
                )}
                </Link>

                <div className="min-w-0">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <Link
                            to={`/garments/${garment.garmentId}`}
                            className="font-semibold text-brand-text transition hover:text-[#a9544d]"
                        >
                            {garment.name}
                        </Link>
                        <p className="mt-1 text-xs text-gray-500">
                            Kích thước: {item.requestedSize}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                            Giá thuê: {formatCurrency(garment.rentalPrice)}/ngày
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => onRemove(item.cartItemId)}
                        disabled={busy}
                        aria-label={`Xóa ${garment.name} khỏi giỏ thuê`}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Trash2 size={18} strokeWidth={1.8} />
                    </button>
                </div>

                <div className="mt-5 grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-[auto_1fr] sm:items-end">
                    <div>
                        <p className="mb-2 text-xs text-gray-500">Số lượng</p>
                        <div className="inline-flex items-center rounded-lg border border-gray-200 bg-brand-bg">
                            <button
                                type="button"
                                onClick={() => onQuantityChange(item.cartItemId, quantity - 1)}
                                disabled={controlsDisabled || quantity <= 1}
                                aria-label={`Giảm số lượng ${garment.name}`}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-l-lg text-gray-600 transition hover:bg-[#fbe2de] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Minus size={16} />
                            </button>
                            <span className="min-w-10 px-2 text-center text-sm font-semibold text-brand-text">
                                {quantity}
                            </span>
                            <button
                                type="button"
                                onClick={() => onQuantityChange(item.cartItemId, quantity + 1)}
                                disabled={controlsDisabled}
                                aria-label={`Tăng số lượng ${garment.name}`}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-r-lg text-gray-600 transition hover:bg-[#fbe2de] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    <dl className="grid gap-2 text-sm sm:justify-self-end sm:text-right">
                        <div>
                            <dt className="text-xs text-gray-500">
                                Tiền thuê{rentalDays > 0 ? ` (${rentalDays} ngày × ${quantity})` : ""}
                            </dt>
                            <dd className="mt-0.5 font-semibold text-brand-text">
                                {rentalDays > 0 ? formatCurrency(rentalLineTotal) : "Chọn ngày thuê"}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-gray-500">Tiền cọc</dt>
                            <dd className="mt-0.5 font-medium text-brand-text">
                                {formatCurrency(depositLineTotal)}
                            </dd>
                        </div>
                    </dl>
                </div>

                {periodDirty && (
                    <p className="mt-3 text-xs text-amber-700">
                        Lưu thời gian thuê mới trước khi thay đổi số lượng.
                    </p>
                )}
                </div>
            </div>
        </article>
    )
}

export default CartItemCard
