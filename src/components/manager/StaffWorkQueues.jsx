import {
    ArrowRight,
    ClipboardCheck,
    PackageCheck,
    ScanSearch,
    ShoppingBag,
} from "lucide-react"
import { Link } from "react-router-dom"

import OrderStatusBadge from "../rental/OrderStatusBadge.jsx"
import { formatDate } from "../rental/rentalOrderUtils.js"

const shortId = (value) => value?.slice(0, 8).toUpperCase() || ""

const QUEUES = [
    {
        key: "preparation",
        title: "Chuẩn bị đơn",
        statuses: ["CONFIRMED", "PREPARING"],
        action: () => "Chuẩn bị",
        icon: PackageCheck,
        guidance: "Kiểm tra tình trạng và phụ kiện của từng RentalUnit trước khi xác nhận sẵn sàng.",
    },
    {
        key: "handover",
        title: "Bàn giao & thu cọc",
        statuses: ["READY_FOR_PICKUP"],
        action: () => "Bàn giao",
        icon: ShoppingBag,
        guidance: "Đối chiếu số CCCD và thu đủ tiền cọc trước khi bàn giao. Hình thức thu: cổng thanh toán hoặc trực tiếp.",
    },
    {
        key: "returns",
        title: "Nhận trả & kiểm tra",
        statuses: ["RENTING", "OVERDUE", "RETURNED", "INSPECTING"],
        action: (status) => ["RETURNED", "INSPECTING"].includes(status)
            ? "Kiểm tra"
            : "Nhận trả",
        icon: ScanSearch,
        guidance: "Kiểm tra trang phục thủ công. Nhân viên chỉ đề xuất phí, Manager là người duyệt phí.",
    },
    {
        key: "settlement",
        title: "Quyết toán",
        statuses: ["SETTLEMENT_PENDING"],
        action: () => "Quyết toán",
        icon: ClipboardCheck,
        guidance: "Tổng hợp phí trả trễ và kết quả kiểm tra để đề xuất quyết toán. Khoản cần duyệt do Manager xử lý.",
    },
]

function StaffWorkQueues({ orders }) {
    return (
        <section aria-labelledby="staff-work-title">
            <div className="mb-4">
                <h2 id="staff-work-title" className="font-serif text-2xl font-semibold">
                    Công việc cần xử lý hôm nay
                </h2>
                <p className="mt-1 text-sm text-[#897d77]">
                    Các đơn được nhóm theo bước vận hành hiện tại.
                </p>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
                {QUEUES.map((queue) => {
                    const queueOrders = orders
                        .filter((order) => queue.statuses.includes(order.status))
                        .sort((left, right) =>
                            new Date(left.rentalStartAt) - new Date(right.rentalStartAt),
                        )
                    const Icon = queue.icon

                    return (
                        <article
                            key={queue.key}
                            className="flex min-h-[290px] flex-col overflow-hidden rounded-xl border border-[#eadfd6] bg-[#fffdf9]"
                        >
                            <header className="flex items-center justify-between gap-4 border-b border-[#eadfd6] px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fbe2de] text-[#a9544d]">
                                        <Icon size={20} />
                                    </span>
                                    <div>
                                        <h3 className="font-semibold text-[#453c38]">{queue.title}</h3>
                                        <p className="mt-0.5 text-xs text-[#897d77]">
                                            {queueOrders.length} đơn cần xử lý
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    to={`/staff/rentals?queue=${queue.key}`}
                                    className="inline-flex min-h-10 items-center gap-1 whitespace-nowrap rounded-lg px-3 text-xs font-semibold text-[#a9544d] transition hover:bg-[#f9eee9]"
                                >
                                    Xem tất cả
                                    <ArrowRight size={15} />
                                </Link>
                            </header>

                            <div className="flex-1 px-5">
                                {queueOrders.slice(0, 3).map((order) => (
                                    <div
                                        key={order.orderId}
                                        className="grid gap-3 border-b border-[#eadfd6]/70 py-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-semibold">#{shortId(order.orderId)}</p>
                                                <OrderStatusBadge status={order.status} />
                                            </div>
                                            <p className="mt-1 truncate text-xs text-[#766b66]">
                                                {order.customer?.fullName || "Khách hàng"} · {formatDate(order.rentalStartAt)}
                                            </p>
                                        </div>
                                        <Link
                                            to={`/staff/rentals/${order.orderId}`}
                                            className="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-lg border border-[#e4c9c4] bg-[#fffaf7] px-3 text-xs font-semibold text-[#a9544d] transition hover:border-[#f2a39b] hover:bg-[#fbe2de]"
                                        >
                                            {queue.action(order.status)}
                                        </Link>
                                    </div>
                                ))}

                                {!queueOrders.length && (
                                    <div className="flex h-28 items-center justify-center text-center text-sm text-[#897d77]">
                                        Không có đơn chờ xử lý.
                                    </div>
                                )}
                            </div>

                            <p className="border-t border-[#eadfd6] bg-[#faf6ef]/55 px-5 py-3 text-xs leading-5 text-[#766b66]">
                                {queue.guidance}
                            </p>
                        </article>
                    )
                })}
            </div>
        </section>
    )
}

export { QUEUES }
export default StaffWorkQueues
