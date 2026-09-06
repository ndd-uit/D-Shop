import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Search, SlidersHorizontal, X } from "lucide-react"
import GarmentCard from "../components/garment/GarmentCard.jsx"
import { getGarments } from "../services/garmentApi.js"

const formatDate = (val) => {
    if (!val) return ""
    try {
        const [y, m, d] = val.split("-")
        return `${d}/${m}/${y}`
    } catch {
        return val
    }
}

function GarmentListPage() {
    const [garments, setGarments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [searchParams, setSearchParams] = useSearchParams()

    const keyword = searchParams.get("keyword") || ""
    const categoryId = searchParams.get("categoryId") || ""
    const size = searchParams.get("size") || ""
    const minPrice = searchParams.get("minPrice") || ""
    const maxPrice = searchParams.get("maxPrice") || ""
    const rentalStartAt = searchParams.get("rentalStartAt") || ""
    const returnDueAt = searchParams.get("returnDueAt") || ""

    useEffect(() => {
        let active = true
        const fetchGarments = async () => {
            setLoading(true)
            setError("")
            try {
                const query = {}
                if (keyword) query.keyword = keyword
                if (categoryId) query.categoryId = categoryId
                if (size) query.size = size
                if (minPrice) query.minPrice = minPrice
                if (maxPrice) query.maxPrice = maxPrice
                if (rentalStartAt && returnDueAt) {
                    query.rentalStartAt = rentalStartAt
                    query.returnDueAt = returnDueAt
                }

                const data = await getGarments(query)
                if (active) setGarments(Array.isArray(data) ? data : [])
            } catch (err) {
                console.error(err)
                if (active) setError(err.response?.data?.message || "Không thể tải danh sách trang phục.")
            } finally {
                if (active) setLoading(false)
            }
        }

        fetchGarments()
        return () => { active = false }
    }, [keyword, categoryId, size, minPrice, maxPrice, rentalStartAt, returnDueAt])

    const categoryName = useMemo(() => {
        if (!categoryId) return ""
        const match = garments.find((garment) =>
            (garment.category?.categoryId ?? garment.category?.id) === categoryId,
        )?.category
        return match ? match.name : "Danh mục"
    }, [garments, categoryId])

    const priceLabel = useMemo(() => {
        if (!minPrice && !maxPrice) return ""
        if (minPrice && maxPrice) return `${Number(minPrice).toLocaleString("vi-VN")}đ - ${Number(maxPrice).toLocaleString("vi-VN")}đ`
        if (minPrice) return `Từ ${Number(minPrice).toLocaleString("vi-VN")}đ`
        if (maxPrice) return `Dưới ${Number(maxPrice).toLocaleString("vi-VN")}đ`
        return ""
    }, [minPrice, maxPrice])

    const activeFilters = useMemo(() => {
        const items = []
        if (keyword) items.push({ key: "keyword", label: `Từ khóa: "${keyword}"` })
        if (categoryId) items.push({ key: "categoryId", label: `Danh mục: ${categoryName}` })
        if (size) items.push({ key: "size", label: `Kích thước: ${size}` })
        if (priceLabel) items.push({ key: "price", label: `Giá/ngày: ${priceLabel}` })
        if (rentalStartAt && returnDueAt) items.push({ key: "dates", label: `Lịch thuê: ${formatDate(rentalStartAt)} - ${formatDate(returnDueAt)}` })
        return items
    }, [keyword, categoryId, categoryName, size, priceLabel, rentalStartAt, returnDueAt])

    const handleSearchSubmit = (event) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        const val = formData.get("keyword")?.toString().trim() || ""
        const next = new URLSearchParams(searchParams)
        if (val) {
            next.set("keyword", val)
        } else {
            next.delete("keyword")
        }
        setSearchParams(next)
    }

    const removeFilter = (key) => {
        const next = new URLSearchParams(searchParams)
        if (key === "dates") {
            next.delete("rentalStartAt")
            next.delete("returnDueAt")
        } else if (key === "price") {
            next.delete("minPrice")
            next.delete("maxPrice")
        } else {
            next.delete(key)
        }
        setSearchParams(next)
    }

    const clearAllFilters = () => {
        setSearchParams(new URLSearchParams())
    }

    return (
        <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 md:py-12">
            {/* Header with Title and Search Input */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-serif text-3xl font-semibold text-brand-text sm:text-4xl">
                        {activeFilters.length > 0 ? "Kết quả tìm kiếm" : "Danh sách trang phục"}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {loading ? "Đang tìm kiếm trang phục..." : `${garments.length} trang phục phù hợp`}
                    </p>
                </div>

                <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72 md:w-80">
                    <Search
                        size={17}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                        key={keyword}
                        defaultValue={keyword}
                        type="search"
                        name="keyword"
                        placeholder="Tìm váy, suit, phụ kiện..."
                        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                    />
                </form>
            </div>

            {/* Active Filter Pills */}
            {activeFilters.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-[#eadfd6] bg-[#fffdf9] p-3 text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-[#897d77]">
                        <SlidersHorizontal size={14} />
                        Bộ lọc:
                    </span>
                    {activeFilters.map((filter) => (
                        <span
                            key={filter.key}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e1d6cf] bg-white px-2.5 py-1 font-medium text-[#5c463d]"
                        >
                            <span>{filter.label}</span>
                            <button
                                type="button"
                                onClick={() => removeFilter(filter.key)}
                                className="rounded p-0.5 text-gray-400 transition hover:bg-gray-100 hover:text-red-600"
                                aria-label={`Xóa lọc ${filter.label}`}
                            >
                                <X size={13} />
                            </button>
                        </span>
                    ))}
                    <button
                        type="button"
                        onClick={clearAllFilters}
                        className="ml-auto text-xs font-semibold text-[#b65e56] hover:underline"
                    >
                        Xóa tất cả bộ lọc
                    </button>
                </div>
            )}

            {/* Loading Skeleton */}
            {loading && (
                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                        <div key={item} className="animate-pulse overflow-hidden rounded-xl border border-gray-100 bg-white">
                            <div className="aspect-[4/5] bg-[#eee6df]" />
                            <div className="px-3 pb-3"><div className="mt-3 h-4 w-3/4 rounded bg-gray-200" /><div className="mt-2 h-4 w-1/2 rounded bg-gray-200" /></div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error Message */}
            {!loading && error && (
                <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && garments.length === 0 && (
                <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-12 text-center text-gray-500">
                    {activeFilters.length > 0 ? (
                        <>
                            <p className="text-base font-semibold text-[#453c38]">
                                Không tìm thấy trang phục nào phù hợp
                            </p>
                            <p className="mt-1 text-sm text-[#897d77]">
                                Hãy thử thay đổi từ khóa, ngày thuê hoặc mức giá khác.
                            </p>
                            <button
                                type="button"
                                onClick={clearAllFilters}
                                className="mt-4 inline-flex items-center rounded-xl bg-[#f2a39b] px-4 py-2 text-xs font-semibold text-[#453c38] transition hover:bg-[#ee9188]"
                            >
                                Xóa bộ lọc và xem tất cả
                            </button>
                        </>
                    ) : (
                        <p>Chưa có trang phục nào trong danh mục.</p>
                    )}
                </div>
            )}

            {/* Garment Grid */}
            {!loading && !error && garments.length > 0 && (
                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                    {garments.map((garment) => (
                        <GarmentCard key={garment.garmentId} garment={garment} />
                    ))}
                </div>
            )}
        </main>
    )
}

export default GarmentListPage
