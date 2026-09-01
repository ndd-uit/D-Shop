import api from "./api.js"

const getRentalOrders = async () => {
    const response = await api.get("/rentals")
    return response.data.data
}

const getRentalOrderDetail = async (orderId) => {
    const response = await api.get(`/rentals/${orderId}`)
    return response.data.data
}

const getRentalOrderHistory = async (orderId) => {
    const response = await api.get(`/rentals/${orderId}/history`)
    return response.data.data
}

const startPreparingRentalOrder = async (orderId) => {
    const response = await api.patch(`/rentals/${orderId}/preparing`)
    return response.data.data
}

const buildEvidenceFormData = (data, images = []) => {
    const formData = new FormData()

    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            formData.append(key, String(value))
        }
    })
    images.forEach((image) => formData.append("images", image))

    return formData
}

const prepareRentalReservation = async (orderId, reservationId, data, images = []) => {
    const response = await api.patch(
        `/rentals/${orderId}/reservations/${reservationId}/prepare`,
        buildEvidenceFormData(data, images),
        { headers: { "Content-Type": "multipart/form-data" } },
    )
    return response.data.data
}

const replaceRentalReservation = async (orderId, reservationId, replacementReason) => {
    const response = await api.patch(
        `/rentals/${orderId}/reservations/${reservationId}/replace`,
        { replacementReason },
    )
    return response.data.data
}

const markRentalOrderNoShow = async (orderId) => {
    const response = await api.patch(`/rentals/${orderId}/no-show`)
    return response.data.data
}

const markRentalOrderFulfillmentFailed = async (orderId, reservationId, reason) => {
    const response = await api.patch(
        `/rentals/${orderId}/reservations/${reservationId}/fulfillment-failed`,
        { reason },
    )
    return response.data.data
}

const changeRentalUnitStatus = async (rentalUnitId, newStatus, reason) => {
    const response = await api.patch(`/rentals/units/${rentalUnitId}/status`, {
        newStatus,
        reason,
    })
    return response.data.data
}

const handoverRentalOrder = async (orderId, data) => {
    const response = await api.patch(`/rentals/${orderId}/handover`, data)
    return response.data.data
}

const receiveRentalReturn = async (orderId) => {
    const response = await api.patch(`/rentals/${orderId}/return`)
    return response.data.data
}

const inspectRentalOrderItem = async (orderId, itemId, data, images = []) => {
    const response = await api.post(
        `/rentals/${orderId}/items/${itemId}/inspection`,
        buildEvidenceFormData(data, images),
        { headers: { "Content-Type": "multipart/form-data" } },
    )
    return response.data.data
}

const settleRentalOrder = async (orderId) => {
    const response = await api.post(`/rentals/${orderId}/settlement`)
    return response.data.data
}

const confirmDirectAdditionalPayment = async (orderId, amount) => {
    const response = await api.patch(`/rentals/${orderId}/additional-payment`, {
        amount,
    })
    return response.data.data
}

const createRentalOrder = async ({
    pickupInfo,
    returnInfo,
    selectedCartItemIds,
}) => {
    const response = await api.post("/rentals", {
        pickupInfo,
        returnInfo,
        selectedCartItemIds,
    })

    return response.data.data
}

export {
    confirmDirectAdditionalPayment,
    createRentalOrder,
    getRentalOrderDetail,
    getRentalOrderHistory,
    getRentalOrders,
    handoverRentalOrder,
    inspectRentalOrderItem,
    changeRentalUnitStatus,
    markRentalOrderFulfillmentFailed,
    markRentalOrderNoShow,
    prepareRentalReservation,
    replaceRentalReservation,
    receiveRentalReturn,
    settleRentalOrder,
    startPreparingRentalOrder,
}
