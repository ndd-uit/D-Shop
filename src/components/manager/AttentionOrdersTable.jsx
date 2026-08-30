import { Link } from "react-router-dom"
import { Eye } from "lucide-react"
import OrderStatusBadge from "../rental/OrderStatusBadge.jsx"
import { formatDate } from "../rental/rentalOrderUtils.js"

const shortId = (value) => value?.slice(0, 8).toUpperCase() || ""

function AttentionOrdersTable({ orders, detailBasePath = "/my-rentals" }) {
    return <section id="attention" className="space-y-4"><h2 className="font-serif text-xl font-semibold">Đơn cần chú ý</h2><div className="overflow-x-auto rounded-xl border border-[#eadfd6] bg-[#fffdf9]"><table className="w-full min-w-[820px] text-left text-sm"><thead><tr className="border-b border-[#eadfd6] bg-[#faf6ef]/45 text-[#766b66]"><th className="px-6 py-4 font-medium">Mã đơn</th><th className="px-6 py-4 font-medium">Khách hàng</th><th className="px-6 py-4 font-medium">Ngày nhận</th><th className="px-6 py-4 font-medium">Ngày trả</th><th className="px-6 py-4 font-medium">Trạng thái</th><th className="px-6 py-4 text-right font-medium">Thao tác</th></tr></thead><tbody>{orders.map((order) => <tr key={order.orderId} className="border-b border-[#eadfd6]/70 last:border-0"><td className="px-6 py-4 font-bold">#{shortId(order.orderId)}</td><td className="px-6 py-4"><b>{order.customer?.fullName || "Khách hàng"}</b><p className="mt-1 text-xs text-[#897d77]">{order.customer?.phone || order.customer?.email}</p></td><td className="px-6 py-4">{formatDate(order.rentalStartAt)}</td><td className="px-6 py-4">{formatDate(order.returnDueAt)}</td><td className="px-6 py-4"><OrderStatusBadge status={order.status} /></td><td className="px-6 py-4 text-right"><Link to={`${detailBasePath}/${order.orderId}`} title="Xem chi tiết" aria-label={`Xem chi tiết đơn ${shortId(order.orderId)}`} className="inline-flex size-9 items-center justify-center rounded-lg border border-[#e1d6cf] text-[#a9544d] transition hover:border-[#d8bdb6] hover:bg-[#fbe2de]"><Eye size={17} /></Link></td></tr>)}{!orders.length && <tr><td colSpan="6" className="p-12 text-center text-[#897d77]">Không có đơn cần chú ý.</td></tr>}</tbody></table></div></section>
}

export default AttentionOrdersTable
