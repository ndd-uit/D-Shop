import { useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowRight,
    CheckCircle2,
    Eye,
    EyeOff,
    LoaderCircle,
} from "lucide-react";

import logo from "../assets/logo.png";
import registerEditorial from "../assets/register-editorial.png";
import { registerCustomer } from "../services/authApi.js";

const INITIAL_FORM = {
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_CLASS =
    "h-10 w-full rounded-xl border bg-white px-4 text-[13px] text-brand-text outline-none transition placeholder:text-[#9b918c] focus:border-brand-primary focus:ring-3 focus:ring-brand-primary/15";

function RegisterPage() {
    const [form, setForm] = useState(INITIAL_FORM);
    const [fieldErrors, setFieldErrors] = useState({});
    const [requestError, setRequestError] = useState("");
    const [registeredUser, setRegisteredUser] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const updateField = (event) => {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));

        if (fieldErrors[name]) {
            setFieldErrors((current) => ({
                ...current,
                [name]: "",
            }));
        }

        if (requestError) {
            setRequestError("");
        }
    };

    const validateForm = () => {
        const errors = {};
        const fullName = form.fullName.trim();
        const email = form.email.trim().toLowerCase();
        const phone = form.phone.trim();

        if (!fullName) {
            errors.fullName = "Vui lòng nhập họ và tên.";
        } else if (fullName.length > 150) {
            errors.fullName = "Họ và tên không được vượt quá 150 ký tự.";
        }

        if (!email) {
            errors.email = "Vui lòng nhập email.";
        } else if (!EMAIL_PATTERN.test(email) || email.length > 255) {
            errors.email = "Email chưa đúng định dạng.";
        }

        if (phone.length > 30) {
            errors.phone = "Số điện thoại không được vượt quá 30 ký tự.";
        }

        if (!form.password) {
            errors.password = "Vui lòng nhập mật khẩu.";
        }

        if (!form.confirmPassword) {
            errors.confirmPassword = "Vui lòng nhập lại mật khẩu.";
        } else if (form.confirmPassword !== form.password) {
            errors.confirmPassword = "Mật khẩu nhập lại chưa khớp.";
        }

        setFieldErrors(errors);

        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        setRequestError("");

        try {
            const result = await registerCustomer({
                fullName: form.fullName.trim(),
                email: form.email.trim().toLowerCase(),
                phone: form.phone.trim() || null,
                password: form.password,
            });

            setRegisteredUser(result.data);
        } catch (error) {
            setRequestError(
                error.response?.data?.message ||
                    "Không thể đăng ký lúc này. Vui lòng thử lại.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-[100dvh] flex-col bg-brand-bg lg:h-[100dvh] lg:overflow-hidden">
            <header className="relative z-20 border-b border-[#ebe3da] bg-brand-surface/95 backdrop-blur">
                <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center px-5 sm:px-8 lg:px-12">
                    <Link
                        to="/"
                        aria-label="Về trang chủ D Shop"
                        className="inline-flex items-center"
                    >
                        <img
                            src={logo}
                            alt="D Shop"
                            className="h-9 w-auto object-contain"
                        />
                    </Link>

                </div>
            </header>

            <main className="mx-auto grid min-h-0 w-full max-w-[1440px] flex-1 lg:grid-cols-[0.92fr_1.08fr]">
                <section className="relative hidden min-h-0 overflow-hidden lg:block">
                    <img
                        src={registerEditorial}
                        alt="Trang phục dạ tiệc thanh lịch tại D Shop"
                        className="absolute inset-0 h-full w-full object-cover object-center"
                        fetchPriority="high"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-[#3a2a24]/65 via-transparent to-white/5" />

                    <div className="absolute inset-x-0 bottom-0 p-10 xl:p-14">
                        <h1 className="max-w-md font-serif text-[38px] leading-[1.12] font-medium text-white xl:text-[44px]">
                            Phong cách đẹp bắt đầu từ lựa chọn phù hợp.
                        </h1>
                        <p className="mt-4 max-w-md text-[14px] leading-6 text-white/85">
                            Tạo tài khoản để lưu giỏ thuê, quản lý đơn và theo dõi
                            từng hành trình trang phục của bạn.
                        </p>
                    </div>
                </section>

                <section className="flex min-h-0 items-center justify-center px-5 py-7 sm:px-8 lg:px-12 lg:py-5">
                    <div className="w-full max-w-[540px]">
                        {registeredUser ? (
                            <div
                                className="rounded-2xl border border-[#e7ded5] bg-brand-surface p-6 shadow-[0_20px_55px_rgba(69,60,56,0.08)] sm:p-8"
                                aria-live="polite"
                            >
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-mint text-[#386050]">
                                    <CheckCircle2 size={25} aria-hidden="true" />
                                </div>
                                <h1 className="mt-5 text-center font-serif text-[32px] leading-tight text-brand-text sm:text-[36px]">
                                    Tạo tài khoản thành công
                                </h1>
                                <p className="mt-3 text-center text-[14px] leading-6 text-[#746a65]">
                                    Tài khoản <strong>{registeredUser.email}</strong> đã
                                    sẵn sàng. Đăng nhập để bắt đầu quản lý giỏ và đơn
                                    thuê của bạn.
                                </p>

                                <div className="mt-7">
                                    <Link
                                        to="/login"
                                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 text-[14px] font-bold text-[#3d302c] transition hover:bg-[#ed9289] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                                    >
                                        Đăng nhập
                                        <ArrowRight size={17} aria-hidden="true" />
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-[#e7ded5] bg-brand-surface p-6 shadow-[0_20px_55px_rgba(69,60,56,0.08)] sm:p-7 lg:p-6">
                                <div className="mb-5 text-center">
                                    <h1 className="font-serif text-[32px] leading-tight text-brand-text sm:text-[36px]">
                                        Tạo tài khoản D Shop
                                    </h1>
                                    <p className="mt-2 text-[13px] leading-5 text-[#776d68]">
                                        Thông tin của bạn được dùng để quản lý giỏ và
                                        các đơn thuê trên hệ thống.
                                    </p>
                                </div>

                                <form noValidate onSubmit={handleSubmit} className="space-y-3">
                                    <div>
                                        <label
                                            htmlFor="register-full-name"
                                            className="mb-1.5 block text-[12px] font-bold text-[#554a45]"
                                        >
                                            Họ và tên <span className="text-[#bd5c54]">*</span>
                                        </label>
                                        <div>
                                            <input
                                                id="register-full-name"
                                                name="fullName"
                                                value={form.fullName}
                                                onChange={updateField}
                                                autoComplete="name"
                                                maxLength={150}
                                                aria-invalid={Boolean(fieldErrors.fullName)}
                                                aria-describedby={
                                                    fieldErrors.fullName
                                                        ? "register-full-name-error"
                                                        : undefined
                                                }
                                                placeholder="Nguyễn Văn An"
                                                className={`${FIELD_CLASS} ${
                                                    fieldErrors.fullName
                                                        ? "border-[#d76e66]"
                                                        : "border-[#ded6ce]"
                                                }`}
                                            />
                                        </div>
                                        {fieldErrors.fullName && (
                                            <p
                                                id="register-full-name-error"
                                                className="mt-1.5 text-[12px] text-[#b44f48]"
                                            >
                                                {fieldErrors.fullName}
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label
                                                htmlFor="register-email"
                                                className="mb-1.5 block text-[12px] font-bold text-[#554a45]"
                                            >
                                                Email <span className="text-[#bd5c54]">*</span>
                                            </label>
                                            <div>
                                                <input
                                                    id="register-email"
                                                    name="email"
                                                    type="email"
                                                    value={form.email}
                                                    onChange={updateField}
                                                    autoComplete="email"
                                                    maxLength={255}
                                                    aria-invalid={Boolean(fieldErrors.email)}
                                                    aria-describedby={
                                                        fieldErrors.email
                                                            ? "register-email-error"
                                                            : undefined
                                                    }
                                                    placeholder="ban@email.com"
                                                    className={`${FIELD_CLASS} ${
                                                        fieldErrors.email
                                                            ? "border-[#d76e66]"
                                                            : "border-[#ded6ce]"
                                                    }`}
                                                />
                                            </div>
                                            {fieldErrors.email && (
                                                <p
                                                    id="register-email-error"
                                                    className="mt-1.5 text-[12px] text-[#b44f48]"
                                                >
                                                    {fieldErrors.email}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label
                                                htmlFor="register-phone"
                                                className="mb-1.5 block text-[12px] font-bold text-[#554a45]"
                                            >
                                                Số điện thoại
                                                <span className="ml-1 font-medium text-[#948a84]">
                                                    (tùy chọn)
                                                </span>
                                            </label>
                                            <div>
                                                <input
                                                    id="register-phone"
                                                    name="phone"
                                                    type="tel"
                                                    value={form.phone}
                                                    onChange={updateField}
                                                    autoComplete="tel"
                                                    maxLength={30}
                                                    aria-invalid={Boolean(fieldErrors.phone)}
                                                    aria-describedby={
                                                        fieldErrors.phone
                                                            ? "register-phone-error"
                                                            : undefined
                                                    }
                                                    placeholder="0901 234 567"
                                                    className={`${FIELD_CLASS} ${
                                                        fieldErrors.phone
                                                            ? "border-[#d76e66]"
                                                            : "border-[#ded6ce]"
                                                    }`}
                                                />
                                            </div>
                                            {fieldErrors.phone && (
                                                <p
                                                    id="register-phone-error"
                                                    className="mt-1.5 text-[12px] text-[#b44f48]"
                                                >
                                                    {fieldErrors.phone}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <PasswordField
                                            id="register-password"
                                            name="password"
                                            label="Mật khẩu"
                                            value={form.password}
                                            error={fieldErrors.password}
                                            visible={showPassword}
                                            onToggle={() => setShowPassword((current) => !current)}
                                            onChange={updateField}
                                        />
                                        <PasswordField
                                            id="register-confirm-password"
                                            name="confirmPassword"
                                            label="Nhập lại mật khẩu"
                                            value={form.confirmPassword}
                                            error={fieldErrors.confirmPassword}
                                            visible={showConfirmPassword}
                                            onToggle={() =>
                                                setShowConfirmPassword((current) => !current)
                                            }
                                            onChange={updateField}
                                        />
                                    </div>

                                    {requestError && (
                                        <div
                                            role="alert"
                                            className="rounded-xl border border-[#efc2bd] bg-[#fff3f1] px-4 py-3 text-[13px] leading-5 text-[#9d413a]"
                                        >
                                            {requestError}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 text-[13px] font-bold text-[#3d302c] transition hover:bg-[#ed9289] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-65"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <LoaderCircle
                                                    size={18}
                                                    aria-hidden="true"
                                                    className="animate-spin"
                                                />
                                                Đang tạo tài khoản
                                            </>
                                        ) : (
                                            <>
                                                Tạo tài khoản
                                                <ArrowRight size={17} aria-hidden="true" />
                                            </>
                                        )}
                                    </button>
                                </form>

                                <p className="mt-4 border-t border-[#eee7df] pt-4 text-center text-[12px] text-[#776d68]">
                                    Đã có tài khoản?{" "}
                                    <Link
                                        to="/login"
                                        className="font-bold text-[#a95650] underline decoration-[#e9b0aa] underline-offset-4 transition hover:text-[#833c37]"
                                    >
                                        Đăng nhập
                                    </Link>
                                </p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}

function PasswordField({
    id,
    name,
    label,
    value,
    error,
    visible,
    onToggle,
    onChange,
}) {
    const errorId = `${id}-error`;

    return (
        <div>
            <label
                htmlFor={id}
                className="mb-1.5 block text-[12px] font-bold text-[#554a45]"
            >
                {label} <span className="text-[#bd5c54]">*</span>
            </label>
            <div className="relative">
                <input
                    id={id}
                    name={name}
                    type={visible ? "text" : "password"}
                    value={value}
                    onChange={onChange}
                    autoComplete="new-password"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    placeholder="Nhập mật khẩu"
                    className={`${FIELD_CLASS} pr-11 ${
                        error ? "border-[#d76e66]" : "border-[#ded6ce]"
                    }`}
                />
                <button
                    type="button"
                    onClick={onToggle}
                    aria-label={visible ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
                    className="absolute top-1/2 right-2.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#887d77] transition hover:bg-[#f6eee7] hover:text-brand-text"
                >
                    {visible ? (
                        <EyeOff size={16} aria-hidden="true" />
                    ) : (
                        <Eye size={16} aria-hidden="true" />
                    )}
                </button>
            </div>
            {error && (
                <p id={errorId} className="mt-1.5 text-[12px] text-[#b44f48]">
                    {error}
                </p>
            )}
        </div>
    );
}

export default RegisterPage;
