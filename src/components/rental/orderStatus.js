const STATUS_META = {
    PENDING_PAYMENT: {
        label: "Chờ thanh toán",
        description: "Đơn đang chờ thanh toán trong thời gian giữ chỗ.",
        className: "bg-[#fbe2de] text-[#713732]",
    },
    CONFIRMED: {
        label: "Đã xác nhận",
        description: "Thanh toán đã được ghi nhận và đơn thuê đã được xác nhận.",
        className: "bg-[#e8f3ed] text-[#315b49]",
    },
    PREPARING: {
        label: "Đang chuẩn bị",
        description: "Cửa hàng đang chuẩn bị trang phục cho lịch nhận của bạn.",
        className: "bg-[#eef5f1] text-[#3a4a43]",
    },
    READY_FOR_PICKUP: {
        label: "Sẵn sàng nhận",
        description: "Trang phục đã sẵn sàng để nhận theo lịch.",
        className: "bg-[#dceee5] text-[#315b49]",
    },
    RENTING: {
        label: "Đang thuê",
        description: "Trang phục đã được bàn giao và đang trong thời gian thuê.",
        className: "bg-[#fbe2de] text-[#713732]",
    },
    OVERDUE: {
        label: "Quá hạn",
        description: "Đơn đã quá thời gian trả dự kiến. Vui lòng liên hệ cửa hàng.",
        className: "bg-[#fff0dc] text-[#8a4f14]",
    },
    RETURNED: {
        label: "Đã trả",
        description: "Cửa hàng đã ghi nhận việc trả trang phục.",
        className: "bg-[#eef1f3] text-[#4b5660]",
    },
    INSPECTING: {
        label: "Đang kiểm tra",
        description: "Trang phục đang được kiểm tra sau khi trả.",
        className: "bg-[#eef1f3] text-[#4b5660]",
    },
    SETTLEMENT_PENDING: {
        label: "Chờ quyết toán",
        description: "Đơn đang chờ hoàn tất các khoản thanh toán hoặc hoàn tiền.",
        className: "bg-[#eee6f2] text-[#664674]",
    },
    COMPLETED: {
        label: "Hoàn tất",
        description: "Đơn thuê đã hoàn tất.",
        className: "bg-[#eef1f3] text-[#4b5660]",
    },
    EXPIRED: {
        label: "Hết thời gian thanh toán",
        description: "Thời gian giữ chỗ đã hết trước khi đơn được thanh toán.",
        className: "bg-[#f1ece9] text-[#6e625d]",
    },
    NO_SHOW: {
        label: "Khách không đến nhận",
        description: "Khách hàng không đến nhận trang phục theo lịch hẹn.",
        className: "bg-[#fff0dc] text-[#8a4f14]",
    },
    FULFILLMENT_FAILED: {
        label: "Cửa hàng không thể thực hiện đơn",
        description: "Cửa hàng không thể chuẩn bị hoặc giao trang phục cho đơn thuê này.",
        className: "bg-[#f1ece9] text-[#6e625d]",
    },
}

const getOrderStatusMeta = (status) =>
    STATUS_META[status] ?? {
        label: status || "Không xác định",
        description: "Trạng thái đơn đang được cập nhật.",
        className: "bg-[#eef1f3] text-[#4b5660]",
    }

export { getOrderStatusMeta }
