import api from "./api.js";

let catalogGarments = null
let catalogRequest = null

const getGarments = async (params) => {
    const cleanParams = {}
    if (params && typeof params === "object") {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                const trimmed = String(value).trim()
                if (trimmed !== "") {
                    cleanParams[key] = trimmed
                }
            }
        })

        if (!cleanParams.rentalStartAt || !cleanParams.returnDueAt) {
            delete cleanParams.rentalStartAt
            delete cleanParams.returnDueAt
        }
    }

    const response = await api.get("/garments", {
        params: Object.keys(cleanParams).length > 0 ? cleanParams : undefined,
    })
    return response.data.data
}

const getCatalogGarments = async () => {
    if (catalogGarments) return catalogGarments
    if (catalogRequest) return catalogRequest

    catalogRequest = getGarments()
        .then((data) => {
            catalogGarments = Array.isArray(data) ? data : []
            return catalogGarments
        })
        .finally(() => {
            catalogRequest = null
        })

    return catalogRequest
}

const invalidateCatalogGarments = () => {
    catalogGarments = null
}

const getGarmentById = async (garmentId) => {
    const response = await api.get(`/garments/${garmentId}`)
    return response.data.data
}

const getManagedGarments = async () => {
    const response = await api.get("/garments/manage")
    return response.data.data
}

const getManagedCategories = async () => {
    const response = await api.get("/categories")
    return response.data.data
}

const createCategory = async (data) => {
    const response = await api.post("/categories", data)
    invalidateCatalogGarments()
    return response.data.data
}

const updateCategory = async (categoryId, data) => {
    const response = await api.patch(`/categories/${categoryId}`, data)
    invalidateCatalogGarments()
    return response.data.data
}

const updateCategoryStatus = async (categoryId, isActive) => {
    const response = await api.patch(`/categories/${categoryId}/status`, { isActive })
    invalidateCatalogGarments()
    return response.data.data
}

const buildGarmentFormData = (data, images = []) => {
    const formData = new FormData()

    Object.entries(data).forEach(([key, value]) => {
        if (value === undefined) return
        formData.append(key, value === null ? "" : String(value))
    })

    images.forEach((image) => formData.append("images", image))
    return formData
}

const createGarment = async (data, images = []) => {
    const response = await api.post(
        "/garments",
        buildGarmentFormData(data, images),
        { headers: { "Content-Type": "multipart/form-data" } },
    )
    invalidateCatalogGarments()
    return response.data.data
}

const updateGarment = async (garmentId, data, images = []) => {
    const response = await api.patch(
        `/garments/${garmentId}`,
        buildGarmentFormData(data, images),
        { headers: { "Content-Type": "multipart/form-data" } },
    )
    invalidateCatalogGarments()
    return response.data.data
}

const updateGarmentStatus = async (garmentId, isActive) => {
    const response = await api.patch(`/garments/${garmentId}/status`, { isActive })
    invalidateCatalogGarments()
    return response.data.data
}

export {
    createCategory,
    createGarment,
    getCatalogGarments,
    getGarmentById,
    getGarments,
    getManagedCategories,
    getManagedGarments,
    updateGarment,
    updateGarmentStatus,
    updateCategory,
    updateCategoryStatus,
};
