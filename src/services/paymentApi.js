import api from "./api.js"

const createRentalPayment = async (orderId) => {
    const response = await api.post("/payments/rental", {
        orderId,
    })

    return response.data.data
}

const createUpfrontPayment = createRentalPayment

const createDepositPayment = async (orderId) => {
    const response = await api.post(`/payments/orders/${orderId}/deposit`)
    return response.data.data
}

const getRefunds = async () => {
    const response = await api.get("/payments/refunds")
    return response.data.data
}

const getExpiredHoldReconciliations = async () => {
    const response = await api.get("/payments/reconciliations/expired-holds")
    return response.data.data
}

const createRentalRefund = async (orderId) => {
    const response = await api.post(`/payments/orders/${orderId}/rental-refund`)
    return response.data.data
}

const retryFailedRefund = async (refundId) => {
    const response = await api.post(`/payments/refunds/${refundId}/retry`)
    return response.data.data
}

const confirmRefundSucceeded = async (refundId, transactionRef) => {
    const response = await api.post("/payments/callbacks/refunds/succeeded", {
        refundId,
        transactionRef,
    })
    return response.data.data
}

export {
    confirmRefundSucceeded,
    createDepositPayment,
    createRentalPayment,
    createRentalRefund,
    createUpfrontPayment,
    getExpiredHoldReconciliations,
    getRefunds,
    retryFailedRefund,
}
