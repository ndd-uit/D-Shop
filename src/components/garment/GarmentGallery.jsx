import { useMemo, useState } from "react"
import { ImageIcon } from "lucide-react"

const parseImageUrls = (imageUrls) => {
    if (Array.isArray(imageUrls)) return imageUrls.filter(Boolean)

    if (typeof imageUrls !== "string" || !imageUrls.trim()) return []

    const value = imageUrls.trim()

    if (value.startsWith("[")) {
        try {
            const parsed = JSON.parse(value)
            return Array.isArray(parsed) ? parsed.filter(Boolean) : [value]
        } catch {
            return [value]
        }
    }

    return [value]
}

function GarmentGallery({ imageUrls, garmentName }) {
    const images = useMemo(() => parseImageUrls(imageUrls), [imageUrls])
    const [activeIndex, setActiveIndex] = useState(0)
    const activeImage = images[activeIndex] ?? images[0] ?? ""

    return (
        <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4 lg:mx-0 lg:max-w-none">
            <div className="group relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-gray-100 bg-[#eee6df]">
                {activeImage ? (
                    <img
                        src={activeImage}
                        alt={garmentName}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                    />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-gray-400">
                        <ImageIcon size={34} strokeWidth={1.5} />
                        <span className="text-sm">Trang phục chưa có ảnh</span>
                    </div>
                )}
            </div>

            {images.length > 1 && (
                <div className="grid grid-cols-4 gap-3 sm:gap-4">
                    {images.slice(0, 4).map((imageUrl, index) => {
                        const selected = index === activeIndex

                        return (
                            <button
                                type="button"
                                key={`${imageUrl}-${index}`}
                                onClick={() => setActiveIndex(index)}
                                aria-label={`Xem ảnh ${index + 1} của ${garmentName}`}
                                aria-pressed={selected}
                                className={`relative aspect-[3/4] overflow-hidden rounded-xl border-2 bg-[#eee6df] transition ${
                                    selected
                                        ? "border-brand-primary"
                                        : "border-transparent opacity-70 hover:border-brand-primary/70 hover:opacity-100"
                                }`}
                            >
                                <img
                                    src={imageUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default GarmentGallery
