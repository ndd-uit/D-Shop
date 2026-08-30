import { getOrderStatusMeta } from "./orderStatus.js"

function OrderStatusBadge({ status }) {
    const meta = getOrderStatusMeta(status)

    return (
        <span
            className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold ${meta.className}`}
        >
            {meta.label}
        </span>
    )
}

export default OrderStatusBadge
