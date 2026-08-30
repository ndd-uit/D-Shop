import api from "./api.js"

const getFeeApprovalRequests = async (status = "") => {
    const response = await api.get("/rentals/fee-approvals", {
        params: status ? { status } : undefined,
    })
    return response.data.data
}

const decideFeeApproval = async (feeApprovalRequestId, payload) => {
    const response = await api.patch(
        `/rentals/fee-approvals/${feeApprovalRequestId}/decision`,
        payload,
    )
    return response.data.data
}

export { decideFeeApproval, getFeeApprovalRequests }
