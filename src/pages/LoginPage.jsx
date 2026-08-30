import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    ArrowRight,
    Eye,
    EyeOff,
    LoaderCircle,
} from "lucide-react";

import logo from "../assets/logo.png";
import registerEditorial from "../assets/register-editorial.png";
import { loginUser, saveAuthToken, saveAuthUser } from "../services/authApi.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_CLASS =
    "h-10 w-full rounded-xl border border-[#ded6ce] bg-white px-4 text-[13px] text-brand-text outline-none transition placeholder:text-[#9b918c] focus:border-brand-primary focus:ring-3 focus:ring-brand-primary/15";

function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [form, setForm] = useState({
        email: "",
        password: "",
    });
    const [fieldErrors, setFieldErrors] = useState({});
    const [requestError, setRequestError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

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
        const email = form.email.trim().toLowerCase();

        if (!email) {
            errors.email = "Vui lòng nhập email.";
        } else if (!EMAIL_PATTERN.test(email)) {
            errors.email = "Email chưa đúng định dạng.";
        }

        if (!form.password) {
            errors.password = "Vui lòng nhập mật khẩu.";
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
            const result = await loginUser({
                email: form.email.trim().toLowerCase(),
                password: form.password,
            });

            saveAuthToken(result.token);
            saveAuthUser(result.user);

            const requestedPath = location.state?.from;
            const roleDefaultPath = result.user?.role === "STORE_MANAGER"
                ? "/manager"
                : result.user?.role === "RENTAL_STAFF"
                    ? "/staff"
                    : "/";
            const requestedOperationsPath =
                typeof requestedPath === "string" &&
                (requestedPath.startsWith("/manager") || requestedPath.startsWith("/staff"));
            const isOperationsUser = ["STORE_MANAGER", "RENTAL_STAFF"].includes(result.user?.role);
            const canUseRequestedPath =
                typeof requestedPath === "string" &&
                requestedPath.startsWith("/") &&
                !requestedPath.startsWith("//") &&
                (!requestedOperationsPath || isOperationsUser);
            const redirectPath =
                canUseRequestedPath ? requestedPath : roleDefaultPath;

            navigate(redirectPath, { replace: true });
        } catch (error) {
            setRequestError(
                error.response?.data?.message ||
                    "Không thể đăng nhập lúc này. Vui lòng thử lại.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-[100dvh] flex-col bg-brand-bg lg:h-[100dvh] lg:overflow-hidden">
            <header className="relative z-20 shrink-0 border-b border-[#ebe3da] bg-brand-surface/95 backdrop-blur">
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
                            Trang phục phù hợp đang chờ bạn lựa chọn.
                        </h1>
                        <p className="mt-4 max-w-md text-[14px] leading-6 text-white/85">
                            Đăng nhập để tiếp tục quản lý giỏ và theo dõi đơn thuê
                            của bạn.
                        </p>
                    </div>
                </section>

                <section className="flex min-h-0 items-center justify-center px-5 py-8 sm:px-8 lg:px-12 lg:py-5">
                    <div className="w-full max-w-[460px] rounded-2xl border border-[#e7ded5] bg-brand-surface p-6 shadow-[0_20px_55px_rgba(69,60,56,0.08)] sm:p-8">
                        <div className="mb-6 text-center">
                            <h1 className="font-serif text-[34px] leading-tight text-brand-text sm:text-[38px]">
                                Chào mừng trở lại
                            </h1>
                            <p className="mt-2 text-[13px] leading-5 text-[#776d68]">
                                Đăng nhập bằng tài khoản D Shop của bạn.
                            </p>
                        </div>

                        <form noValidate onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="login-email"
                                    className="mb-1.5 block text-[12px] font-bold text-[#554a45]"
                                >
                                    Email <span className="text-[#bd5c54]">*</span>
                                </label>
                                <input
                                    id="login-email"
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={updateField}
                                    autoComplete="email"
                                    autoFocus
                                    aria-invalid={Boolean(fieldErrors.email)}
                                    aria-describedby={
                                        fieldErrors.email
                                            ? "login-email-error"
                                            : undefined
                                    }
                                    placeholder="ban@email.com"
                                    className={`${FIELD_CLASS} ${
                                        fieldErrors.email
                                            ? "border-[#d76e66]"
                                            : ""
                                    }`}
                                />
                                {fieldErrors.email && (
                                    <p
                                        id="login-email-error"
                                        className="mt-1.5 text-[12px] text-[#b44f48]"
                                    >
                                        {fieldErrors.email}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="login-password"
                                    className="mb-1.5 block text-[12px] font-bold text-[#554a45]"
                                >
                                    Mật khẩu <span className="text-[#bd5c54]">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        id="login-password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        value={form.password}
                                        onChange={updateField}
                                        autoComplete="current-password"
                                        aria-invalid={Boolean(fieldErrors.password)}
                                        aria-describedby={
                                            fieldErrors.password
                                                ? "login-password-error"
                                                : undefined
                                        }
                                        placeholder="Nhập mật khẩu"
                                        className={`${FIELD_CLASS} pr-11 ${
                                            fieldErrors.password
                                                ? "border-[#d76e66]"
                                                : ""
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword((current) => !current)
                                        }
                                        aria-label={
                                            showPassword
                                                ? "Ẩn mật khẩu"
                                                : "Hiện mật khẩu"
                                        }
                                        className="absolute top-1/2 right-2.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#887d77] transition hover:bg-[#f6eee7] hover:text-brand-text"
                                    >
                                        {showPassword ? (
                                            <EyeOff size={16} aria-hidden="true" />
                                        ) : (
                                            <Eye size={16} aria-hidden="true" />
                                        )}
                                    </button>
                                </div>
                                {fieldErrors.password && (
                                    <p
                                        id="login-password-error"
                                        className="mt-1.5 text-[12px] text-[#b44f48]"
                                    >
                                        {fieldErrors.password}
                                    </p>
                                )}
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
                                        Đang đăng nhập
                                    </>
                                ) : (
                                    <>
                                        Đăng nhập
                                        <ArrowRight size={17} aria-hidden="true" />
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="mt-5 border-t border-[#eee7df] pt-4 text-center text-[12px] text-[#776d68]">
                            Chưa có tài khoản?{" "}
                            <Link
                                to="/register"
                                className="font-bold text-[#a95650] underline decoration-[#e9b0aa] underline-offset-4 transition hover:text-[#833c37]"
                            >
                                Đăng ký
                            </Link>
                        </p>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default LoginPage;
