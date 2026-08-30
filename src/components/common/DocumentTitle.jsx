import { useEffect } from "react"
import { useLocation } from "react-router-dom"

const exactTitles = {
    "/": "Trang chủ",
    "/login": "Đăng nhập",
    "/register": "Đăng ký",
    "/garments": "Trang phục",
    "/categories": "Danh mục",
    "/cart": "Giỏ thuê",
    "/checkout": "Đặt thuê",
    "/my-rentals": "Đơn thuê của tôi",
    "/profile": "Hồ sơ",
    "/manager": "Tổng quan quản lý",
    "/manager/garments": "Quản lý trang phục",
    "/manager/categories": "Quản lý danh mục",
    "/manager/inventory": "Kho cho thuê",
    "/manager/staff": "Quản lý nhân viên",
    "/manager/approvals": "Phê duyệt phí",
    "/manager/policies": "Chính sách",
    "/manager/refunds": "Đối soát hoàn tiền",
    "/manager/availability-blocks": "Lịch khóa kho",
    "/manager/rentals": "Quản lý đơn thuê",
    "/staff": "Tổng quan nhân viên",
    "/staff/availability-blocks": "Lịch khóa kho",
    "/staff/rentals": "Vận hành đơn thuê",
}

const getPageTitle = (pathname) => {
    if (/^\/garments\/[^/]+$/.test(pathname)) return "Chi tiết trang phục"
    if (/^\/my-rentals\/[^/]+$/.test(pathname)) return "Chi tiết đơn thuê"
    if (/^\/manager\/rentals\/[^/]+$/.test(pathname)) return "Chi tiết đơn thuê"
    if (/^\/staff\/rentals\/[^/]+$/.test(pathname)) return "Chi tiết đơn thuê"

    return exactTitles[pathname] || "D Shop"
}

function DocumentTitle() {
    const { pathname } = useLocation()

    useEffect(() => {
        const pageTitle = getPageTitle(pathname)
        document.title = pageTitle === "D Shop" ? pageTitle : `${pageTitle} | D Shop`
    }, [pathname])

    return null
}

export default DocumentTitle
