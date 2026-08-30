import { Outlet } from "react-router-dom"

import Footer from "../components/layouts/Footer"
import Header from "../components/layouts/Header"

function CustomerLayout() {
    return (
        <div className="flex min-h-screen flex-col bg-brand-bg text-brand-text">
            <Header />

            <main className="flex-1">
                <Outlet />
            </main>

            <Footer />
        </div>
    )
}

export default CustomerLayout
