import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import logo from "../../assets/logo.png"
import { getCatalogGarments } from "../../services/garmentApi.js"

function Footer({ categories = [] }) {
    const [catalog, setCatalog] = useState([])

    useEffect(() => {
        let active = true

        getCatalogGarments()
            .then((data) => {
                if (active) setCatalog(data)
            })
            .catch(() => {
                if (active) setCatalog([])
            })

        return () => {
            active = false
        }
    }, [])

    const visibleCategories = useMemo(() => {
        if (categories.length > 0) return categories

        const grouped = new Map()
        catalog.forEach((garment) => {
            const category = garment.category
            const categoryId = category?.categoryId ?? category?.id

            if (categoryId && category?.name && !grouped.has(categoryId)) {
                grouped.set(categoryId, {
                    categoryId,
                    name: category.name,
                })
            }
        })

        return Array.from(grouped.values()).sort((first, second) =>
            first.name.localeCompare(second.name, "vi"),
        )
    }, [catalog, categories])

    return (
        <footer className="border-t border-[#eee7e1] bg-white py-6 text-[15px] leading-5">
            <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
                <div className="grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(8rem,auto)_minmax(8rem,auto)] md:gap-x-14">
                    <div className="max-w-md">
                        <Link to="/" className="inline-flex">
                            <img
                                src={logo}
                                alt="D Shop"
                                className="h-7 w-auto object-contain"
                            />
                        </Link>
                        <p className="mt-2.5 max-w-sm text-gray-500">
                            Nền tảng thuê trang phục theo lịch, hỗ trợ tìm kiếm và theo dõi đơn rõ ràng.
                        </p>
                    </div>

                    <div>
                        <h2 className="font-semibold text-brand-text">
                            <Link to="/categories" className="transition-colors hover:text-[#a9544d]">Danh mục</Link>
                        </h2>
                        <ul className="mt-2 space-y-1">
                            {visibleCategories.slice(0, 4).map((category) => (
                                <li key={category.categoryId}>
                                    <Link
                                        to={`/garments?categoryId=${encodeURIComponent(category.categoryId)}`}
                                        className="text-gray-500 transition-colors hover:text-[#a9544d]"
                                    >
                                        {category.name}
                                    </Link>
                                </li>
                            ))}
                            {visibleCategories.length === 0 && (
                                <li>
                                    <Link
                                        to="/categories"
                                        className="text-gray-500 transition-colors hover:text-[#a9544d]"
                                    >
                                        Tất cả danh mục
                                    </Link>
                                </li>
                            )}
                        </ul>
                    </div>

                    <div>
                        <h2 className="font-semibold text-brand-text">
                            Khám phá
                        </h2>
                        <ul className="mt-2 space-y-1">
                            <li>
                                <Link to="/" className="text-gray-500 transition-colors hover:text-[#a9544d]">
                                    Trang chủ
                                </Link>
                            </li>
                            <li>
                                <Link to="/garments" className="text-gray-500 transition-colors hover:text-[#a9544d]">
                                    Trang phục
                                </Link>
                            </li>
                            <li>
                                <a href="/#featured" className="text-gray-500 transition-colors hover:text-[#a9544d]">
                                    Bộ sưu tập
                                </a>
                            </li>
                            <li>
                                <Link to="/my-rentals" className="text-gray-500 transition-colors hover:text-[#a9544d]">
                                    Đơn thuê của tôi
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-5 border-t border-[#eee7e1] pt-3 text-center sm:text-left">
                    <p className="text-gray-400 text-center">
                        © {new Date().getFullYear()} D Shop. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    )
}

export default Footer
