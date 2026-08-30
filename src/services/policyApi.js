import api from "./api.js"

const getRentalPolicies = async () => {
    const response = await api.get("/policies")
    return response.data.data
}

const getActiveRentalPolicy = async () => {
    const response = await api.get("/policies/active")
    return response.data.data
}

const createRentalPolicyVersion = async (payload) => {
    const response = await api.post("/policies/versions", payload)
    return response.data.data
}

export {
    createRentalPolicyVersion,
    getActiveRentalPolicy,
    getRentalPolicies,
}
