import { useEffect, useMemo, useState } from "react"
import { ArrowRight, RefreshCw, Shirt } from "lucide-react"
import { Link } from "react-router-dom"

import { getFirstImage } from "../components/rental/rentalOrderUtils.js"
import { getCatalogGarments } from "../services/garmentApi.js"

function CategoriesPage() {
    const [garments, setGarments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [reload, setReload] = useState(0)

    useEffect(() => {
        let active = true

        const load = async () => {
            setLoading(true)
            setError("")

            try {
                const data = await getCatalogGarments()
                if (active) setGarments(Array.isArray(data) ? data : [])
            } catch (requestError) {
                if (active) {
                    setError(requestError.response?.data?.message || "Không thể tải danh mục trang phục.")
                }
            } finally {
                if (active) setLoading(false)
            }
        }

        load()
        return () => { active = false }
    }, [reload])

    const categories = useMemo(() => {
        const grouped = new Map()

        garments.forEach((garment) => {
            const category = garment.category
            const categoryId = category?.categoryId ?? category?.id

            if (!categoryId || !category?.name) return

            const current = grouped.get(categoryId) ?? {
                categoryId,
                name: category.name,
                garmentCount: 0,
                imageUrl: "",
            }

            current.garmentCount += 1
            current.imageUrl ||= getFirstImage(garment.imageUrls)
            grouped.set(categoryId, current)
        })

        return Array.from(grouped.values()).sort((first, second) =>
            first.name.localeCompare(second.name, "vi"),
        )
    }, [garments])

    return (
        <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 md:py-12">
            <header>
                <h1 className="font-serif text-3xl font-semibold text-brand-text sm:text-4xl">
                    Danh mục trang phục
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    {loading ? "Đang tải danh mục..." : `${categories.length} danh mục đang hiển thị`}
                </p>
            </header>

            {loading && (
                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                    {Array.from({ length: 10 }, (_, index) => (
                        <div key={index} className="animate-pulse overflow-hidden rounded-xl border border-[#eadfd6] bg-[#fffdf9]">
                            <div className="aspect-[4/5] bg-[#eee6df]" />
                            <div className="space-y-2 p-3 sm:p-4">
                                <div className="h-4 w-2/3 rounded bg-[#e7ddd6]" />
                                <div className="h-3 w-1/3 rounded bg-[#eee6df]" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && error && (
                <section className="mt-9 rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
                    <p className="text-sm text-red-700">{error}</p>
                    <button type="button" onClick={() => setReload((value) => value + 1)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 active:scale-[.98]">
                        <RefreshCw size={16} />Thử lại
                    </button>
                </section>
            )}

            {!loading && !error && categories.length === 0 && (
                <section className="mt-9 rounded-2xl border border-[#eadfd6] bg-[#fffdf9] px-6 py-12 text-center">
                    <Shirt size={34} className="mx-auto text-[#b65e56]" />
                    <h2 className="mt-4 text-lg font-semibold">Chưa có danh mục đang kinh doanh</h2>
                    <p className="mt-2 text-sm text-[#897d77]">Danh mục sẽ xuất hiện khi có trang phục đang hoạt động.</p>
                </section>
            )}

            {!loading && !error && categories.length > 0 && (
                <section aria-label="Danh sách danh mục" className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                    {categories.map((category) => (
                        <Link
                            key={category.categoryId}
                            to={`/garments?categoryId=${encodeURIComponent(category.categoryId)}`}
                            className="group overflow-hidden rounded-xl border border-[#eadfd6] bg-[#fffdf9] shadow-[0_8px_24px_rgba(92,70,61,0.05)] transition duration-300 hover:-translate-y-0.5 hover:border-[#dfc8c1] hover:shadow-[0_12px_30px_rgba(92,70,61,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-4"
                        >
                            <div className="flex aspect-[4/5] items-center justify-center overflow-hidden bg-[#f1eae4]">
                                {category.imageUrl ? (
                                    <img
                                        src={category.imageUrl}
                                        alt={`Trang phục thuộc danh mục ${category.name}`}
                                        loading="lazy"
                                        className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.02]"
                                    />
                                ) : (
                                    <Shirt size={44} strokeWidth={1.5} className="text-[#c57a72]" />
                                )}
                            </div>
                            <div className="flex items-end justify-between gap-2.5 p-3 sm:p-4">
                                <div className="min-w-0">
                                    <h2 className="truncate font-serif text-lg font-semibold text-brand-text sm:text-xl">{category.name}</h2>
                                    <p className="mt-0.5 text-xs text-[#897d77] sm:text-sm">{category.garmentCount} mẫu trang phục</p>
                                </div>
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#e5d4cc] text-[#a9544d] transition group-hover:bg-[#fbe2de] sm:size-9" aria-hidden="true">
                                    <ArrowRight size={16} />
                                </span>
                            </div>
                        </Link>
                    ))}
                </section>
            )}
        </main>
    )
}

export default CategoriesPage
