import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
    AlertCircle,
    CheckCircle2,
    Info,
    LoaderCircle,
    LogOut,
    ReceiptText,
    ShoppingBag,
    User,
} from "lucide-react"

import { clearAuthToken } from "../services/authStorage.js"
import { getMyProfile, updateMyProfile } from "../services/userApi.js"

const getApiMessage = (error, fallback) =>
    error.response?.data?.message || fallback

const getInitials = (name) => {
    if (!name) return "DS"
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function ProfilePage() {
    const navigate = useNavigate()
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [authRequired, setAuthRequired] = useState(false)
    const [loadError, setLoadError] = useState("")

    const [form, setForm] = useState({
        fullName: "",
        phone: "",
        nationalId: "",
    })
    const [formErrors, setFormErrors] = useState({})
    const [saving, setSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState("")
    const [saveError, setSaveError] = useState("")

    useEffect(() => {
        let active = true

        const loadProfile = async () => {
            setLoading(true)
            setLoadError("")
            try {
                const data = await getMyProfile()
                if (!active) return
                setProfile(data)
                setForm({
                    fullName: data.fullName ?? "",
                    phone: data.phone ?? "",
                    nationalId: data.nationalId ?? "",
                })
            } catch (error) {
                if (!active) return
                if (error.response?.status === 401) {
                    setAuthRequired(true)
                } else {
                    setLoadError(
                        getApiMessage(error, "Không thể tải thông tin hồ sơ cá nhân."),
                    )
                }
            } finally {
                if (active) setLoading(false)
            }
        }

        loadProfile()

        return () => {
            active = false
        }
    }, [])

    const handleLogout = () => {
        clearAuthToken()
        navigate("/login", { replace: true })
    }

    const validate = () => {
        const errors = {}
        const name = form.fullName.trim()
        const phone = form.phone.trim()
        const nationalId = form.nationalId.trim()

        if (!name) {
            errors.fullName = "Họ và tên không được để trống."
        } else if (name.length > 150) {
            errors.fullName = "Họ và tên tối đa 150 ký tự."
        }

        if (phone && phone.length > 30) {
            errors.phone = "Số điện thoại tối đa 30 ký tự."
        }

        if (nationalId && nationalId.length > 20) {
            errors.nationalId = "Số CCCD tối đa 20 ký tự."
        }

        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleResetForm = () => {
        if (!profile) return
        setForm({
            fullName: profile.fullName ?? "",
            phone: profile.phone ?? "",
            nationalId: profile.nationalId ?? "",
        })
        setFormErrors({})
        setSaveSuccess("")
        setSaveError("")
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        setSaveSuccess("")
        setSaveError("")

        if (!validate()) return

        setSaving(true)

        try {
            const updated = await updateMyProfile({
                fullName: form.fullName.trim(),
                phone: form.phone.trim(),
                nationalId: form.nationalId.trim(),
            })

            setProfile(updated)
            setSaveSuccess("Đã cập nhật thông tin cá nhân thành công.")
        } catch (error) {
            setSaveError(
                getApiMessage(error, "Không thể lưu thay đổi thông tin cá nhân."),
            )
        } finally {
            setSaving(false)
        }
    }

    const initials = useMemo(
        () => getInitials(profile?.fullName),
        [profile?.fullName],
    )

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6">
                <div className="h-9 w-48 animate-pulse rounded-lg bg-gray-200" />
                <div className="mt-8 grid gap-8 md:grid-cols-[280px_1fr]">
                    <div className="h-80 animate-pulse rounded-2xl bg-white" />
                    <div className="space-y-6">
                        <div className="h-96 animate-pulse rounded-2xl bg-white" />
                        <div className="h-32 animate-pulse rounded-2xl bg-white" />
                    </div>
                </div>
            </div>
        )
    }

    if (authRequired) {
        return (
            <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fbe2de] text-[#a9544d]">
                    <User size={26} strokeWidth={1.8} />
                </span>
                <h1 className="mt-5 font-serif text-3xl text-brand-text">
                    Đăng nhập để xem hồ sơ
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">
                    Thông tin hồ sơ cá nhân được bảo vệ theo tài khoản Customer.
                </p>
                <Link
                    to="/login"
                    state={{ from: "/profile" }}
                    className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-brand-primary px-6 text-sm font-semibold text-[#382d29] transition hover:bg-[#ee9188] active:scale-[0.98]"
                >
                    Đăng nhập
                </Link>
            </div>
        )
    }

    return (
        <>
            <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 md:py-12">
                <div className="mb-8">
                    <h1 className="font-serif text-3xl font-semibold text-brand-text sm:text-4xl">
                        Hồ sơ cá nhân
                    </h1>
                </div>

                {loadError && (
                    <div
                        className="mb-8 flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-5"
                        role="alert"
                    >
                        <p className="text-sm text-red-700">{loadError}</p>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="text-sm font-semibold text-red-700 hover:underline"
                        >
                            Thử lại
                        </button>
                    </div>
                )}

                <div className="flex flex-col gap-8 md:flex-row lg:gap-12">
                    {/* Sidebar */}
                    <aside className="w-full shrink-0 md:w-64 lg:w-72">
                        {/* Summary Card */}
                        <div className="mb-6 rounded-2xl border border-[#e9e0d8] bg-brand-surface p-6 text-center shadow-[0_20px_40px_-15px_rgba(139,77,71,0.05)]">
                            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border border-[#f2a39b] bg-[#fbe2de] font-serif text-3xl font-semibold text-[#713732]">
                                {initials}
                            </div>
                            <h2 className="text-lg font-semibold text-brand-text">
                                {profile?.fullName || "Chưa cập nhật tên"}
                            </h2>
                            <p className="mt-1 text-xs text-gray-500">
                                {profile?.email || "Email"}
                            </p>
                        </div>

                        {/* Sidebar Nav */}
                        <nav aria-label="Menu cá nhân" className="flex flex-col space-y-1.5">
                            <span className="flex items-center gap-3 rounded-xl bg-[#fbe2de] px-4 py-3 text-sm font-semibold text-[#713732]">
                                <User size={19} strokeWidth={2} />
                                Hồ sơ cá nhân
                            </span>

                            <Link
                                to="/my-rentals"
                                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-[#eef5f1] hover:text-brand-text"
                            >
                                <ReceiptText size={19} strokeWidth={1.8} />
                                Đơn thuê của tôi
                            </Link>

                            <Link
                                to="/cart"
                                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-[#eef5f1] hover:text-brand-text"
                            >
                                <ShoppingBag size={19} strokeWidth={1.8} />
                                Giỏ thuê
                            </Link>

                            <div className="my-2 h-px bg-[#e9e0d8]" />

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700"
                            >
                                <LogOut size={19} strokeWidth={1.8} />
                                Đăng xuất
                            </button>
                        </nav>
                    </aside>

                    {/* Content Area */}
                    <div className="flex-1 space-y-8">
                        {/* Personal Info Form */}
                        <section className="rounded-2xl border border-[#e9e0d8] bg-brand-surface p-6 shadow-[0_20px_40px_-15px_rgba(139,77,71,0.05)] md:p-8">
                            <h2 className="text-xl font-bold text-brand-text sm:text-2xl">
                                Thông tin cá nhân
                            </h2>

                            {saveSuccess && (
                                <div className="mt-4 flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
                                    <CheckCircle2 size={18} className="shrink-0 text-green-600" />
                                    <span>{saveSuccess}</span>
                                </div>
                            )}

                            {saveError && (
                                <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                                    <AlertCircle size={18} className="shrink-0" />
                                    <span>{saveError}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                                <div className="grid gap-6 md:grid-cols-2">
                                    {/* Name */}
                                    <div className="space-y-2">
                                        <label
                                            htmlFor="profile-fullName"
                                            className="block text-xs font-semibold uppercase tracking-wider text-gray-600"
                                        >
                                            Họ và tên
                                        </label>
                                        <input
                                            id="profile-fullName"
                                            type="text"
                                            value={form.fullName}
                                            onChange={(event) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    fullName: event.target.value,
                                                }))
                                            }
                                            className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25"
                                        />
                                        {formErrors.fullName && (
                                            <p className="text-xs text-red-600">
                                                {formErrors.fullName}
                                            </p>
                                        )}
                                    </div>

                                    {/* Email (Readonly) */}
                                    <div className="space-y-2">
                                        <label
                                            htmlFor="profile-email"
                                            className="block text-xs font-semibold uppercase tracking-wider text-gray-600"
                                        >
                                            Email
                                        </label>
                                        <input
                                            id="profile-email"
                                            type="email"
                                            value={profile?.email || ""}
                                            readOnly
                                            disabled
                                            className="min-h-11 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-[#f7f2ed] px-4 py-2.5 text-sm text-gray-500 outline-none"
                                        />
                                    </div>

                                    {/* Phone */}
                                    <div className="space-y-2">
                                        <label
                                            htmlFor="profile-phone"
                                            className="block text-xs font-semibold uppercase tracking-wider text-gray-600"
                                        >
                                            Số điện thoại
                                        </label>
                                        <input
                                            id="profile-phone"
                                            type="tel"
                                            value={form.phone}
                                            onChange={(event) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    phone: event.target.value,
                                                }))
                                            }
                                            placeholder="090 123 4567"
                                            className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25"
                                        />
                                        {formErrors.phone && (
                                            <p className="text-xs text-red-600">
                                                {formErrors.phone}
                                            </p>
                                        )}
                                    </div>

                                    {/* ID Card */}
                                    <div className="space-y-2">
                                        <label
                                            htmlFor="profile-nationalId"
                                            className="block text-xs font-semibold uppercase tracking-wider text-gray-600"
                                        >
                                            Số CCCD
                                        </label>
                                        <input
                                            id="profile-nationalId"
                                            type="text"
                                            value={form.nationalId}
                                            onChange={(event) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    nationalId: event.target.value,
                                                }))
                                            }
                                            placeholder="031092001234"
                                            className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25"
                                        />
                                        {formErrors.nationalId && (
                                            <p className="text-xs text-red-600">
                                                {formErrors.nationalId}
                                            </p>
                                        )}
                                        <p className="flex items-start gap-1.5 text-xs text-gray-500">
                                            <Info size={15} className="mt-0.5 shrink-0 text-gray-400" />
                                            <span>
                                                Số CCCD được sử dụng để đối chiếu khi nhận trang phục.
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col-reverse justify-end gap-3 border-t border-[#e9e0d8] pt-6 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={handleResetForm}
                                        disabled={saving}
                                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#e9e0d8] px-6 text-sm font-semibold text-brand-text transition hover:bg-brand-bg active:scale-[0.98] disabled:opacity-50"
                                    >
                                        Hủy thay đổi
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-primary px-6 text-sm font-semibold text-[#382d29] transition hover:bg-[#ee9188] active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {saving && <LoaderCircle size={18} className="animate-spin" />}
                                        {saving ? "Đang lưu..." : "Lưu thay đổi"}
                                    </button>
                                </div>
                            </form>
                        </section>

                    </div>
                </div>
            </main>
        </>
    )
}

export default ProfilePage
