import { useEffect, useState } from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import ManagerHeader from "../components/manager/ManagerHeader.jsx"
import ManagerSidebar from "../components/manager/ManagerSidebar.jsx"
import RentalOrderDetailPage from "./RentalOrderDetailPage.jsx"
import { clearAuthToken, getAuthUser, saveAuthUser } from "../services/authStorage.js"
import { getMyProfile } from "../services/userApi.js"

function OperationsRentalOrderDetailPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const [profile, setProfile] = useState(() => getAuthUser())
    const [loading, setLoading] = useState(() => !getAuthUser())
    const [forbidden, setForbidden] = useState(false)
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let active = true
        getMyProfile()
            .then((user) => {
                if (!active) return
                if (!["STORE_MANAGER", "RENTAL_STAFF"].includes(user.role)) {
                    setForbidden(true)
                    return
                }
                saveAuthUser(user)
                setProfile(user)
            })
            .catch((error) => {
                if (!active) return
                if (error.response?.status === 401) {
                    navigate("/login", { replace: true, state: { from: location.pathname } })
                    return
                }
                setForbidden(true)
            })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [location.pathname, navigate])

    if (forbidden) return <Navigate to="/" replace />
    if (!profile && loading) {
        return <div className="min-h-[100dvh] animate-pulse bg-brand-bg" />
    }

    const basePath = profile?.role === "STORE_MANAGER" ? "/manager" : "/staff"
    const logout = () => { clearAuthToken(); navigate("/login", { replace: true }) }

    return (
        <div className="mx-auto flex min-h-screen max-w-[1920px] bg-[#faf6ef] text-[#453c38]">
            <ManagerSidebar role={profile?.role} />
            <main className="min-w-0 flex-1">
                <ManagerHeader
                    profile={profile}
                    loading={loading}
                    title="Chi tiết đơn thuê"
                    subtitle="Theo dõi thông tin và lịch sử xử lý đơn"
                    onReload={() => setReloadKey((v) => v + 1)}
                    onLogout={logout}
                />
                <RentalOrderDetailPage
                    key={reloadKey}
                    operationsMode
                    staffActionsEnabled={profile?.role === "RENTAL_STAFF"}
                    backPath={`${basePath}/rentals`}
                />
            </main>
        </div>
    )
}

export default OperationsRentalOrderDetailPage
