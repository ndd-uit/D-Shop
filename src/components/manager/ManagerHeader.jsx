import { useEffect, useRef, useState } from "react"
import {
    ChevronDown,
    LogOut,
    RefreshCw,
    Store,
    UserRound,
} from "lucide-react"
import { Link } from "react-router-dom"

function ManagerHeader({
    profile,
    loading,
    onReload,
    onLogout,
    title = "Tổng quan",
    subtitle,
}) {
    const [accountOpen, setAccountOpen] = useState(false)
    const [currentTime, setCurrentTime] = useState(() => new Date())
    const accountRef = useRef(null)

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    const todayDate = new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(currentTime)

    const todayTime = new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(currentTime)

    const today = `${todayDate} • ${todayTime}`

    useEffect(() => {
        if (!accountOpen) return undefined

        const closeOnOutsideClick = (event) => {
            if (!accountRef.current?.contains(event.target)) {
                setAccountOpen(false)
            }
        }
        const closeOnEscape = (event) => {
            if (event.key === "Escape") setAccountOpen(false)
        }

        document.addEventListener("mousedown", closeOnOutsideClick)
        document.addEventListener("keydown", closeOnEscape)

        return () => {
            document.removeEventListener("mousedown", closeOnOutsideClick)
            document.removeEventListener("keydown", closeOnEscape)
        }
    }, [accountOpen])

    const roleLabel = profile?.role === "STORE_MANAGER"
        ? "Quản lý cửa hàng"
        : profile?.role === "RENTAL_STAFF"
            ? "Nhân viên cho thuê"
            : ""

    return (
        <header className="sticky top-0 z-30 flex h-24 items-center border-b border-[#eadfd6] bg-[#faf6ef]/95 px-5 backdrop-blur sm:px-8 lg:h-28 lg:px-12 xl:px-16">
            <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between">
                <div>
                    <h1 className="font-serif text-3xl font-semibold sm:text-4xl">
                        {title}
                    </h1>
                    <p className="mt-2 text-xs text-[#897d77] sm:text-sm">
                        {subtitle || today}
                    </p>
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                    <Link
                        to="/"
                        className="hidden h-10 items-center gap-2 rounded-lg border border-[#eadfd6] bg-[#fffdf9] px-3 text-xs font-semibold text-[#665b55] transition hover:border-[#f2a39b] sm:inline-flex"
                    >
                        <Store size={16} />
                        Xem cửa hàng
                    </Link>

                    <button
                        type="button"
                        onClick={onReload}
                        disabled={loading}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#665b55] transition hover:bg-[#fffdf9] disabled:cursor-wait disabled:opacity-60"
                        aria-label="Làm mới dữ liệu"
                        title="Làm mới dữ liệu"
                    >
                        <RefreshCw
                            className={loading ? "animate-spin" : ""}
                            size={22}
                        />
                    </button>

                    <div
                        ref={accountRef}
                        className="relative flex items-center gap-4 border-l border-[#eadfd6] pl-4 sm:pl-6"
                    >
                        <div className="hidden text-right sm:block">
                            <p className="text-sm font-bold">
                                {profile?.fullName || (loading ? "" : "Người dùng")}
                            </p>
                            {roleLabel ? (
                                <p className="mt-1 text-xs text-[#897d77]">
                                    {roleLabel}
                                </p>
                            ) : null}
                        </div>

                        <button
                            type="button"
                            onClick={() => setAccountOpen((open) => !open)}
                            className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#eadfd6] bg-white transition hover:border-[#f2a39b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2a39b] focus-visible:ring-offset-2"
                            aria-label="Mở menu tài khoản"
                            aria-haspopup="menu"
                            aria-expanded={accountOpen}
                        >
                            <UserRound size={21} />
                            <ChevronDown
                                className={`absolute -bottom-1 -right-1 rounded-full border border-[#eadfd6] bg-white p-0.5 transition-transform ${accountOpen ? "rotate-180" : ""}`}
                                size={16}
                            />
                        </button>

                        {accountOpen && (
                            <div
                                role="menu"
                                className="absolute right-0 top-[calc(100%+14px)] w-64 overflow-hidden rounded-2xl border border-[#eadfd6] bg-[#fffdf9] p-2 shadow-[0_20px_50px_-20px_rgba(76,55,47,0.35)]"
                            >
                                <div className="border-b border-[#eadfd6] px-3 py-3 sm:hidden">
                                    <p className="truncate text-sm font-bold text-[#423733]">
                                        {profile?.fullName || (loading ? "" : "Người dùng")}
                                    </p>
                                </div>

                                <Link
                                    to="/profile"
                                    onClick={() => setAccountOpen(false)}
                                    role="menuitem"
                                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#514641] transition hover:bg-[#f9eee9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2a39b]"
                                >
                                    <UserRound size={18} />
                                    Hồ sơ cá nhân
                                </Link>

                                <div className="my-2 h-px bg-[#eadfd6]" />

                                <button
                                    type="button"
                                    onClick={onLogout}
                                    role="menuitem"
                                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                                >
                                    <LogOut size={18} />
                                    Đăng xuất
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}

export default ManagerHeader
