import { Link, useLocation } from 'react-router-dom'

const formatCurrency = (value) => {
    const number = Number(value)

    if (!Number.isFinite(number)) {
        return 'Liên hệ'
    }

    return `${number.toLocaleString('vi-VN')}đ`
}

const getFirstImage = (imageUrls) => {
    if (Array.isArray(imageUrls)) {
        return imageUrls.find(Boolean) || ''
    }

    if (typeof imageUrls !== 'string' || !imageUrls.trim()) {
        return ''
    }

    const value = imageUrls.trim()

    if (value.startsWith('[')) {
        try {
            const parsed = JSON.parse(value)
            return Array.isArray(parsed) ? parsed.find(Boolean) || '' : value
        } catch {
            return value
        }
    }

    return value
}

const GarmentCard = ({ garment }) => {
    const location = useLocation()
    const imageUrl = getFirstImage(garment.imageUrls)
    const sizes = Array.from(
        new Set(
            garment.rentalUnits
                ?.map((unit) => unit?.size?.trim())
                .filter(Boolean) ?? [],
        ),
    )

    return (
        <Link
            to={{ pathname: `/garments/${garment.garmentId}`, search: location.search }}
            className="group block h-full min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-4"
        >
            <article className="flex h-full flex-col overflow-hidden rounded-xl border border-[#eee5de] bg-brand-surface shadow-[0_8px_24px_rgba(92,70,61,0.07)] transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_30px_rgba(92,70,61,0.11)]">
                <div className="relative aspect-[4/5] overflow-hidden bg-[#eee6df]">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={garment.name}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-gray-400">
                            Chưa có ảnh
                        </div>
                    )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col px-3 pb-3 pt-3">
                    <p className="truncate text-[11px] font-medium text-gray-500 sm:text-xs">
                        {garment.category?.name}
                    </p>

                    <h2 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-brand-text sm:text-[15px]">
                        {garment.name}
                    </h2>

                    <div className="mt-2.5 flex min-w-0 items-end justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-[10px] text-gray-500 sm:text-[11px]">Giá thuê</p>
                            <p className="truncate text-[15px] font-bold text-[#b85f57] sm:text-base">
                                {formatCurrency(garment.rentalPrice)}
                            </p>
                        </div>

                        {sizes.length > 0 && (
                            <span
                                title={`Kích thước: ${sizes.join(', ')}`}
                                className="max-w-[45%] truncate text-right text-[10px] font-medium text-gray-500 sm:text-[11px]"
                            >
                                {sizes.join(' · ')}
                            </span>
                        )}
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-2.5 text-[10px] sm:text-[11px]">
                        <span className="text-gray-500">Tiền cọc</span>
                        <span className="truncate font-semibold text-brand-text">
                            {formatCurrency(garment.depositAmount)}
                        </span>
                    </div>
                </div>
            </article>
        </Link>
    )
}

export default GarmentCard
