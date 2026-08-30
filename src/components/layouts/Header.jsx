import { useState } from "react"
import { Link, NavLink, useNavigate } from "react-router-dom"
import { LayoutDashboard, Menu, Search, ShoppingBag, User, X } from "lucide-react"

import logo from "../../assets/logo.png"
import { getAuthToken, getAuthUser } from "../../services/authStorage.js"

function Header({ cartCount }) {
    const [keyword, setKeyword] = useState("")
    const [menuOpen, setMenuOpen] = useState(false)
    const navigate = useNavigate()
    const isLoggedIn = Boolean(getAuthToken())
    const authUser = getAuthUser()
    const accountPath = isLoggedIn ? "/profile" : "/login"
    const operationsPath = authUser?.role === "STORE_MANAGER"
        ? "/manager"
        : authUser?.role === "RENTAL_STAFF"
            ? "/staff"
            : null
    const showCustomerActions = !operationsPath

    const handleSearch = (event) => {
        event.preventDefault()

        const value = keyword.trim()

        if (!value) {
            navigate("/garments")
            setMenuOpen(false)
            return
        }

        navigate(`/garments?keyword=${encodeURIComponent(value)}`)
        setMenuOpen(false)
    }

    const navClass = ({ isActive }) =>
        isActive
            ? "border-b-2 border-[#a9544d] pb-1 text-sm font-semibold text-[#a9544d]"
            : "text-sm font-medium text-brand-text transition-colors hover:text-[#a9544d]"

    return (
        <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-md">
            <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-4 sm:px-6">
                <Link to="/" className="shrink-0" aria-label="Trang chủ D Shop">
                    <img
                        src={logo}
                        alt="D Shop"
                        className="h-10 w-auto object-contain sm:h-11"
                    />
                </Link>

                <nav className="hidden items-center gap-7 lg:flex">
                    <NavLink to="/garments" className={navClass} end>
                        Trang phục
                    </NavLink>

                    <NavLink to="/categories" className={navClass} end>
                        Danh mục
                    </NavLink>

                    {showCustomerActions && <NavLink to="/my-rentals" className={navClass}>
                        Đơn thuê của tôi
                    </NavLink>}
                </nav>

                <div className="flex items-center gap-3 sm:gap-4 lg:gap-5">
                    <form
                        onSubmit={handleSearch}
                        className="relative hidden lg:block"
                    >
                        <input
                            type="search"
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                            placeholder="Tìm kiếm trang phục..."
                            className="w-56 rounded-full border border-transparent bg-brand-bg py-2 pr-4 pl-10 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25 xl:w-64"
                        />

                        <Search
                            size={16}
                            className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
                        />
                    </form>

                    <div className="flex items-center gap-4">
                        {operationsPath && (
                            <Link
                                to={operationsPath}
                                className="hidden items-center gap-1.5 text-gray-600 transition-colors hover:text-[#a9544d] xl:flex"
                            >
                                <LayoutDashboard size={20} />
                                <span className="text-sm font-medium">
                                    {authUser.role === "STORE_MANAGER" ? "Trang quản lý" : "Trang nhân viên"}
                                </span>
                            </Link>
                        )}
                        {showCustomerActions && <Link
                            to="/cart"
                            aria-label="Giỏ thuê"
                            title="Giỏ thuê"
                            className="relative flex items-center gap-1.5 text-gray-600 transition-colors hover:text-[#a9544d]"
                        >
                            <ShoppingBag size={21} />
                            <span className="hidden text-sm font-medium sm:inline">Giỏ thuê</span>

                            {cartCount !== undefined &&
                                cartCount !== null &&
                                Number(cartCount) > 0 && (
                                <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-primary px-1 text-[10px] font-bold text-[#382d29]">
                                    {cartCount}
                                </span>
                            )}
                        </Link>}

                        <Link
                            to={accountPath}
                            aria-label="Tài khoản"
                            title="Tài khoản"
                            className="flex items-center gap-1.5 text-gray-600 transition-colors hover:text-[#a9544d]"
                        >
                            <User size={21} />
                            <span className="hidden text-sm font-medium sm:inline">Tài khoản</span>
                        </Link>
                    </div>

                    <button
                        type="button"
                        aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen((current) => !current)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-brand-text transition hover:bg-brand-bg lg:hidden"
                    >
                        {menuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {menuOpen && (
                <div className="border-t border-gray-100 bg-white px-4 py-5 shadow-[0_18px_35px_rgba(92,70,61,0.09)] lg:hidden">
                    <div className="mx-auto max-w-[1200px]">
                        <form onSubmit={handleSearch} className="relative mb-5">
                            <Search
                                size={17}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                type="search"
                                value={keyword}
                                onChange={(event) => setKeyword(event.target.value)}
                                placeholder="Tìm kiếm trang phục..."
                                className="h-11 w-full rounded-xl border border-gray-200 bg-brand-bg pl-11 pr-4 text-sm text-brand-text outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25"
                            />
                        </form>

                        <nav className="grid gap-1">
                            <NavLink
                                to="/garments"
                                onClick={() => setMenuOpen(false)}
                                className="rounded-xl px-3 py-3 text-sm font-semibold text-brand-text hover:bg-brand-bg"
                            >
                                Trang phục
                            </NavLink>
                            <NavLink
                                to="/categories"
                                onClick={() => setMenuOpen(false)}
                                className="rounded-xl px-3 py-3 text-sm font-semibold text-brand-text hover:bg-brand-bg"
                            >
                                Danh mục
                            </NavLink>
                            {showCustomerActions && <NavLink
                                to="/my-rentals"
                                onClick={() => setMenuOpen(false)}
                                className="rounded-xl px-3 py-3 text-sm font-semibold text-brand-text hover:bg-brand-bg"
                            >
                                Đơn thuê của tôi
                            </NavLink>}
                            {showCustomerActions && <NavLink
                                to="/cart"
                                onClick={() => setMenuOpen(false)}
                                className="rounded-xl px-3 py-3 text-sm font-semibold text-brand-text hover:bg-brand-bg"
                            >
                                Giỏ thuê
                            </NavLink>}
                            <NavLink
                                to={accountPath}
                                onClick={() => setMenuOpen(false)}
                                className="rounded-xl px-3 py-3 text-sm font-semibold text-brand-text hover:bg-brand-bg"
                            >
                                Tài khoản
                            </NavLink>
                            {operationsPath && (
                                <NavLink
                                    to={operationsPath}
                                    onClick={() => setMenuOpen(false)}
                                    className="rounded-xl px-3 py-3 text-sm font-semibold text-brand-text hover:bg-brand-bg"
                                >
                                    {authUser.role === "STORE_MANAGER" ? "Trang quản lý" : "Trang nhân viên"}
                                </NavLink>
                            )}
                        </nav>
                    </div>
                </div>
            )}
        </header>
    )
}

export default Header
