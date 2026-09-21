import { Outlet } from "react-router-dom"

import Footer from "../components/layouts/Footer"
import Header from "../components/layouts/Header"

import ChatbotWidget from '../components/chatbot/ChatbotWidget'
import { canMountChatbot } from '../components/chatbot/chatbotState.js'
import { getAuthToken, getAuthUser } from '../services/authStorage.js'

function CustomerLayout() {
    const authUser = getAuthUser()
    const showChatbot = canMountChatbot(getAuthToken(), authUser)

    return (
        <div className="flex min-h-screen flex-col bg-brand-bg text-brand-text">
            <Header />

            <main className="flex-1">
                <Outlet />
            </main>

            <Footer />
            {showChatbot && <ChatbotWidget />}
        </div>
    )
}

export default CustomerLayout
