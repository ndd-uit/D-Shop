import api from "./api.js"
import { getAuthToken } from "./authStorage.js"

const PROFILE_CACHE_TTL_MS = 30_000
let profileCache = {
    token: null,
    data: null,
    expiresAt: 0,
    request: null,
}

const getMyProfile = async () => {
    const token = getAuthToken()
    const now = Date.now()

    if (
        token &&
        profileCache.token === token &&
        profileCache.data &&
        profileCache.expiresAt > now
    ) {
        return profileCache.data
    }

    if (token && profileCache.token === token && profileCache.request) {
        return profileCache.request
    }

    const request = api.get("/users/me").then((response) => {
        const data = response.data.data
        profileCache = {
            token,
            data,
            expiresAt: Date.now() + PROFILE_CACHE_TTL_MS,
            request: null,
        }
        return data
    }).catch((error) => {
        if (profileCache.token === token) {
            profileCache.request = null
        }
        throw error
    })

    profileCache = {
        token,
        data: null,
        expiresAt: 0,
        request,
    }

    return request
}

const updateMyProfile = async (data) => {
    const response = await api.patch("/users/me", data)
    const profile = response.data.data
    profileCache = {
        token: getAuthToken(),
        data: profile,
        expiresAt: Date.now() + PROFILE_CACHE_TTL_MS,
        request: null,
    }
    return profile
}

export { getMyProfile, updateMyProfile }
