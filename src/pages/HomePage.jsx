import { useEffect, useMemo, useState } from "react"

import CategorySection from "../components/home/CategorySection"
import FeaturedGarments from "../components/home/FeaturedGarments"
import HeroSection from "../components/home/HeroSection"
import RentalSearchPanel from "../components/home/RentalSearchPanel"
import TrustSection from "../components/home/TrustSection"
import { getCatalogGarments } from "../services/garmentApi.js"

const getFirstImage = (imageUrls) => {
    if (Array.isArray(imageUrls)) {
        return imageUrls.find(Boolean) || ""
    }

    if (typeof imageUrls !== "string" || !imageUrls.trim()) {
        return ""
    }

    const value = imageUrls.trim()

    if (value.startsWith("[")) {
        try {
            const parsed = JSON.parse(value)
            return Array.isArray(parsed) ? parsed.find(Boolean) || "" : value
        } catch {
            return value
        }
    }

    return value
}

function HomePage() {
    const [garments, setGarments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        let active = true

        const loadHomeGarments = async () => {
            try {
                const data = await getCatalogGarments()

                if (active) {
                    setGarments(Array.isArray(data) ? data : [])
                }
            } catch (requestError) {
                console.error(requestError)

                if (active) {
                    setError("Không thể tải dữ liệu trang phục lúc này.")
                }
            } finally {
                if (active) {
                    setLoading(false)
                }
            }
        }

        loadHomeGarments()

        return () => {
            active = false
        }
    }, [])

    const { categories, sizes } = useMemo(() => {
        const categoryMap = new Map()
        const sizeSet = new Set()

        garments.forEach((garment) => {
            const category = garment.category
            const categoryId = category?.categoryId ?? category?.id

            if (categoryId && category?.name && !categoryMap.has(categoryId)) {
                categoryMap.set(categoryId, {
                    categoryId,
                    name: category.name,
                    imageUrl: getFirstImage(garment.imageUrls),
                })
            }

            garment.rentalUnits?.forEach((unit) => {
                const size = unit?.size?.trim()

                if (size) {
                    sizeSet.add(size)
                }
            })
        })

        return {
            categories: Array.from(categoryMap.values()),
            sizes: Array.from(sizeSet).sort((first, second) =>
                first.localeCompare(second, "vi", { numeric: true }),
            ),
        }
    }, [garments])

    return (
        <>
            <HeroSection />
            <RentalSearchPanel categories={categories} sizes={sizes} />
            <CategorySection
                categories={categories}
                loading={loading}
                error={error}
            />
            <FeaturedGarments
                garments={garments.slice(0, 4)}
                loading={loading}
                error={error}
            />
            <TrustSection />
        </>
    )
}

export default HomePage
