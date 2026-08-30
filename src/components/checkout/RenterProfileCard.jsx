import { useState } from "react"
import { Pencil, UserRound } from "lucide-react"

const validateProfile = ({ fullName, phone, nationalId }) => {
    const errors = {}
    const name = fullName.trim()
    const phoneValue = phone.trim()
    const nationalIdValue = nationalId.trim()

    if (!name || name.length > 150) {
        errors.fullName = "Họ và tên không hợp lệ."
    }

    if (!phoneValue || phoneValue.length > 30) {
        errors.phone = "Số điện thoại không hợp lệ."
    }

    if (!nationalIdValue || nationalIdValue.length > 20) {
        errors.nationalId = "Số CCCD không hợp lệ."
    }

    return errors
}

function RenterProfileCard({ profile, onSave }) {
    const [editing, setEditing] = useState(false)
    const [form, setForm] = useState({
        fullName: profile.fullName ?? "",
        phone: profile.phone ?? "",
        nationalId: profile.nationalId ?? "",
    })
    const [errors, setErrors] = useState({})
    const [requestError, setRequestError] = useState("")
    const [saving, setSaving] = useState(false)

    const cancelEditing = () => {
        setForm({
            fullName: profile.fullName ?? "",
            phone: profile.phone ?? "",
            nationalId: profile.nationalId ?? "",
        })
        setErrors({})
        setRequestError("")
        setEditing(false)
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        const nextErrors = validateProfile(form)
        setErrors(nextErrors)
        setRequestError("")

        if (Object.keys(nextErrors).length > 0) return

        setSaving(true)

        try {
            await onSave({
                fullName: form.fullName.trim(),
                phone: form.phone.trim(),
                nationalId: form.nationalId.trim(),
            })
            setEditing(false)
        } catch (error) {
            setRequestError(
                error.response?.data?.message ??
                "Không thể cập nhật thông tin người thuê.",
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <section className="rounded-2xl border border-[#e9e0d8] bg-brand-surface p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#fbe2de] text-[#a9544d]">
                        <UserRound size={20} strokeWidth={1.8} />
                    </span>
                    <div>
                        <h2 className="text-lg font-bold text-brand-text">
                            Thông tin người thuê
                        </h2>
                        <p className="mt-1 text-xs text-gray-500">
                            Thông tin này lấy từ hồ sơ tài khoản.
                        </p>
                    </div>
                </div>

                {!editing && (
                    <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#a9544d] transition hover:underline active:scale-[0.98]"
                    >
                        <Pencil size={15} />
                        Chỉnh sửa
                    </button>
                )}
            </div>

            {!editing ? (
                <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#e9e0d8] bg-brand-bg p-4">
                        <dt className="text-xs text-gray-500">Họ và tên</dt>
                        <dd className="mt-1 font-semibold text-brand-text">
                            {profile.fullName || "Chưa cập nhật"}
                        </dd>
                    </div>
                    <div className="rounded-xl border border-[#e9e0d8] bg-brand-bg p-4">
                        <dt className="text-xs text-gray-500">Số điện thoại</dt>
                        <dd className="mt-1 font-semibold text-brand-text">
                            {profile.phone || "Chưa cập nhật"}
                        </dd>
                    </div>
                    <div className="rounded-xl border border-[#e9e0d8] bg-brand-bg p-4 sm:col-span-2">
                        <dt className="text-xs text-gray-500">Số CCCD</dt>
                        <dd className="mt-1 font-semibold text-brand-text">
                            {profile.nationalId || "Chưa cập nhật"}
                        </dd>
                        <p className="mt-3 border-t border-[#e9e0d8] pt-3 text-xs leading-relaxed text-gray-500">
                            Số CCCD được sử dụng để đối chiếu danh tính khi nhận trang phục.
                        </p>
                    </div>
                </dl>
            ) : (
                <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
                    <label>
                        <span className="mb-2 block text-xs font-semibold text-gray-600">
                            Họ và tên
                        </span>
                        <input
                            type="text"
                            value={form.fullName}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    fullName: event.target.value,
                                }))
                            }
                            className="min-h-11 w-full rounded-lg border border-[#e9e0d8] bg-brand-bg px-3 text-sm text-brand-text outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25"
                        />
                        {errors.fullName && (
                            <span className="mt-1 block text-xs text-red-600">
                                {errors.fullName}
                            </span>
                        )}
                    </label>

                    <label>
                        <span className="mb-2 block text-xs font-semibold text-gray-600">
                            Số điện thoại
                        </span>
                        <input
                            type="tel"
                            value={form.phone}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    phone: event.target.value,
                                }))
                            }
                            className="min-h-11 w-full rounded-lg border border-[#e9e0d8] bg-brand-bg px-3 text-sm text-brand-text outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25"
                        />
                        {errors.phone && (
                            <span className="mt-1 block text-xs text-red-600">
                                {errors.phone}
                            </span>
                        )}
                    </label>

                    <label className="sm:col-span-2">
                        <span className="mb-2 block text-xs font-semibold text-gray-600">
                            Số CCCD
                        </span>
                        <input
                            type="text"
                            value={form.nationalId}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    nationalId: event.target.value,
                                }))
                            }
                            className="min-h-11 w-full rounded-lg border border-[#e9e0d8] bg-brand-bg px-3 text-sm text-brand-text outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25"
                        />
                        <span className="mt-1 block text-xs leading-relaxed text-gray-500">
                            Chỉ đối chiếu số CCCD đã cung cấp khi nhận trang phục.
                        </span>
                        {errors.nationalId && (
                            <span className="mt-1 block text-xs text-red-600">
                                {errors.nationalId}
                            </span>
                        )}
                    </label>

                    {requestError && (
                        <p className="text-sm text-red-600 sm:col-span-2" role="alert">
                            {requestError}
                        </p>
                    )}

                    <div className="flex justify-end gap-3 sm:col-span-2">
                        <button
                            type="button"
                            onClick={cancelEditing}
                            disabled={saving}
                            className="min-h-10 rounded-lg border border-[#e9e0d8] px-5 text-sm font-semibold text-brand-text transition hover:bg-brand-bg active:scale-[0.98] disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="min-h-10 rounded-lg bg-brand-primary px-5 text-sm font-semibold text-[#382d29] transition hover:bg-[#ee9188] active:scale-[0.98] disabled:opacity-50"
                        >
                            {saving ? "Đang lưu..." : "Lưu thông tin"}
                        </button>
                    </div>
                </form>
            )}
        </section>
    )
}

export default RenterProfileCard
