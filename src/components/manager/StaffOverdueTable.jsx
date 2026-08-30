import { Clock3, Eye } from "lucide-react"
import { Link } from "react-router-dom"

import { formatDateTime } from "../rental/rentalOrderUtils.js"

const shortId = (value) => value?.slice(0, 8).toUpperCase() || ""

const getOverdueLabel = (returnDueAt) => {
    const difference = Date.now() - new Date(returnDueAt).getTime()
    if (!Number.isFinite(difference) || difference <= 0) return "Vừa quá hạn"

    const totalHours = Math.floor(difference / 3600000)
    const days = Math.floor(totalHours / 24)
    const hours = totalHours % 24

    if (days > 0) return `${days} ngày ${hours} giờ`
    return `${Math.max(1, hours)} giờ`
}

function StaffOverdueTable({ orders }) {
    return (
        <section aria-labelledby="overdue-title" className="overflow-hidden rounded-xl border border-[#eadfd6] bg-[#fffdf9]">
            <header className="flex items-center gap-3 border-b border-[#eadfd6] px-5 py-4 sm:px-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff0dc] text-[#9a5918]">
                    <Clock3 size={20} />
                </span>
                <div>
                    <h2 id="overdue-title" className="font-serif text-xl font-semibold">
                        Đơn quá hạn
                    </h2>
                    <p className="mt-0.5 text-xs text-[#897d77]">
                        {orders.length} đơn chưa được ghi nhận trả
                    </p>
                </div>
            </header>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-[#faf6ef]/55 text-[#766b66]">
                        <tr>
                            <th className="px-6 py-3 font-medium">Mã đơn</th>
                            <th className="px-6 py-3 font-medium">Khách hàng</th>
                            <th className="px-6 py-3 font-medium">Hạn trả</th>
                            <th className="px-6 py-3 font-medium">Mức trễ</th>
                            <th className="px-6 py-3 text-right font-medium">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order) => (
                            <tr key={order.orderId} className="border-t border-[#eadfd6]/70">
                                <td className="px-6 py-4 font-bold">#{shortId(order.orderId)}</td>
                                <td className="px-6 py-4">
                                    <p className="font-semibold">{order.customer?.fullName || "Khách hàng"}</p>
                                    <p className="mt-1 text-xs text-[#897d77]">
                                        {order.customer?.phone || order.customer?.email || "Chưa cập nhật"}
                                    </p>
                                </td>
                                <td className="px-6 py-4 text-[#665b55]">{formatDateTime(order.returnDueAt)}</td>
                                <td className="px-6 py-4 font-semibold text-[#a45b18]">{getOverdueLabel(order.returnDueAt)}</td>
                                <td className="px-6 py-4 text-right">
                                    <Link
                                        to={`/staff/rentals/${order.orderId}`}
                                        title="Xem chi tiết"
                                        aria-label={`Xem chi tiết đơn ${shortId(order.orderId)}`}
                                        className="inline-flex size-9 items-center justify-center rounded-lg border border-[#e1d6cf] text-[#a9544d] transition hover:border-[#d8bdb6] hover:bg-[#fbe2de]"
                                    >
                                        <Eye size={17} />
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {!orders.length && (
                            <tr>
                                <td colSpan="5" className="px-6 py-10 text-center text-[#897d77]">
                                    Không có đơn quá hạn.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

export default StaffOverdueTable
