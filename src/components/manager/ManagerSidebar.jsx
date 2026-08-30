import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import {
    Boxes,
    ClipboardCheck,
    FileCheck2,
    HandCoins,
    LayoutDashboard,
    PanelLeftClose,
    PanelLeftOpen,
    PackageCheck,
    ReceiptText,
    ScanSearch,
    Shirt,
    ShoppingBag,
    Tags,
    UsersRound,
} from "lucide-react"
import logo from "../../assets/logo.png"

const SIDEBAR_STORAGE_KEY = "dshop-manager-sidebar-collapsed"

function ManagerSidebar({ role }) {
    const location = useLocation()
    const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true")
    const isManager = role === "STORE_MANAGER"
    const isStaff = role === "RENTAL_STAFF"
    const basePath = isManager ? "/manager" : isStaff ? "/staff" : ""
    const groups = isManager
        ? [
            { label: "Vận hành", items: [["Đơn thuê", ShoppingBag, "/manager/rentals"], ["Danh mục", Tags, "/manager/categories"], ["Trang phục", Shirt, "/manager/garments"], ["Kho cho thuê", Boxes, "/manager/inventory"]] },
            { label: "Quản trị", items: [["Nhân viên", UsersRound, "/manager/staff"], ["Phê duyệt phí", FileCheck2, "/manager/approvals"], ["Chính sách", ClipboardCheck, "/manager/policies"], ["Hoàn tiền & đối soát", ReceiptText, "/manager/refunds"]] },
        ]
        : isStaff
            ? [
                {
                    label: "Vận hành",
                    items: [
                        ["Đơn thuê", ShoppingBag, "/staff/rentals"],
                        ["Chuẩn bị đơn", PackageCheck, "/staff/rentals?queue=preparation"],
                        ["Bàn giao & thu cọc", HandCoins, "/staff/rentals?queue=handover"],
                        ["Nhận trả & kiểm tra", ScanSearch, "/staff/rentals?queue=returns"],
                        ["Quyết toán", ClipboardCheck, "/staff/rentals?queue=settlement"],
                    ],
                },
            ]
            : []
    const itemClass = `flex w-full items-center rounded-lg py-2.5 text-left text-sm font-medium transition-colors hover:bg-[#d4e7dd]/50 hover:text-[#b65e56] ${isCollapsed ? "justify-center px-2" : "gap-3 px-4"}`
    const toggleSidebar = () => {
        setIsCollapsed((current) => {
            const next = !current
            localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
            return next
        })
    }

    if (!isManager && !isStaff) {
        return (
            <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[#eadfd6] bg-[#fffdf9] py-8 transition-[width] duration-200 lg:flex ${isCollapsed ? "w-[84px]" : "w-[240px]"}`}>
                <div className={`mb-10 flex items-center ${isCollapsed ? "mx-auto justify-center" : "mx-6 gap-3"}`}>
                    <img src={logo} alt="D Shop" className={`h-9 object-contain opacity-60 ${isCollapsed ? "w-12" : "w-[108px]"}`} />
                </div>
                <div className={`flex-1 space-y-4 animate-pulse ${isCollapsed ? "px-3" : "px-4"}`}>
                    <div className="h-4 w-16 bg-[#eadfd6]/60 rounded" />
                    <div className="h-9 bg-[#eadfd6]/40 rounded-lg" />
                    <div className="h-4 w-16 bg-[#eadfd6]/60 rounded mt-6" />
                    <div className="h-9 bg-[#eadfd6]/40 rounded-lg" />
                    <div className="h-9 bg-[#eadfd6]/40 rounded-lg" />
                </div>
            </aside>
        )
    }

    const renderItem = ([label, Icon, href]) => {
        const content = <><Icon className="shrink-0" size={21} /><span className={isCollapsed ? "sr-only" : ""}>{label}</span></>
        const [hrefPath, hrefQuery = ""] = href.split("?")
        const targetQueue = new URLSearchParams(hrefQuery).get("queue")
        const currentQueue = new URLSearchParams(location.search).get("queue")
        const active = location.pathname === hrefPath && (
            targetQueue ? currentQueue === targetQueue : !currentQueue
        )
        const className = `${itemClass} ${active ? "bg-[#f2a39b]/10 font-semibold text-[#b65e56]" : ""}`

        return href
            ? <Link key={label} to={href} className={className} title={isCollapsed ? label : undefined} aria-label={isCollapsed ? label : undefined}>{content}</Link>
            : <button key={label} type="button" className={className} title={isCollapsed ? label : undefined} aria-label={isCollapsed ? label : undefined}>{content}</button>
    }

    return <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[#eadfd6] bg-[#fffdf9] py-8 transition-[width] duration-200 lg:flex ${isCollapsed ? "w-[84px]" : "w-[240px]"}`}>
        <Link to={basePath} className={`mb-10 flex items-center ${isCollapsed ? "mx-auto justify-center" : "mx-6 gap-3"}`} title={isCollapsed ? "D Shop" : undefined}><img src={logo} alt="D Shop" className={`h-9 object-contain ${isCollapsed ? "w-12" : "w-[108px]"}`} />{!isCollapsed && <span className="border-l border-[#eadfd6] pl-3 text-[9px] font-bold uppercase tracking-[.14em] text-[#897d77]">{isManager ? <><span>Rental</span><br /><span>Manager</span></> : isStaff ? <><span>Nhân viên</span><br /><span>cho thuê</span></> : null}</span>}</Link>
        <nav className={`flex-1 overflow-y-auto ${isCollapsed ? "px-3" : "px-4"}`}>
            <div className="mb-6">{!isCollapsed && <p className="mb-2 px-4 text-[10px] font-bold uppercase tracking-[.18em] text-[#897d77]">Tổng quan</p>}<Link to={basePath} className={`${itemClass} ${location.pathname === basePath ? "bg-[#f2a39b]/10 font-semibold text-[#b65e56]" : ""}`} title={isCollapsed ? "Tổng quan" : undefined} aria-label={isCollapsed ? "Tổng quan" : undefined}><LayoutDashboard className="shrink-0" size={21} /><span className={isCollapsed ? "sr-only" : ""}>Tổng quan</span></Link></div>
            {groups.map((group) => <div key={group.label} className="mb-6">{!isCollapsed && <p className="mb-2 px-4 text-[10px] font-bold uppercase tracking-[.18em] text-[#897d77]">{group.label}</p>}<div className="space-y-1">{group.items.map(renderItem)}</div></div>)}
        </nav>
        <div className={`border-t border-[#eadfd6]/70 pt-6 ${isCollapsed ? "px-3" : "px-4"}`}><button type="button" onClick={toggleSidebar} className={`flex w-full items-center rounded-xl py-3 text-sm text-[#766b66] hover:bg-[#d4e7dd]/40 ${isCollapsed ? "justify-center px-2" : "gap-3 px-4"}`} aria-label={isCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"} title={isCollapsed ? "Mở rộng" : undefined}>{isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}{!isCollapsed && "Thu gọn"}</button></div>
    </aside>
}

export default ManagerSidebar
