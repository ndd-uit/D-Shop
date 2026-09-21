import test from 'node:test'
import assert from 'node:assert/strict'

import {
    buildChatHistory,
    canMountChatbot,
    canSendChatMessage,
    chatbotReducer,
    createInitialChatState,
} from '../src/components/chatbot/chatbotState.js'
import {
    getChatbotErrorState,
    sendChatMessage,
} from '../src/services/chatbotApi.js'

const reduce = (state, action) => chatbotReducer(state, action)

test('chatbot widget opens, closes and keeps messages in the mounted session', () => {
    let state = createInitialChatState()
    state = reduce(state, { type: 'OPEN' })
    assert.equal(state.isOpen, true)

    state = reduce(state, {
        type: 'SEND_STARTED',
        message: { id: 'user-1', role: 'user', text: 'Đơn của tôi đâu?' },
    })
    state = reduce(state, {
        type: 'SEND_SUCCEEDED',
        message: { id: 'assistant-1', role: 'assistant', text: 'Mình đã tìm thấy đơn của bạn.' },
    })
    state = reduce(state, { type: 'CLOSE' })
    state = reduce(state, { type: 'OPEN' })

    assert.equal(state.isOpen, true)
    assert.equal(state.messages.at(-1).text, 'Mình đã tìm thấy đơn của bạn.')
})

test('chatbot enters loading state and prevents another send', () => {
    let state = createInitialChatState()
    state = reduce(state, { type: 'SET_INPUT', value: 'Tìm áo dài đỏ' })
    assert.equal(canSendChatMessage(state), true)

    state = reduce(state, {
        type: 'SEND_STARTED',
        message: { id: 'user-1', role: 'user', text: state.input },
    })

    assert.equal(state.status, 'loading')
    assert.equal(state.input, '')
    assert.equal(canSendChatMessage(state), false)
})

test('chatbot does not send empty or whitespace-only messages', () => {
    const state = createInitialChatState()
    assert.equal(canSendChatMessage(state), false)
    assert.equal(canSendChatMessage({ ...state, input: '   ' }), false)
})

test('chatbot mounts only for an authenticated CUSTOMER', () => {
    assert.equal(canMountChatbot('token', { role: 'CUSTOMER' }), true)
    assert.equal(canMountChatbot('token', { role: 'STORE_MANAGER' }), false)
    assert.equal(canMountChatbot('token', { role: 'RENTAL_STAFF' }), false)
    assert.equal(canMountChatbot(null, { role: 'CUSTOMER' }), false)
})

test('chatbot renders assistant response state and maps history for backend', () => {
    let state = createInitialChatState()
    state = reduce(state, {
        type: 'SEND_STARTED',
        message: { id: 'user-1', role: 'user', text: 'Còn size M không?' },
    })
    state = reduce(state, {
        type: 'SEND_SUCCEEDED',
        message: { id: 'assistant-1', role: 'assistant', text: 'Size M hiện còn trống.' },
    })

    assert.deepEqual(buildChatHistory(state.messages), [
        { role: 'user', parts: [{ text: 'Còn size M không?' }] },
        { role: 'model', parts: [{ text: 'Size M hiện còn trống.' }] },
    ])
})

test('chatbot keeps a friendly retryable error without backend internals', () => {
    const errorState = getChatbotErrorState({
        response: {
            status: 503,
            data: { message: 'internal stack trace', retryable: true },
        },
    })

    assert.equal(errorState.retryable, true)
    assert.match(errorState.message, /tạm thời gián đoạn/)
    assert.doesNotMatch(errorState.message, /stack trace/)

    const state = reduce(createInitialChatState(), {
        type: 'SEND_FAILED',
        error: errorState,
    })
    assert.equal(state.status, 'idle')
    assert.equal(state.error.message, errorState.message)
})

test('chatbot API reuses the client abstraction and maps the real response schema', async () => {
    const calls = []
    const client = {
        post: async (...args) => {
            calls.push(args)
            return {
                data: {
                    success: true,
                    data: {
                        message: 'Kết quả từ D-SHOP',
                        sources: [],
                        usedTools: ['search_garments'],
                    },
                },
            }
        },
    }

    const result = await sendChatMessage({
        message: 'Tìm áo dài',
        history: [],
    }, client)

    assert.deepEqual(calls, [[
        '/chatbot/message',
        { message: 'Tìm áo dài', history: [] },
    ]])
    assert.equal(result.message, 'Kết quả từ D-SHOP')
})

test('chatbot maps auth, quota and network errors', () => {
    assert.equal(getChatbotErrorState({ response: { status: 401 } }).status, 401)
    assert.equal(getChatbotErrorState({ response: { status: 403 } }).retryable, false)
    assert.equal(getChatbotErrorState({ response: { status: 429 } }).retryable, true)
    assert.equal(getChatbotErrorState(new Error('network')).retryable, true)
})
