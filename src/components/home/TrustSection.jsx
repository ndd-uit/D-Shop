import {
    CalendarCheck2,
    ClipboardCheck,
    PackageCheck,
    RefreshCcw,
} from "lucide-react"

const TRUST_ITEMS = [
    {
        title: "Đặt thuê dễ dàng",
        description: "Chọn thời gian nhận và trả ngay khi tìm trang phục.",
        Icon: CalendarCheck2,
    },
    {
        title: "Lựa chọn linh hoạt",
        description: "Tìm theo danh mục, kích thước, mức giá và từ khóa.",
        Icon: RefreshCcw,
    },
    {
        title: "Đối chiếu minh bạch",
        description: "Tình trạng trang phục được ghi nhận trong quá trình thuê.",
        Icon: ClipboardCheck,
    },
    {
        title: "Theo dõi rõ ràng",
        description: "Trạng thái đơn thuê được cập nhật theo từng giai đoạn.",
        Icon: PackageCheck,
    },
]

function TrustSection() {
    return (
        <section className="border-y border-brand-primary/20 bg-brand-surface/65 py-16 sm:py-20">
            <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:gap-8">
                {TRUST_ITEMS.map(({ title, description, Icon }) => (
                    <article key={title} className="text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-bg text-[#a9544d] shadow-[inset_0_0_0_1px_rgba(242,163,155,0.22)]">
                            <Icon size={27} strokeWidth={1.6} />
                        </div>
                        <h3 className="mt-5 text-sm font-bold text-brand-text">
                            {title}
                        </h3>
                        <p className="mx-auto mt-2 max-w-[250px] text-sm leading-relaxed text-gray-500">
                            {description}
                        </p>
                    </article>
                ))}
            </div>
        </section>
    )
}

export default TrustSection
