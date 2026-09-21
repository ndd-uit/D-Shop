import api from './api.js'

const sendChatMessage = async ({ message, history = [] }, client = api) => {
    const response = await client.post('/chatbot/message', {
        message,
        history,
    })
    const data = response?.data?.data

    if (!data || typeof data.message !== 'string' || !data.message.trim()) {
        const error = new Error('CHATBOT_INVALID_RESPONSE')
        error.code = 'CHATBOT_INVALID_RESPONSE'
        throw error
    }

    return data
}

const getChatbotErrorState = (error) => {
    const status = error?.response?.status ?? null
    const providerRetryable = Boolean(error?.response?.data?.retryable)

    if (status === 401) {
        return {
            message: `Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.`,
            retryable: false,
            status,
        }
    }

    if (status === 403) {
        return {
            message: `Tài khoản này chưa được phép sử dụng trợ lý khách hàng.`,
            retryable: false,
            status,
        }
    }

    if (status === 429) {
        return {
            message: `Trợ lý đang nhận quá nhiều yêu cầu. Bạn hãy thử lại sau ít phút.`,
            retryable: true,
            status,
        }
    }

    if (status === 502 || status === 503) {
        return {
            message: `Trợ lý đang tạm thời gián đoạn. Bạn có thể thử gửi lại.`,
            retryable: true,
            status,
        }
    }

    if (!error?.response) {
        return {
            message: `Không thể kết nối tới D-SHOP. Vui lòng kiểm tra mạng và thử lại.`,
            retryable: true,
            status,
        }
    }

    return {
        message: `D-SHOP chưa thể xử lý tin nhắn này. Vui lòng thử lại.`,
        retryable: providerRetryable,
        status,
    }
}

export { getChatbotErrorState, sendChatMessage }
