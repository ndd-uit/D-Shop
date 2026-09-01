import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
    CalendarClock,
    ChevronRight,
    Info,
    LoaderCircle,
    PackageCheck,
} from "lucide-react"

import CheckoutSuccessDialog from "../components/checkout/CheckoutSuccessDialog.jsx"
import RenterProfileCard from "../components/checkout/RenterProfileCard.jsx"
import StoreLocationCard from "../components/common/StoreLocationCard.jsx"
import {
    formatCurrency,
    formatDate,
    getDurationLabel,
    getFirstImage,
} from "../components/rental/rentalOrderUtils.js"
import { STORE_INFO } from "../constants/store.js"
import { getCart } from "../services/cartApi.js"
import { createRentalPayment } from "../services/paymentApi.js"
import { createRentalOrder } from "../services/rentalApi.js"
import { getMyProfile, updateMyProfile } from "../services/userApi.js"
import { startPaymentCheckout } from "../utils/paymentCheckout.js"

function CheckoutPage() {
    const [searchParams] = useSearchParams()
    const selectedCartItemIds = useMemo(
        () => searchParams.getAll("item"),
        [searchParams],
    )
    const [cart, setCart] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [authRequired, setAuthRequired] = useState(false)

    const [formError, setFormError] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [createResult, setCreateResult] = useState(null)

    const [paying, setPaying] = useState(false)
    const [paymentError, setPaymentError] = useState("")

    useEffect(() => {
        let active = true

        const loadCheckout = async () => {
            try {
                const [cartData, profileData] = await Promise.all([
                    getCart(),
                    getMyProfile(),
                ])

                if (!active) return
                setCart(cartData)
                setProfile(profileData)
            } catch (error) {
                if (!active) return

                if (error.response?.status === 401) {
                    setAuthRequired(true)
                } else {
                    setLoadError(
                        error.response?.data?.message ??
                        "Không thể tải thông tin xác nhận đặt thuê.",
                    )
                }
            } finally {
                if (active) setLoading(false)
            }
        }

        loadCheckout()

        return () => {
            active = false
        }
    }, [])

    const allItems = useMemo(() => cart?.items ?? [], [cart])
    const items = useMemo(
        () => allItems.filter((item) =>
            selectedCartItemIds.includes(item.cartItemId),
        ),
        [allItems, selectedCartItemIds],
    )
    const selectionValid = Boolean(
        selectedCartItemIds.length > 0 &&
        new Set(selectedCartItemIds).size === selectedCartItemIds.length &&
        items.length === selectedCartItemIds.length,
    )
    const totals = useMemo(
        () =>
            items.reduce(
                (result, item) => {
                    const quantity = Number(item.quantity) || 0
                    result.quantity += quantity
                    result.rental +=
                        (Number(item.garment?.rentalPrice) || 0) * quantity
                    result.deposit +=
                        (Number(item.garment?.depositAmount) || 0) * quantity
                    return result
                },
                { quantity: 0, rental: 0, deposit: 0 },
            ),
        [items],
    )


    const profileComplete = Boolean(
        profile?.fullName?.trim() &&
        profile?.phone?.trim() &&
        profile?.nationalId?.trim(),
    )
    const cartReady = Boolean(
        selectionValid &&
        items.length > 0 &&
        cart?.rentalStartAt &&
        cart?.returnDueAt,
    )
    const canCreateOrder = Boolean(
        profileComplete &&
        cartReady &&
        !submitting,
    )

    const handleProfileSave = async (data) => {
        const updatedProfile = await updateMyProfile(data)
        setProfile(updatedProfile)
        setFormError("")
    }

    const handleCreateOrder = async () => {
        setFormError("")

        if (!profileComplete) {
            setFormError("Vui lòng cập nhật đầy đủ họ tên, số điện thoại và số CCCD.")
            return
        }

        setSubmitting(true)

        try {
            const result = await createRentalOrder({
                pickupInfo: STORE_INFO.pickupInfo,
                returnInfo: STORE_INFO.returnInfo,
                selectedCartItemIds,
            })
            setCreateResult(result)
        } catch (error) {
            setFormError(
                error.response?.data?.message ?? "Không thể tạo đơn thuê lúc này.",
            )
        } finally {
            setSubmitting(false)
        }
    }

    const handlePayNow = async () => {
        if (!createResult?.order?.orderId) return

        setPaying(true)
        setPaymentError("")

        try {
            const result = await createRentalPayment(createResult.order.orderId)

            if (startPaymentCheckout(result)) {
                return
            }

            if (result.payment?.status === "SUCCEEDED") {
                window.location.assign("/my-rentals")
                return
            }

            setPaymentError("Cổng thanh toán chưa trả về đường dẫn thanh toán.")
        } catch (error) {
            setPaymentError(
                error.response?.data?.message ??
                "Không thể khởi tạo giao dịch thanh toán.",
            )
        } finally {
            setPaying(false)
        }
    }

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6">
                <div className="h-10 w-64 animate-pulse rounded bg-gray-200" />
                <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
                    <div className="space-y-6">
                        <div className="h-64 animate-pulse rounded-2xl bg-white" />
                        <div className="h-44 animate-pulse rounded-2xl bg-white" />
                        <div className="h-72 animate-pulse rounded-2xl bg-white" />
                    </div>
                    <div className="h-[420px] animate-pulse rounded-2xl bg-white" />
                </div>
            </div>
        )
    }

    if (authRequired || loadError || !cart || !profile || !cartReady) {
        const title = authRequired
            ? "Đăng nhập để xác nhận đặt thuê"
            : "Chưa thể xác nhận đặt thuê"
        const message = authRequired
            ? "Bạn cần đăng nhập bằng tài khoản Customer để tiếp tục."
            : loadError || "Vui lòng quay lại giỏ thuê và chọn ít nhất một trang phục."

        return (
            <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
                <PackageCheck size={32} className="text-[#a9544d]" />
                <h1 className="mt-5 font-serif text-3xl text-brand-text">{title}</h1>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">{message}</p>
                <Link
                    to={authRequired ? "/login" : "/cart"}
                    className="mt-6 rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-[#382d29] transition hover:bg-[#ee9188] active:scale-[0.98]"
                >
                    {authRequired ? "Đăng nhập" : "Quay lại giỏ thuê"}
                </Link>
            </div>
        )
    }

    const durationLabel = getDurationLabel(
        cart.rentalStartAt,
        cart.returnDueAt,
    )
    const profileKey = [
        profile.userId,
        profile.fullName,
        profile.phone,
        profile.nationalId,
    ].join("-")

    return (
        <>
            <div className="mx-auto w-full max-w-[1200px] px-4 pb-20 pt-7 sm:px-6 lg:pb-24 lg:pt-10">
                <nav
                    aria-label="Đường dẫn trang"
                    className="flex items-center gap-1.5 text-xs text-gray-500 sm:text-sm"
                >
                    <Link to="/cart" className="transition hover:text-[#a9544d]">
                        Giỏ thuê
                    </Link>
                    <ChevronRight size={14} />
                    <span className="font-medium text-brand-text">Xác nhận đặt thuê</span>
                </nav>

                <div className="mt-5">
                    <h1 className="font-serif text-3xl font-semibold text-brand-text sm:text-4xl">
                        Xác nhận đặt thuê
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500">
                        Kiểm tra thông tin người thuê, thời gian và chi phí trước khi tạo đơn.
                    </p>
                </div>

                <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] lg:items-start">
                    <div className="space-y-6">
                        <RenterProfileCard
                            key={profileKey}
                            profile={profile}
                            onSave={handleProfileSave}
                        />

                        <section className="rounded-2xl border border-[#e9e0d8] bg-brand-surface p-5 sm:p-7">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#fbe2de] text-[#a9544d]">
                                        <CalendarClock size={20} strokeWidth={1.8} />
                                    </span>
                                    <h2 className="text-lg font-bold text-brand-text">
                                        Thời gian thuê
                                    </h2>
                                </div>
                                <Link
                                    to="/cart"
                                    className="text-sm font-semibold text-[#a9544d] transition hover:underline"
                                >
                                    Thay đổi
                                </Link>
                            </div>

                            <div className="mt-5 grid gap-4 rounded-xl border border-[#e9e0d8] bg-brand-bg p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                                <div>
                                    <p className="text-xs text-gray-500">Ngày nhận</p>
                                    <p className="mt-1 font-semibold text-brand-text">
                                        {formatDate(cart.rentalStartAt)}
                                    </p>
                                    <p className="mt-0.5 text-xs text-gray-400">Nhận từ 08:00</p>
                                </div>
                                <span className="text-center text-xs font-semibold text-[#a9544d]">
                                    {durationLabel}
                                </span>
                                <div className="sm:text-right">
                                    <p className="text-xs text-gray-500">Ngày trả</p>
                                    <p className="mt-1 font-semibold text-brand-text">
                                        {formatDate(cart.returnDueAt)}
                                    </p>
                                    <p className="mt-0.5 text-xs text-gray-400">Trả trước 18:00</p>
                                </div>
                            </div>
                        </section>

                        <StoreLocationCard />

                        <section className="rounded-2xl border border-[#e9e0d8] bg-brand-surface p-5 sm:p-7">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#fbe2de] text-[#a9544d]">
                                    <PackageCheck size={20} strokeWidth={1.8} />
                                </span>
                                <h2 className="text-lg font-bold text-brand-text">
                                    Trang phục thuê
                                </h2>
                            </div>

                            <div className="mt-5 space-y-3">
                                {items.map((item) => {
                                    const garment = item.garment ?? {}
                                    const quantity = Number(item.quantity) || 0
                                    const imageUrl = getFirstImage(garment.imageUrls)

                                    return (
                                        <article
                                            key={item.cartItemId}
                                            className="grid gap-4 rounded-xl border border-[#e9e0d8] bg-brand-bg p-4 sm:grid-cols-[72px_1fr_auto] sm:items-center"
                                        >
                                            <div className="aspect-[3/4] w-[72px] overflow-hidden rounded-lg bg-[#eee6df]">
                                                {imageUrl ? (
                                                    <img
                                                        src={imageUrl}
                                                        alt={garment.name}
                                                        loading="lazy"
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="flex h-full items-center justify-center px-2 text-center text-[10px] text-gray-400">
                                                        Chưa có ảnh
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-brand-text">
                                                    {garment.name}
                                                </h3>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    Kích thước: {item.requestedSize}, số lượng: {quantity}
                                                </p>
                                                <p className="mt-2 text-xs text-gray-500">
                                                    Giá thuê cố định: {formatCurrency(garment.rentalPrice)}
                                                </p>
                                            </div>
                                            <dl className="space-y-2 text-sm sm:text-right">
                                                <div>
                                                    <dt className="text-xs text-gray-500">Tiền thuê</dt>
                                                    <dd className="font-semibold text-brand-text">
                                                        {formatCurrency(Number(garment.rentalPrice) * quantity)}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="text-xs text-gray-500">Tiền cọc</dt>
                                                    <dd className="font-medium text-brand-text">
                                                        {formatCurrency(Number(garment.depositAmount) * quantity)}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </article>
                                    )
                                })}
                            </div>
                        </section>
                    </div>

                    <aside className="rounded-2xl border border-[#e9e0d8] bg-brand-surface p-5 lg:sticky lg:top-[96px] lg:p-6">
                        <h2 className="text-lg font-bold text-brand-text">
                            Tóm tắt đặt thuê
                        </h2>

                        <dl className="mt-6 space-y-3 border-b border-[#e9e0d8] pb-5 text-sm">
                            <div className="flex justify-between gap-4">
                                <dt className="text-gray-500">Số loại trang phục</dt>
                                <dd className="font-medium text-brand-text">{items.length}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-gray-500">Tổng số lượng</dt>
                                <dd className="font-medium text-brand-text">{totals.quantity}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-gray-500">Thời lượng</dt>
                                <dd className="text-right font-medium text-brand-text">
                                    {durationLabel}
                                </dd>
                            </div>
                        </dl>

                        <dl className="space-y-3 border-b border-[#e9e0d8] py-5 text-sm">
                            <div className="flex justify-between gap-4">
                                <dt className="text-gray-500">Tiền thuê</dt>
                                <dd className="font-semibold text-brand-text">
                                    {formatCurrency(totals.rental)}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-gray-500">Tiền cọc yêu cầu</dt>
                                <dd className="font-semibold text-brand-text">
                                    {formatCurrency(totals.deposit)}
                                </dd>
                            </div>
                        </dl>

                        <div className="py-5">
                            <p className="text-sm font-semibold text-brand-text">
                                Tiền cần thanh toán ngay
                            </p>
                            <p className="mt-1 text-right text-2xl font-bold text-[#b85f57]">
                                {formatCurrency(totals.rental)}
                            </p>
                            <p className="mt-2 text-right text-xs leading-relaxed text-gray-500">
                                Tiền thuê là giá cố định, không nhân theo thời lượng.
                            </p>
                        </div>

                        <div className="flex gap-2 rounded-xl bg-brand-bg p-3 text-xs leading-relaxed text-gray-600">
                            <Info size={16} className="mt-0.5 shrink-0 text-[#a9544d]" />
                            <span>
                                Tiền cọc sẽ được thu khi nhận đồ. Tạo đơn sẽ kiểm tra
                                availability lần cuối và tạo giữ chỗ tạm thời.
                            </span>
                        </div>

                        {formError && (
                            <p
                                className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
                                role="alert"
                            >
                                {formError}
                            </p>
                        )}

                        {!profileComplete && (
                            <p className="mt-4 text-xs leading-relaxed text-amber-700">
                                Cập nhật đủ họ tên, số điện thoại và số CCCD để tiếp tục.
                            </p>
                        )}

                        <button
                            type="button"
                            onClick={handleCreateOrder}
                            disabled={!canCreateOrder}
                            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 text-sm font-semibold text-[#382d29] transition hover:bg-[#ee9188] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {submitting && <LoaderCircle size={18} className="animate-spin" />}
                            {submitting ? "Đang tạo đơn..." : "Xác nhận đặt thuê"}
                        </button>
                    </aside>
                </div>
            </div>

            {createResult && (
                <CheckoutSuccessDialog
                    result={createResult}
                    paying={paying}
                    paymentError={paymentError}
                    onPayNow={handlePayNow}
                />
            )}
        </>
    )
}

export default CheckoutPage
