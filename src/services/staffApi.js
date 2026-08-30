import api from "./api.js"

const getStaff = async () => {
    const response = await api.get("/staff")
    return response.data.data
}

const createStaff = async (data) => {
    const response = await api.post("/staff", data)
    return response.data.data
}

const updateStaff = async (userId, data) => {
    const response = await api.patch(`/staff/${userId}`, data)
    return response.data.data
}

const updateStaffStatus = async (userId, isActive) => {
    const response = await api.patch(`/staff/${userId}/status`, { isActive })
    return response.data.data
}

export { createStaff, getStaff, updateStaff, updateStaffStatus }
