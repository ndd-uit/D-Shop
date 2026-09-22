const WELCOME_MESSAGE = Object.freeze({
    id: 'welcome',
    role: 'assistant',
    text: `Xin chào, mình là D-SHOP Assistant. Mình có thể giúp bạn tìm trang phục, kiểm tra lịch trống và tra cứu đơn thuê.`,
    localOnly: true,
})

const createInitialChatState = () => ({
    isOpen: false,
    input: '',
    messages: [{ ...WELCOME_MESSAGE }],
    status: 'idle',
    error: null,
})

const chatbotReducer = (state, action) => {
    switch (action.type) {
        case 'OPEN':
            return { ...state, isOpen: true }
        case 'CLOSE':
            return { ...state, isOpen: false }
        case 'TOGGLE':
            return { ...state, isOpen: !state.isOpen }
        case 'SET_INPUT':
            return {
                ...state,
                input: action.value,
                error: null,
            }
        case 'SEND_STARTED':
            return {
                ...state,
                input: '',
                status: 'loading',
                error: null,
                messages: action.appendUser === false
                    ? state.messages
                    : [...state.messages, action.message],
            }
        case 'SEND_SUCCEEDED':
            return {
                ...state,
                status: 'idle',
                error: null,
                messages: [...state.messages, action.message],
            }
        case 'SEND_FAILED':
            return {
                ...state,
                status: 'idle',
                error: action.error,
            }
        default:
            return state
    }
}

const canSendChatMessage = ({ input, status }) =>
    status !== 'loading' && Boolean(input.trim())

const canMountChatbot = (token, user) =>
    Boolean(token) && user?.role === 'CUSTOMER'

const buildChatHistory = (messages, limit = 10) =>
    messages
        .filter((message) =>
            !message.localOnly &&
            (message.role === 'user' || message.role === 'assistant') &&
            typeof message.text === 'string' &&
            message.text.trim()
        )
        .slice(-limit)
        .map((message) => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            content: message.text,
        }))

export {
    WELCOME_MESSAGE,
    buildChatHistory,
    canMountChatbot,
    canSendChatMessage,
    chatbotReducer,
    createInitialChatState,
}
