import axios from "axios"
import { clearAuthToken, getAuthToken } from "./authStorage.js"

const api = axios.create({
    baseURL: import.meta.env?.VITE_API_BASE_URL || "/api",
    headers: {
        "Content-Type": "application/json",
    },
})

api.interceptors.request.use((config) => {
    const token = getAuthToken()

    if (token && token !== "null" && token !== "undefined") {
        config.headers.Authorization = `Bearer ${token}`
    } else if (config.headers?.Authorization) {
        delete config.headers.Authorization
    }

    return config
})

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            clearAuthToken()
        }

        return Promise.reject(error)
    },
)

export default api
