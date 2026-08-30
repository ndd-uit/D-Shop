import { useEffect, useState } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"

import { clearAuthToken, getAuthToken, saveAuthUser } from "../../services/authStorage.js"
import { getMyProfile } from "../../services/userApi.js"

const getRoleHome = (role) => {
    if (role === "STORE_MANAGER") return "/manager"
    if (role === "RENTAL_STAFF") return "/staff"
    return "/"
}

function RoleRoute({ roles }) {
    const location = useLocation()
    const [state, setState] = useState({ loading: true, user: null, unauthorized: false, error: "" })
    const token = getAuthToken()

    useEffect(() => {
        let active = true

        if (!token) {
            return () => { active = false }
        }

        const verify = async () => {
            try {
                const user = await getMyProfile()
                if (!active) return
                saveAuthUser(user)
                setState({ loading: false, user, unauthorized: false, error: "" })
            } catch (error) {
                if (!active) return
                if (error.response?.status === 401) {
                    clearAuthToken()
                    setState({ loading: false, user: null, unauthorized: true, error: "" })
                    return
                }
                setState({ loading: false, user: null, unauthorized: false, error: "Không thể xác minh tài khoản. Vui lòng thử lại." })
            }
        }

        verify()
        return () => { active = false }
    }, [token])

    if (!token || state.unauthorized) {
        return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
    }

    if (state.loading) {
        return <div className="min-h-[100dvh] animate-pulse bg-brand-bg" aria-label="Đang xác minh quyền truy cập" />
    }

    if (state.error) {
        return <main className="flex min-h-[100dvh] items-center justify-center bg-brand-bg p-5 text-center">
            <div className="rounded-2xl border border-[#eadfd6] bg-white p-7">
                <p className="text-sm text-red-700">{state.error}</p>
                <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-[#f2a39b] px-5 py-2.5 text-sm font-semibold">
                    Thử lại
                </button>
            </div>
        </main>
    }

    if (!roles.includes(state.user?.role)) {
        return <Navigate to={getRoleHome(state.user?.role)} replace />
    }

    return <Outlet />
}

export default RoleRoute
