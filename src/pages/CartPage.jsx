import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ChevronRight, LogIn, ShoppingBag } from "lucide-react"

import CartItemCard from "../components/cart/CartItemCard.jsx"
import CartRentalPeriod from "../components/cart/CartRentalPeriod.jsx"
import CartSummary from "../components/cart/CartSummary.jsx"
import { getDurationLabel } from "../components/rental/rentalOrderUtils.js"
import {
    calculateRentalTotals,
    getRentalDayCount,
    getVietnamDateOnly as toDateOnly,
} from "../utils/rentalPricing.js"
import {
    getCart,
    removeCartItem,
    updateCartItemQuantity,
    updateCartRentalPeriod,
} from "../services/cartApi.js"

const getApiMessage = (error, fallback) =>
    error.response?.data?.message ?? fallback

function CartPage() {
    const navigate = useNavigate()
    const [cart, setCart] = useState(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [authRequired, setAuthRequired] = useState(false)
    const [reloadKey, setReloadKey] = useState(0)

    const [rentalStartAt, setRentalStartAt] = useState("")
    const [returnDueAt, setReturnDueAt] = useState("")
    const [periodError, setPeriodError] = useState("")
    const [periodSuccess, setPeriodSuccess] = useState(false)
    const [savingPeriod, setSavingPeriod] = useState(false)

    const [busyItemId, setBusyItemId] = useState("")
    const [selectedCartItemIds, setSelectedCartItemIds] = useState([])
    const [actionError, setActionError] = useState("")
    const [continueNotice, setContinueNotice] = useState("")

    useEffect(() => {
        let active = true

        const loadCart = async () => {
            setLoading(true)
            setLoadError("")
            setAuthRequired(false)

            try {
                const data = await getCart()

                if (!active) return

                setCart(data)
                setSelectedCartItemIds(
                    (data?.items ?? []).map((item) => item.cartItemId),
                )
                setRentalStartAt(toDateOnly(data?.rentalStartAt))
                setReturnDueAt(toDateOnly(data?.returnDueAt))
            } catch (error) {
                if (!active) return

                if (error.response?.status === 401) {
                    setAuthRequired(true)
                } else {
                    setLoadError(
                        getApiMessage(error, "Không thể tải giỏ thuê lúc này."),
                    )
                }
            } finally {
                if (active) setLoading(false)
            }
        }

        loadCart()

        return () => {
            active = false
        }
    }, [reloadKey])

    const items = useMemo(() => cart?.items ?? [], [cart])
    const selectedItems = useMemo(
        () => items.filter((item) => selectedCartItemIds.includes(item.cartItemId)),
        [items, selectedCartItemIds],
    )
    const savedStartAt = toDateOnly(cart?.rentalStartAt)
    const savedReturnDueAt = toDateOnly(cart?.returnDueAt)
    const periodDirty =
        rentalStartAt !== savedStartAt || returnDueAt !== savedReturnDueAt

    const rentalDays = getRentalDayCount(cart?.rentalStartAt, cart?.returnDueAt)

    const totals = useMemo(
        () => calculateRentalTotals(selectedItems, rentalDays),
        [selectedItems, rentalDays],
    )



    const refreshCart = async () => {
        const data = await getCart()
        setCart(data)
        return data
    }

    const handleQuantityChange = async (cartItemId, quantity) => {
        if (periodDirty || busyItemId) return

        setBusyItemId(cartItemId)
        setActionError("")
        setContinueNotice("")

        try {
            await updateCartItemQuantity(cartItemId, quantity)
            await refreshCart()
        } catch (error) {
            setActionError(
                getApiMessage(error, "Không thể cập nhật số lượng trang phục."),
            )
        } finally {
            setBusyItemId("")
        }
    }

    const handleRemoveItem = async (cartItemId) => {
        if (busyItemId) return

        setBusyItemId(cartItemId)
        setActionError("")
        setContinueNotice("")

        try {
            await removeCartItem(cartItemId)
            setSelectedCartItemIds((current) =>
                current.filter((id) => id !== cartItemId),
            )
            const data = await refreshCart()

            if ((data?.items?.length ?? 0) === 0) {
                setRentalStartAt(toDateOnly(data?.rentalStartAt))
                setReturnDueAt(toDateOnly(data?.returnDueAt))
            }
        } catch (error) {
            setActionError(
                getApiMessage(error, "Không thể xóa trang phục khỏi giỏ thuê."),
            )
        } finally {
            setBusyItemId("")
        }
    }

    const handlePeriodSubmit = async (event) => {
        event.preventDefault()
        setPeriodError("")
        setPeriodSuccess(false)
        setContinueNotice("")

        if (!rentalStartAt || !returnDueAt) {
            setPeriodError("Vui lòng chọn đầy đủ ngày nhận và trả.")
            return
        }

        const start = new Date(rentalStartAt)
        const end = new Date(returnDueAt)

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime()) ||
            end < start
        ) {
            setPeriodError("Ngày trả không được trước ngày nhận.")
            return
        }

        setSavingPeriod(true)

        try {
            await updateCartRentalPeriod({
                rentalStartAt: rentalStartAt,
                returnDueAt: returnDueAt,
            })

            const data = await refreshCart()
            setRentalStartAt(toDateOnly(data?.rentalStartAt))
            setReturnDueAt(toDateOnly(data?.returnDueAt))
            setPeriodSuccess(true)
        } catch (error) {
            setPeriodError(
                getApiMessage(
                    error,
                    "Không thể cập nhật thời gian thuê cho toàn bộ giỏ.",
                ),
            )
        } finally {
            setSavingPeriod(false)
        }
    }

    const handleContinue = () => {
        setContinueNotice("")
        const params = new URLSearchParams()
        selectedCartItemIds.forEach((cartItemId) => {
            params.append("item", cartItemId)
        })
        navigate(`/checkout?${params.toString()}`)
    }

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:py-12">
                <div className="h-9 w-56 animate-pulse rounded bg-gray-200" />
                <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                    <div className="space-y-5">
                        <div className="h-44 animate-pulse rounded-2xl bg-white" />
                        <div className="h-48 animate-pulse rounded-2xl bg-white" />
                        <div className="h-48 animate-pulse rounded-2xl bg-white" />
                    </div>
                    <div className="h-96 animate-pulse rounded-2xl bg-white" />
                </div>
            </div>
        )
    }

    if (authRequired) {
        return (
            <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fbe2de] text-[#a9544d]">
                    <LogIn size={25} strokeWidth={1.8} />
                </span>
                <h1 className="mt-5 font-serif text-3xl text-brand-text">
                    Đăng nhập để xem giỏ thuê
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">
                    Giỏ thuê được lưu và quản lý bởi tài khoản Customer trên hệ thống.
                </p>
                <Link
                    to="/login"
                    state={{ from: "/cart" }}
                    className="mt-6 rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-[#382d29] transition hover:bg-[#ee9188] active:scale-[0.98]"
                >
                    Đăng nhập
                </Link>
            </div>
        )
    }

    if (loadError) {
        return (
            <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
                <h1 className="font-serif text-3xl text-brand-text">Không thể tải giỏ thuê</h1>
                <p className="mt-3 text-sm text-red-600">{loadError}</p>
                <button
                    type="button"
                    onClick={() => setReloadKey((value) => value + 1)}
                    className="mt-6 rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-[#382d29] transition hover:bg-[#ee9188] active:scale-[0.98]"
                >
                    Thử lại
                </button>
            </div>
        )
    }

    if (!cart || items.length === 0) {
        return (
            <>
                <div className="mx-auto flex min-h-[58vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
                    <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fbe2de] text-[#a9544d]">
                        <ShoppingBag size={28} strokeWidth={1.7} />
                    </span>
                    <h1 className="mt-5 font-serif text-3xl text-brand-text">
                        Giỏ thuê đang trống
                    </h1>
                    <p className="mt-3 text-sm leading-relaxed text-gray-500">
                        Chọn trang phục phù hợp rồi quay lại đây để thiết lập thời gian thuê.
                    </p>
                    <Link
                        to="/garments"
                        className="mt-6 rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-[#382d29] transition hover:bg-[#ee9188] active:scale-[0.98]"
                    >
                        Xem trang phục
                    </Link>
                </div>
            </>
        )
    }

    const durationLabel = getDurationLabel(cart.rentalStartAt, cart.returnDueAt)
    const canContinue = Boolean(
        items.length > 0 &&
            selectedCartItemIds.length > 0 &&
            cart.rentalStartAt &&
            cart.returnDueAt &&
            rentalDays > 0 &&
            !periodDirty &&
            !savingPeriod &&
            !busyItemId,
    )

    return (
        <>
            <div className="mx-auto w-full max-w-[1200px] px-4 pb-20 pt-7 sm:px-6 lg:pb-24 lg:pt-10">
                <nav
                    aria-label="Đường dẫn trang"
                    className="flex items-center gap-1.5 text-xs text-gray-500 sm:text-sm"
                >
                    <Link to="/garments" className="transition hover:text-[#a9544d]">
                        Trang phục
                    </Link>
                    <ChevronRight size={14} />
                    <span className="font-medium text-brand-text">Giỏ thuê</span>
                </nav>

                <div className="mt-5">
                    <h1 className="font-serif text-3xl font-semibold text-brand-text sm:text-4xl">
                        Giỏ thuê của bạn
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500">
                        Kiểm tra trang phục, số lượng và thời gian thuê trước khi tiếp tục đặt thuê.
                    </p>
                </div>

                <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] lg:items-start">
                    <div className="space-y-6">
                        <CartRentalPeriod
                            rentalStartAt={rentalStartAt}
                            returnDueAt={returnDueAt}
                            dirty={periodDirty}
                            saving={savingPeriod}
                            error={periodError}
                            success={periodSuccess}
                            onStartChange={(value) => {
                                setRentalStartAt(value)
                                setPeriodError("")
                                setPeriodSuccess(false)
                                setContinueNotice("")
                            }}
                            onEndChange={(value) => {
                                setReturnDueAt(value)
                                setPeriodError("")
                                setPeriodSuccess(false)
                                setContinueNotice("")
                            }}
                            onSubmit={handlePeriodSubmit}
                        />

                        {actionError && (
                            <p
                                className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
                                role="alert"
                            >
                                {actionError}
                            </p>
                        )}

                        <section aria-labelledby="cart-items-title">
                            <div className="mb-4 flex items-center justify-between gap-4">
                                <h2 id="cart-items-title" className="text-lg font-bold text-brand-text">
                                    Trang phục đã chọn
                                </h2>
                                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                                    <input
                                        type="checkbox"
                                        checked={selectedCartItemIds.length === items.length}
                                        onChange={(event) => setSelectedCartItemIds(
                                            event.target.checked
                                                ? items.map((item) => item.cartItemId)
                                                : [],
                                        )}
                                        className="h-4 w-4 accent-[#d9776f]"
                                    />
                                    Chọn tất cả
                                </label>
                            </div>

                            <div className="space-y-4">
                                {items.map((item) => (
                                    <CartItemCard
                                        key={item.cartItemId}
                                        item={item}
                                        rentalDays={rentalDays}
                                        busy={busyItemId === item.cartItemId}
                                        periodDirty={periodDirty}
                                        selected={selectedCartItemIds.includes(item.cartItemId)}
                                        onSelectedChange={(cartItemId, checked) => {
                                            setSelectedCartItemIds((current) =>
                                                checked
                                                    ? [...current, cartItemId]
                                                    : current.filter((id) => id !== cartItemId),
                                            )
                                        }}
                                        onQuantityChange={handleQuantityChange}
                                        onRemove={handleRemoveItem}
                                    />
                                ))}
                            </div>
                        </section>
                    </div>

                    <CartSummary
                        itemTypeCount={selectedItems.length}
                        totalQuantity={totals.quantity}
                        rentalSubtotal={totals.rental}
                        depositSubtotal={totals.deposit}
                        durationLabel={durationLabel}
                        rentalDays={rentalDays}
                        canContinue={canContinue}
                        onContinue={handleContinue}
                        continueNotice={continueNotice}
                    />
                </div>
            </div>
        </>
    )
}

export default CartPage
