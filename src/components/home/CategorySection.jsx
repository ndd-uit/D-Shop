import { Shirt } from "lucide-react"
import { Link } from "react-router-dom"

function CategorySection({ categories = [], loading = false, error = "" }) {
    return (
        <section id="categories" className="mx-auto w-full max-w-[1200px] scroll-mt-24 px-4 py-8 sm:py-10">
            <div className="mx-auto mb-6 max-w-xl text-center sm:mb-8">
                <h2 className="font-serif text-3xl tracking-[-0.02em] text-brand-text sm:text-4xl">
                    Khám phá theo danh mục
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-500 sm:text-base">
                    Chọn nhanh nhóm trang phục phù hợp với dịp của bạn.
                </p>
            </div>

            {loading && (
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                    {Array.from({ length: 6 }, (_, index) => (
                        <div
                            key={index}
                            className="flex animate-pulse flex-col items-center"
                            aria-hidden="true"
                        >
                            <div className="aspect-square w-20 rounded-full bg-[#eadfd7] sm:w-24 lg:w-28" />
                            <div className="mt-3 h-4 w-16 rounded bg-[#eadfd7]" />
                        </div>
                    ))}
                </div>
            )}

            {!loading && error && (
                <div className="rounded-2xl border border-brand-primary/30 bg-brand-surface px-6 py-8 text-center text-sm text-gray-600">
                    Danh mục chưa thể hiển thị. Bạn vẫn có thể tìm kiếm theo từ khóa.
                </div>
            )}

            {!loading && !error && categories.length === 0 && (
                <div className="rounded-2xl border border-gray-200 bg-brand-surface px-6 py-8 text-center text-sm text-gray-500">
                    Chưa có danh mục trang phục để hiển thị.
                </div>
            )}

            {!loading && !error && categories.length > 0 && (
                <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
                    {categories.slice(0, 6).map((category) => (
                        <Link
                            key={category.categoryId}
                            to={`/garments?categoryId=${encodeURIComponent(category.categoryId)}`}
                            className="group flex flex-col items-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-4"
                        >
                            <div className="flex aspect-square w-20 items-center justify-center overflow-hidden rounded-full border border-[#e7dcd4] bg-brand-surface shadow-[0_8px_22px_rgba(92,70,61,0.08)] transition duration-300 group-hover:-translate-y-0.5 sm:w-24 lg:w-28">
                                {category.imageUrl ? (
                                    <img
                                        src={category.imageUrl}
                                        alt={`Danh mục ${category.name}`}
                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <Shirt
                                        size={34}
                                        strokeWidth={1.5}
                                        className="text-brand-primary"
                                    />
                                )}
                            </div>

                            <span className="mt-3 text-xs font-semibold text-brand-text transition-colors group-hover:text-[#bc675f] sm:text-sm">
                                {category.name}
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    )
}

export default CategorySection
