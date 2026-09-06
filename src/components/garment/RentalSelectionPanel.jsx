import { useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
    AlertCircle,
    CheckCircle2,
    LoaderCircle,
    SearchCheck,
    ShoppingBag,
} from "lucide-react"

import { checkGarmentAvailability } from "../../services/availabilityApi.js"
import {
    addCartItem,
    getCart,
    updateCartRentalPeriod,
} from "../../services/cartApi.js"
import { clearAuthToken, getAuthToken } from "../../services/authStorage.js"

const formatCurrency = (value) => {
    const number = Number(value)

    return Number.isFinite(number)
        ? `${number.toLocaleString("vi-VN")}đ`
        : "Liên hệ"
}

function RentalSelectionPanel({ garment }) {
    const navigate = useNavigate()
    const location = useLocation()
    const sizes = useMemo(
        () =>
            Array.from(
                new Set(
                    garment.rentalUnits
                        ?.map((unit) => unit?.size?.trim())
                        .filter(Boolean) ?? [],
                ),
            ),
        [garment.rentalUnits],
    )

    const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
    const initialSize = searchParams.get("size") || ""
    const initialStart = searchParams.get("rentalStartAt") || ""
    const initialReturn = searchParams.get("returnDueAt") || ""

    const [size, setSize] = useState(() => (sizes.includes(initialSize) ? initialSize : ""))
    const [quantity, setQuantity] = useState(1)
    const [rentalStartAt, setRentalStartAt] = useState(() => initialStart)
    const [returnDueAt, setReturnDueAt] = useState(() => initialReturn)
    const [validationErrors, setValidationErrors] = useState([])
    const [availability, setAvailability] = useState(null)
    const [requestError, setRequestError] = useState("")
    const [checking, setChecking] = useState(false)
    const [addingToCart, setAddingToCart] = useState(false)
    const [cartError, setCartError] = useState("")

    const resetResult = () => {
        setAvailability(null)
        setRequestError("")
        setCartError("")
    }

    const validate = () => {
        const errors = []
        const requestedQuantity = Number(quantity)

        if (!size) errors.push("Vui lòng chọn kích thước.")
        if (!rentalStartAt) errors.push("Vui lòng chọn ngày nhận.")
        if (!returnDueAt) errors.push("Vui lòng chọn ngày trả.")

        if (
            rentalStartAt &&
            returnDueAt &&
            new Date(returnDueAt) < new Date(rentalStartAt)
        ) {
            errors.push("Ngày trả không được trước ngày nhận.")
        }

        if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
            errors.push("Số lượng phải là số nguyên lớn hơn 0.")
        }

        return errors
    }

    const handleCheckAvailability = async (event) => {
        event.preventDefault()

        const errors = validate()
        setValidationErrors(errors)
        setAvailability(null)
        setRequestError("")
        setCartError("")

        if (errors.length > 0) return

        setChecking(true)

        try {
            const result = await checkGarmentAvailability({
                garmentId: garment.garmentId,
                size,
                quantity: Number(quantity),
                rentalStartAt: rentalStartAt,
                returnDueAt: returnDueAt,
            })

            setAvailability(result)
        } catch (error) {
            setRequestError(
                error.response?.data?.message ??
                "Không thể kiểm tra khả dụng lúc này. Vui lòng thử lại.",
            )
        } finally {
            setChecking(false)
        }
    }

    const handleAddToCart = async () => {
        const token = getAuthToken()

        if (!token) {
            navigate("/login", {
                state: {
                    from: `${location.pathname}${location.search}`,
                },
            })
            return
        }

        setAddingToCart(true)
        setCartError("")

        const rentalPeriod = {
            rentalStartAt: rentalStartAt,
            returnDueAt: returnDueAt,
        }

        const cartItem = {
            garmentId: garment.garmentId,
            requestedSize: size,
            quantity: Number(quantity),
        }

        try {
            const cart = await getCart()

            if (cart) {
                await updateCartRentalPeriod(rentalPeriod)
                await addCartItem(cartItem)
            } else {
                await addCartItem(cartItem)
                await updateCartRentalPeriod(rentalPeriod)
            }

            toast.success("Đã thêm trang phục vào giỏ thuê", {
                id: "cart-item-added",
                duration: 3500,
                action: {
                    label: "Xem giỏ thuê",
                    onClick: () => navigate("/cart"),
                },
            })
        } catch (error) {
            if (error.response?.status === 401) {
                clearAuthToken()
                navigate("/login", {
                    state: {
                        from: `${location.pathname}${location.search}`,
                    },
                })
                return
            }

            setCartError(
                error.response?.data?.message ??
                "Không thể thêm trang phục vào giỏ thuê. Vui lòng thử lại.",
            )
        } finally {
            setAddingToCart(false)
        }
    }

    return (
        <form
            onSubmit={handleCheckAvailability}
            className="rounded-2xl border border-gray-100 bg-brand-surface p-5 shadow-[0_12px_34px_rgba(92,70,61,0.07)] sm:p-7"
        >
            <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                    <label className="text-sm font-semibold text-gray-700">
                        Chọn kích thước
                    </label>
                    <span className="text-xs text-gray-400">Theo từng RentalUnit</span>
                </div>

                {sizes.length > 0 ? (
                    <div className="flex flex-wrap gap-2.5">
                        {sizes.map((itemSize) => (
                            <label key={itemSize} className="cursor-pointer">
                                <input
                                    type="radio"
                                    name="garment-size"
                                    value={itemSize}
                                    checked={size === itemSize}
                                    onChange={() => {
                                        setSize(itemSize)
                                        setValidationErrors([])
                                        resetResult()
                                    }}
                                    className="peer sr-only"
                                />
                                <span className="flex min-h-11 min-w-12 items-center justify-center rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-600 transition hover:border-brand-primary peer-checked:border-brand-primary peer-checked:bg-[#fbe2de] peer-checked:text-brand-text peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary/40">
                                    {itemSize}
                                </span>
                            </label>
                        ))}
                    </div>
                ) : (
                    <p className="rounded-lg bg-brand-bg px-4 py-3 text-sm text-gray-500">
                        Chưa có kích thước để lựa chọn.
                    </p>
                )}
            </div>

            <div className="mt-6">
                <span className="mb-3 block text-sm font-semibold text-gray-700">
                    Thời gian thuê
                </span>
                <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Ngày nhận
                        </span>
                        <input
                            type="date"
                            value={rentalStartAt}
                            onChange={(event) => {
                                setRentalStartAt(event.target.value)
                                setValidationErrors([])
                                resetResult()
                            }}
                            className="min-h-11 w-full rounded-lg border border-gray-200 bg-brand-bg px-3 text-sm text-gray-700 outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25"
                        />
                        <span className="mt-1 block text-xs text-gray-400">
                            Nhận từ 08:00
                        </span>
                    </label>

                    <label>
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Ngày trả
                        </span>
                        <input
                            type="date"
                            value={returnDueAt}
                            onChange={(event) => {
                                setReturnDueAt(event.target.value)
                                setValidationErrors([])
                                resetResult()
                            }}
                            className="min-h-11 w-full rounded-lg border border-gray-200 bg-brand-bg px-3 text-sm text-gray-700 outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25"
                        />
                        <span className="mt-1 block text-xs text-gray-400">
                            Trả trước 18:00
                        </span>
                    </label>
                </div>
            </div>

            <label className="mt-5 block max-w-28">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Số lượng
                </span>
                <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(event) => {
                        setQuantity(event.target.value)
                        setValidationErrors([])
                        resetResult()
                    }}
                    className="min-h-11 w-full rounded-lg border border-gray-200 bg-brand-bg px-3 text-sm text-gray-700 outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25"
                />
            </label>

            {validationErrors.length > 0 && (
                <div className="mt-5 space-y-1" role="alert">
                    {validationErrors.map((message) => (
                        <p key={message} className="text-xs font-medium text-red-600">
                            {message}
                        </p>
                    ))}
                </div>
            )}

            <p className="mt-5 text-center text-xs leading-relaxed text-gray-500">
                Hệ thống chỉ kết luận khả dụng sau khi kiểm tra dữ liệu thật từ máy chủ.
            </p>

            <button
                type="submit"
                disabled={checking || sizes.length === 0}
                className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#fbe2de] px-5 text-sm font-semibold text-brand-text transition hover:bg-brand-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
                {checking ? (
                    <LoaderCircle size={18} className="animate-spin" />
                ) : (
                    <SearchCheck size={18} />
                )}
                {checking ? "Đang kiểm tra..." : "Kiểm tra khả dụng"}
            </button>

            {requestError && (
                <div className="mt-5 flex gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700" role="alert">
                    <AlertCircle size={19} className="mt-0.5 shrink-0" />
                    <span>{requestError}</span>
                </div>
            )}

            {availability?.available && (
                <div className="mt-5 rounded-lg border border-brand-mint bg-[#eef5f1] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-green-800">
                        <CheckCircle2 size={19} className="text-green-600" />
                        Có đủ trang phục trong khoảng thời gian này
                    </div>

                    <dl className="mt-4 space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between gap-4">
                            <dt>Kích thước</dt>
                            <dd className="font-medium text-brand-text">{size}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt>Ngày nhận</dt>
                            <dd className="text-right font-medium text-brand-text">
                                {rentalStartAt}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt>Ngày trả</dt>
                            <dd className="text-right font-medium text-brand-text">
                                {returnDueAt}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt>Số lượng yêu cầu</dt>
                            <dd className="font-medium text-brand-text">
                                {availability.requestedQuantity}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt>Số lượng khả dụng</dt>
                            <dd className="font-medium text-brand-text">
                                {availability.availableUnitCount}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4 border-t border-brand-mint pt-3">
                            <dt>Giá thuê/ngày</dt>
                            <dd className="font-semibold text-brand-text">
                                {formatCurrency(garment.rentalPrice)}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt>Tiền cọc</dt>
                            <dd className="font-semibold text-brand-text">
                                {formatCurrency(garment.depositAmount)}
                            </dd>
                        </div>
                    </dl>

                    <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={addingToCart}
                        className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-primary px-5 text-sm font-semibold text-[#382d29] transition hover:bg-[#ee9188] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {addingToCart ? (
                            <LoaderCircle size={18} className="animate-spin" />
                        ) : (
                            <ShoppingBag size={18} />
                        )}
                        {addingToCart ? "Đang thêm..." : "Thêm vào giỏ thuê"}
                    </button>

                    {cartError && (
                        <p
                            className="mt-3 text-xs leading-relaxed text-red-700"
                            role="alert"
                        >
                            {cartError}
                        </p>
                    )}

                    <p className="mt-3 text-xs leading-relaxed text-gray-600">
                        Thêm vào giỏ chưa giữ RentalUnit. Hệ thống sẽ kiểm tra lại
                        khi tạo đơn thuê.
                    </p>
                </div>
            )}

            {availability && !availability.available && (
                <div className="mt-5 rounded-lg border border-red-100 bg-red-50 p-4" role="status">
                    <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
                        <AlertCircle size={19} className="text-red-500" />
                        Không đủ trang phục khả dụng
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-red-600">
                        Hãy chọn kích thước, số lượng hoặc khoảng thời gian khác rồi kiểm tra lại.
                    </p>
                </div>
            )}
        </form>
    )
}

export default RentalSelectionPanel
