import api from "./api.js"

const getAvailabilityBlocks = async () => {
    const response = await api.get("/availability-blocks")
    return response.data.data
}

const createAvailabilityBlock = async (data) => {
    const response = await api.post("/availability-blocks", data)
    return response.data.data
}

const endAvailabilityBlock = async (blockId) => {
    const response = await api.patch(`/availability-blocks/${blockId}/end`)
    return response.data.data
}

const cancelAvailabilityBlock = async (blockId) => {
    const response = await api.delete(`/availability-blocks/${blockId}`)
    return response.data.data
}

export {
    cancelAvailabilityBlock,
    createAvailabilityBlock,
    endAvailabilityBlock,
    getAvailabilityBlocks,
}
