import { Clock3, ExternalLink, MapPin } from "lucide-react"

import { STORE_INFO } from "../../constants/store.js"

function StoreLocationCard({ className = "" }) {
    return (
        <article
            className={`rounded-2xl border border-[#e9e0d8] bg-brand-surface p-5 sm:p-7 ${className}`}
        >
            <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fbe2de] text-[#a9544d]">
                    <MapPin size={20} strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                    <h2 className="text-base font-bold text-brand-text sm:text-lg">
                        Nhận &amp; trả tại cửa hàng
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-brand-text">
                        {STORE_INFO.name}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-gray-600">
                        {STORE_INFO.address}
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <Clock3 size={15} strokeWidth={1.8} />
                        Giờ hoạt động: {STORE_INFO.openingHours}
                    </p>
                    <a
                        href={STORE_INFO.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#a9544d] transition hover:underline"
                    >
                        Xem trên Google Maps
                        <ExternalLink size={14} strokeWidth={1.8} />
                    </a>
                </div>
            </div>
        </article>
    )
}

export default StoreLocationCard
