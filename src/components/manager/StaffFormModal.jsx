import { Eye, EyeOff, LoaderCircle, ShieldCheck, X } from "lucide-react"
import { useState } from "react"

function StaffFormModal({ staff, saving, error, onClose, onSubmit }) {
    const isEditing = Boolean(staff)
    const [showPassword, setShowPassword] = useState(false)
    const [form, setForm] = useState(() => ({
        fullName: staff?.fullName || "",
        email: staff?.email || "",
        phone: staff?.phone || "",
        password: "",
    }))

    const updateField = (name, value) => setForm((current) => ({ ...current, [name]: value }))
    const submit = (event) => {
        event.preventDefault()
        const payload = {
            fullName: form.fullName.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim() || null,
        }
        if (!isEditing) payload.password = form.password
        onSubmit(payload)
    }

    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#453c38]/35 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}>
        <section role="dialog" aria-modal="true" aria-labelledby="staff-form-title" className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#eadfd6] bg-[#fffdf9] shadow-[0_24px_80px_rgba(69,60,56,.2)]">
            <header className="flex shrink-0 items-start justify-between border-b border-[#eadfd6] px-5 py-4 sm:px-6"><div><h2 id="staff-form-title" className="font-serif text-2xl font-semibold">{isEditing ? "Cập nhật nhân viên" : "Thêm nhân viên"}</h2><p className="mt-1 text-xs text-[#897d77]">Quản lý thông tin tài khoản nhân viên cho thuê.</p></div><button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-2 hover:bg-[#faf6ef]" aria-label="Đóng"><X size={20} /></button></header>
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
                    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                    <div className="flex items-start gap-3 rounded-xl border border-[#cfe0d8] bg-[#edf6f1] p-4"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#4f7f6f]" /><div><p className="text-sm font-semibold text-[#356353]">Vai trò: Nhân viên cho thuê</p><p className="mt-1 text-xs leading-5 text-[#587268]">Vai trò và trạng thái tài khoản được hệ thống quản lý, không nhận từ biểu mẫu này.</p></div></div>
                    <label className="block"><span className="mb-2 block text-xs font-semibold">Họ và tên *</span><input required autoComplete="name" value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/55 px-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></label>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <label><span className="mb-2 block text-xs font-semibold">Email *</span><input required type="email" autoComplete="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/55 px-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></label>
                        <label><span className="mb-2 block text-xs font-semibold">Số điện thoại</span><input type="tel" autoComplete="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/55 px-4 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /></label>
                    </div>
                    {!isEditing && <label className="block"><span className="mb-2 block text-xs font-semibold">Mật khẩu ban đầu *</span><span className="relative block"><input required type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={(event) => updateField("password", event.target.value)} className="min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#faf6ef]/55 px-4 pr-11 text-sm outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20" /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#766b66] hover:bg-[#f2e8e1]" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span><span className="mt-2 block text-xs text-[#766b66]">Cung cấp mật khẩu này cho nhân viên qua kênh an toàn.</span></label>}
                    {isEditing && <p className="rounded-xl border border-[#eadfd6] bg-[#faf6ef]/60 px-4 py-3 text-xs leading-5 text-[#766b66]">Form chỉnh sửa không thay đổi mật khẩu, vai trò hoặc trạng thái tài khoản.</p>}
                </div>
                <footer className="flex shrink-0 justify-end gap-3 border-t border-[#eadfd6] bg-[#fffdf9] px-5 py-4 sm:px-6"><button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-xl border border-[#e1d6cf] px-5 text-sm font-semibold hover:bg-[#faf6ef]">Hủy</button><button type="submit" disabled={saving} className="inline-flex min-h-11 min-w-32 items-center justify-center gap-2 rounded-xl bg-[#f2a39b] px-5 text-sm font-semibold hover:bg-[#ee9188] disabled:cursor-wait disabled:opacity-60">{saving && <LoaderCircle size={17} className="animate-spin" />}{isEditing ? "Lưu thay đổi" : "Tạo nhân viên"}</button></footer>
            </form>
        </section>
    </div>
}

export default StaffFormModal
