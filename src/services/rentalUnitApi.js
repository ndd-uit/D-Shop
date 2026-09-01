import api from "./api.js"

const getManagedRentalUnits = async () => {
    const response = await api.get("/rental-units/manage")
    return response.data.data
}

const getManagedRentalUnit = async (rentalUnitId) => {
    const response = await api.get(`/rental-units/${rentalUnitId}`)
    return response.data.data
}

const createRentalUnit = async (data) => {
    const response = await api.post("/rental-units", data)
    return response.data.data
}

const updateRentalUnit = async (rentalUnitId, data) => {
    const response = await api.patch(`/rental-units/${rentalUnitId}`, data)
    return response.data.data
}

const retireRentalUnit = async (rentalUnitId, reason) => {
    const response = await api.patch(`/rental-units/${rentalUnitId}/retire`, { reason })
    return response.data.data
}

export { getManagedRentalUnit, getManagedRentalUnits, createRentalUnit, retireRentalUnit, updateRentalUnit }
