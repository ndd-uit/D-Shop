import api from "./api.js"

const getOperationalDashboard = async () => {
    const response = await api.get("/operations/dashboard")

    return response.data.data
}

const getManagerReport = async (from, to) => {
    const response = await api.get("/operations/report", {
        params: { from, to },
    })

    return response.data.data
}

export { getManagerReport, getOperationalDashboard }
