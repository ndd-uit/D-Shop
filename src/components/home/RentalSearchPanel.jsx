import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
    CalendarDays,
    Search,
    Shirt,
    Ruler,
    WalletCards,
} from "lucide-react"

import CustomSelect from "../common/CustomSelect.jsx"

const PRICE_RANGES = [
    { label: "Tất cả mức giá", min: "", max: "" },
    { label: "Dưới 500.000đ", min: "", max: "500000" },
    { label: "500.000đ - 1.000.000đ", min: "500000", max: "1000000" },
    { label: "Trên 1.000.000đ", min: "1000000", max: "" },
]

function RentalSearchPanel({
    categories = [],
    sizes = [],
}) {
    const navigate = useNavigate()
    const [validationError, setValidationError] = useState("")

    const [filters, setFilters] = useState({
        rentalStartAt: "",
        returnDueAt: "",
        categoryId: "",
        size: "",
        priceRange: "0",
        keyword: "",
    })

    const handleChange = (event) => {
        const { name, value } = event.target

        if (validationError) {
            setValidationError("")
        }

        setFilters((current) => ({
            ...current,
            [name]: value,
        }))
    }

    const handleSubmit = (event) => {
        event.preventDefault()

        if (
            filters.rentalStartAt &&
            filters.returnDueAt &&
            new Date(filters.returnDueAt) < new Date(filters.rentalStartAt)
        ) {
            setValidationError("Ngày trả không được trước ngày nhận.")
            return
        }

        const params = new URLSearchParams()

        if (filters.rentalStartAt) {
            params.set("rentalStartAt", filters.rentalStartAt)
        }

        if (filters.returnDueAt) {
            params.set("returnDueAt", filters.returnDueAt)
        }

        if (filters.categoryId) {
            params.set("categoryId", filters.categoryId)
        }

        if (filters.size) {
            params.set("size", filters.size)
        }

        if (filters.keyword.trim()) {
            params.set("keyword", filters.keyword.trim())
        }

        const selectedPrice =
            PRICE_RANGES[Number(filters.priceRange)]

        if (selectedPrice.min) {
            params.set("minPrice", selectedPrice.min)
        }

        if (selectedPrice.max) {
            params.set("maxPrice", selectedPrice.max)
        }

        navigate(
            `/garments${params.toString() ? `?${params.toString()}` : ""}`,
        )
    }

    return (
        <section
            aria-label="Tìm trang phục theo lịch thuê"
            className="relative mx-auto -mt-16 w-full max-w-[1200px] px-4 sm:px-6"
        >
            <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-white/70 bg-brand-surface p-4 shadow-[0_22px_55px_rgba(92,70,61,0.13)] sm:p-6"
            >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    {/* Ngày nhận */}
                    <label className="block">
                        <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <CalendarDays size={15} />
                            Ngày nhận
                        </span>

                        <input
                            type="date"
                            name="rentalStartAt"
                            value={filters.rentalStartAt}
                            onChange={handleChange}
                            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                        />
                        <span className="mt-1 block text-xs text-gray-400">
                            Nhận từ 08:00
                        </span>
                    </label>

                    {/* Ngày trả */}
                    <label className="block">
                        <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <CalendarDays size={15} />
                            Ngày trả
                        </span>

                        <input
                            type="date"
                            name="returnDueAt"
                            value={filters.returnDueAt}
                            onChange={handleChange}
                            min={filters.rentalStartAt || undefined}
                            aria-invalid={Boolean(validationError)}
                            aria-describedby={validationError ? "rental-period-error" : undefined}
                            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                        />
                        <span className="mt-1 block text-xs text-gray-400">
                            Trả trước 18:00
                        </span>
                    </label>

                    {/* Danh mục */}
                    <label className="block">
                        <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <Shirt size={15} />
                            Danh mục
                        </span>

                        <CustomSelect
                            name="categoryId"
                            value={filters.categoryId}
                            onChange={handleChange}
                            options={categories.map((c) => ({
                                value: c.categoryId ?? c.id,
                                label: c.name,
                            }))}
                            placeholder="Tất cả danh mục"
                            ariaLabel="Chọn danh mục"
                            buttonClassName="bg-white"
                        />
                    </label>

                    {/* Kích thước */}
                    <label className="block">
                        <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <Ruler size={15} />
                            Kích thước
                        </span>

                        <CustomSelect
                            name="size"
                            value={filters.size}
                            onChange={handleChange}
                            options={sizes}
                            placeholder="Tất cả kích thước"
                            ariaLabel="Chọn kích thước"
                            buttonClassName="bg-white"
                        />
                    </label>

                    {/* Giá thuê */}
                    <label className="block">
                        <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <WalletCards size={15} />
                            Giá thuê
                        </span>

                        <CustomSelect
                            name="priceRange"
                            value={filters.priceRange}
                            onChange={handleChange}
                            options={PRICE_RANGES.map((range, index) => ({
                                value: index,
                                label: range.label,
                            }))}
                            ariaLabel="Chọn khoảng giá"
                            buttonClassName="bg-white"
                        />
                    </label>

                    {/* Search */}
                    <div className="flex flex-col">
                        <span className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Tìm kiếm
                        </span>

                        <button
                            type="submit"
                            className="flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-primary px-5 text-sm font-semibold text-[#382d29] transition hover:bg-[#ee9188] active:translate-y-px"
                        >
                            <Search size={17} />
                            Tìm trang phục
                        </button>
                    </div>
                </div>

                <div className="mt-4 border-t border-gray-100 pt-4">
                    <div className="relative">
                        <Search
                            size={17}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                            type="search"
                            name="keyword"
                            value={filters.keyword}
                            onChange={handleChange}
                            placeholder="Tìm váy, suit, phụ kiện..."
                            className="h-11 w-full rounded-xl bg-brand-bg pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-brand-primary/30"
                        />
                    </div>

                    {validationError && (
                        <p
                            id="rental-period-error"
                            role="alert"
                            className="mt-2 text-sm font-medium text-red-700"
                        >
                            {validationError}
                        </p>
                    )}
                </div>
            </form>
        </section>
    )
}

export default RentalSearchPanel
