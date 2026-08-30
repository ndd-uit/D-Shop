import { ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"

import GarmentCard from "../garment/GarmentCard"

function FeaturedGarments({ garments = [], loading = false, error = "" }) {
    return (
        <section
            id="featured"
            className="mx-auto w-full max-w-[1200px] scroll-mt-24 px-4 pb-20 sm:px-6 sm:pb-24"
        >
            <div className="mb-8 flex items-end justify-between gap-5">
                <div>
                    <h2 className="font-serif text-3xl tracking-[-0.02em] text-brand-text sm:text-4xl">
                        Trang phục nổi bật
                    </h2>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-500 sm:text-base">
                        Một số lựa chọn từ danh sách trang phục hiện có.
                    </p>
                </div>

                <Link
                    to="/garments"
                    className="hidden shrink-0 items-center gap-2 text-sm font-semibold text-[#a9544d] transition hover:gap-3 sm:inline-flex"
                >
                    Xem tất cả
                    <ArrowRight size={17} strokeWidth={1.8} />
                </Link>
            </div>

            {loading && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,220px))] sm:gap-4 lg:gap-5">
                    {Array.from({ length: 4 }, (_, index) => (
                        <div
                            key={index}
                            className="overflow-hidden rounded-xl border border-gray-100 bg-brand-surface"
                            aria-hidden="true"
                        >
                            <div className="aspect-[4/5] bg-[#eadfd7]" />
                            <div className="px-3 pb-3"><div className="mt-3 h-3 w-16 rounded bg-[#eadfd7]" /><div className="mt-2 h-4 w-3/4 rounded bg-[#eadfd7]" /><div className="mt-3 h-4 w-24 rounded bg-[#eadfd7]" /></div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && error && (
                <div className="rounded-2xl border border-brand-primary/30 bg-brand-surface px-6 py-10 text-center text-sm text-gray-600">
                    Không thể tải trang phục nổi bật lúc này.
                </div>
            )}

            {!loading && !error && garments.length === 0 && (
                <div className="rounded-2xl border border-gray-200 bg-brand-surface px-6 py-10 text-center text-sm text-gray-500">
                    Chưa có trang phục để giới thiệu.
                </div>
            )}

            {!loading && !error && garments.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,220px))] sm:gap-4 lg:gap-5">
                    {garments.map((garment) => (
                        <GarmentCard
                            key={garment.garmentId}
                            garment={garment}
                        />
                    ))}
                </div>
            )}

            <Link
                to="/garments"
                className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#a9544d] sm:hidden"
            >
                Xem tất cả
                <ArrowRight size={17} strokeWidth={1.8} />
            </Link>
        </section>
    )
}

export default FeaturedGarments
