import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ChevronDown, ChevronRight, Info, Palette, Ruler } from "lucide-react"

import GarmentCard from "../components/garment/GarmentCard.jsx"
import GarmentGallery from "../components/garment/GarmentGallery.jsx"
import RentalSelectionPanel from "../components/garment/RentalSelectionPanel.jsx"
import { getGarmentById, getGarments } from "../services/garmentApi.js"

const formatCurrency = (value) => {
    const number = Number(value)

    return Number.isFinite(number)
        ? `${number.toLocaleString("vi-VN")}đ`
        : "Liên hệ"
}

function DetailDisclosure({ title, children, open = false }) {
    return (
        <details className="group border-t border-gray-200 py-4" open={open}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-brand-text transition hover:text-[#a9544d]">
                <span>{title}</span>
                <ChevronDown
                    size={19}
                    className="shrink-0 transition group-open:rotate-180"
                />
            </summary>
            <div className="pt-4 text-sm leading-relaxed text-gray-600">
                {children}
            </div>
        </details>
    )
}

function GarmentDetailPage() {
    const { id } = useParams()
    const [garment, setGarment] = useState(null)
    const [allGarments, setAllGarments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        let active = true

        const fetchGarment = async () => {
            setLoading(true)
            setError("")

            try {
                const data = await getGarmentById(id)
                if (active) setGarment(data)
            } catch (requestError) {
                if (!active) return

                if (requestError.response?.status === 404) {
                    setError("Trang phục không tồn tại.")
                } else if (requestError.response?.status === 400) {
                    setError("ID trang phục không hợp lệ.")
                } else {
                    setError("Không thể tải chi tiết trang phục.")
                }
            } finally {
                if (active) setLoading(false)
            }
        }

        const fetchRelatedGarments = async () => {
            try {
                const data = await getGarments()
                if (active) setAllGarments(Array.isArray(data) ? data : [])
            } catch {
                if (active) setAllGarments([])
            }
        }

        fetchGarment()
        fetchRelatedGarments()

        return () => {
            active = false
        }
    }, [id])

    const sizes = useMemo(
        () =>
            Array.from(
                new Set(
                    garment?.rentalUnits
                        ?.map((unit) => unit?.size?.trim())
                        .filter(Boolean) ?? [],
                ),
            ),
        [garment],
    )

    const relatedGarments = useMemo(() => {
        if (!garment) return []

        return allGarments
            .filter((item) => item.garmentId !== garment.garmentId)
            .sort((first, second) => {
                const firstSameCategory =
                    first.categoryId === garment.categoryId ? 1 : 0
                const secondSameCategory =
                    second.categoryId === garment.categoryId ? 1 : 0

                return secondSameCategory - firstSameCategory
            })
            .slice(0, 4)
    }, [allGarments, garment])


    if (loading) {
        return (
            <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:py-14">
                <div className="mb-8 h-4 w-64 animate-pulse rounded bg-gray-200" />
                <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
                    <div className="aspect-[3/4] animate-pulse rounded-2xl bg-[#eee6df]" />
                    <div className="space-y-5 py-4">
                        <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
                        <div className="h-12 w-4/5 animate-pulse rounded bg-gray-200" />
                        <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
                        <div className="h-40 animate-pulse rounded-2xl bg-white" />
                    </div>
                </div>
            </div>
        )
    }

    if (error || !garment) {
        return (
            <div className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
                <h1 className="font-serif text-3xl text-brand-text">
                    Không tìm thấy trang phục
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">
                    {error || "Dữ liệu trang phục hiện không khả dụng."}
                </p>
                <Link
                    to="/garments"
                    className="mt-6 rounded-full bg-brand-primary px-6 py-2.5 text-sm font-semibold text-[#382d29] transition hover:bg-[#ee9188]"
                >
                    Quay lại danh sách
                </Link>
            </div>
        )
    }

    return (
        <>
            <div className="mx-auto w-full max-w-[1200px] px-4 pb-20 pt-7 sm:px-6 lg:pb-24 lg:pt-10">
                <nav
                    aria-label="Đường dẫn trang"
                    className="mb-7 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 sm:text-sm"
                >
                    <Link to="/garments" className="transition hover:text-[#a9544d]">
                        Trang phục
                    </Link>
                    <ChevronRight size={14} />
                    {garment.category && (
                        <>
                            <Link
                                to={`/garments?categoryId=${encodeURIComponent(garment.category.categoryId)}`}
                                className="transition hover:text-[#a9544d]"
                            >
                                {garment.category.name}
                            </Link>
                            <ChevronRight size={14} />
                        </>
                    )}
                    <span className="font-medium text-brand-text">{garment.name}</span>
                </nav>

                <section className="grid items-start gap-10 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)] lg:gap-12 xl:gap-16">
                    <GarmentGallery
                        imageUrls={garment.imageUrls}
                        garmentName={garment.name}
                    />

                    <div className="flex flex-col lg:pt-2">
                        <div>
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                                {garment.category?.name || "Trang phục"}
                            </span>
                            <h1 className="font-serif text-3xl leading-tight text-brand-text sm:text-4xl">
                                {garment.name}
                            </h1>

                            <div className="mt-5">
                                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                                    Giá thuê/ngày
                                </p>
                                <p className="mt-1 text-2xl font-bold text-[#b85f57]">
                                    {formatCurrency(garment.rentalPrice)}/ngày
                                </p>
                            </div>

                            <div className="mt-5 flex items-start gap-2 rounded-xl border border-gray-100 bg-brand-surface p-3 text-sm leading-relaxed text-gray-600">
                                <Info size={17} className="mt-0.5 shrink-0 text-[#a9544d]" />
                                <span>
                                    Tiền cọc: <strong>{formatCurrency(garment.depositAmount)}</strong>.
                                    Tiền cọc được quyết toán sau khi hoàn trả và kiểm tra trang phục.
                                </span>
                            </div>
                        </div>

                        {garment.description && (
                            <p className="my-7 text-sm leading-7 text-gray-600">
                                {garment.description}
                            </p>
                        )}

                        <RentalSelectionPanel garment={garment} />

                        <div className="mt-8">
                            <DetailDisclosure title="Thông tin trang phục" open>
                                <dl className="grid gap-3 sm:grid-cols-2">
                                    {garment.color && (
                                        <div className="flex items-center gap-2">
                                            <Palette size={16} className="text-[#a9544d]" />
                                            <dt className="text-gray-500">Màu sắc:</dt>
                                            <dd className="font-medium text-brand-text">
                                                {garment.color}
                                            </dd>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Ruler size={16} className="text-[#a9544d]" />
                                        <dt className="text-gray-500">Kích thước:</dt>
                                        <dd className="font-medium text-brand-text">
                                            {sizes.length > 0 ? sizes.join(", ") : "Đang cập nhật"}
                                        </dd>
                                    </div>
                                </dl>
                            </DetailDisclosure>

                            <DetailDisclosure title="Lưu ý khi thuê">
                                Vui lòng kiểm tra tình trạng trang phục khi nhận. Phí trả trễ,
                                hư hỏng hoặc thiếu phụ kiện được xác định theo kết quả kiểm tra
                                và chính sách áp dụng cho đơn thuê.
                            </DetailDisclosure>
                        </div>
                    </div>
                </section>

                {relatedGarments.length > 0 && (
                    <section className="mt-20 lg:mt-24" aria-labelledby="related-title">
                        <div className="mb-8 flex items-end justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a9544d]">
                                    Gợi ý thêm
                                </p>
                                <h2 id="related-title" className="mt-2 font-serif text-3xl text-brand-text">
                                    Có thể bạn cũng thích
                                </h2>
                            </div>
                            <Link
                                to="/garments"
                                className="hidden text-sm font-semibold text-[#a9544d] hover:underline sm:block"
                            >
                                Xem tất cả
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,220px))] sm:gap-4 lg:gap-5">
                            {relatedGarments.map((item) => (
                                <GarmentCard key={item.garmentId} garment={item} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </>
    )
}

export default GarmentDetailPage
