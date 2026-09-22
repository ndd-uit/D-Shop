import { useEffect, useReducer, useRef } from 'react'
import { Bot, MessageCircle, RotateCcw, SendHorizontal, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import { getChatbotErrorState, sendChatMessage } from '../../services/chatbotApi.js'
import {
    buildChatHistory,
    canSendChatMessage,
    chatbotReducer,
    createInitialChatState,
} from './chatbotState.js'
import SafeChatMarkdown from './SafeChatMarkdown.jsx'

const createMessage = (role, text, extra = {}) => ({
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
    ...extra,
})

function ChatbotWidget() {
    const [state, dispatch] = useReducer(
        chatbotReducer,
        undefined,
        createInitialChatState,
    )
    const navigate = useNavigate()
    const location = useLocation()
    const inputRef = useRef(null)
    const messageEndRef = useRef(null)

    useEffect(() => {
        if (!state.isOpen) return undefined

        inputRef.current?.focus()
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') {
                dispatch({ type: 'CLOSE' })
            }
        }

        document.addEventListener('keydown', closeOnEscape)
        return () => document.removeEventListener('keydown', closeOnEscape)
    }, [state.isOpen])

    useEffect(() => {
        if (state.isOpen) {
            messageEndRef.current?.scrollIntoView({ block: 'end' })
        }
    }, [state.isOpen, state.messages, state.status, state.error])

    const submitMessage = async ({
        message = state.input,
        history = buildChatHistory(state.messages),
        appendUser = true,
    } = {}) => {
        const normalizedMessage = message.trim()

        if (!normalizedMessage || state.status === 'loading') return

        dispatch({
            type: 'SEND_STARTED',
            appendUser,
            message: createMessage('user', normalizedMessage),
        })

        try {
            const response = await sendChatMessage({
                message: normalizedMessage,
                history,
            })

            dispatch({
                type: 'SEND_SUCCEEDED',
                message: createMessage('assistant', response.message, {
                    sources: Array.isArray(response.sources) ? response.sources : [],
                }),
            })
        } catch (requestError) {
            const errorState = getChatbotErrorState(requestError)

            if (errorState.status === 401) {
                navigate('/login', {
                    replace: true,
                    state: { from: location.pathname + location.search },
                })
                return
            }

            dispatch({
                type: 'SEND_FAILED',
                error: {
                    ...errorState,
                    retryPayload: {
                        message: normalizedMessage,
                        history,
                    },
                },
            })
        }
    }

    const handleSubmit = (event) => {
        event.preventDefault()
        submitMessage()
    }

    const handleKeyDown = (event) => {
        if (
            event.key === 'Enter' &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
        ) {
            event.preventDefault()
            submitMessage()
        }
    }

    const retryLastMessage = () => {
        const retryPayload = state.error?.retryPayload
        if (!retryPayload) return

        submitMessage({
            ...retryPayload,
            appendUser: false,
        })
    }

    return (
        <div className={'fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] sm:right-6 sm:bottom-6'}>
            {state.isOpen && (
                <section
                    role={'dialog'}
                    aria-label={'D-SHOP Assistant'}
                    aria-modal={'false'}
                    className={'absolute right-0 bottom-[4.5rem] flex h-[min(640px,calc(100dvh-7rem))] w-[calc(100vw-2rem)] max-w-[400px] flex-col overflow-hidden rounded-2xl border border-[#eadfd6] bg-white shadow-[0_22px_65px_rgba(91,63,54,0.22)] sm:h-[min(620px,calc(100dvh-7rem))] sm:w-[400px]'}
                >
                    <header className={'flex min-h-16 items-center gap-3 border-b border-[#eee7e1] bg-brand-surface px-4'}>
                        <div className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f8ded9] text-[#8f443e]'}>
                            <Bot size={21} strokeWidth={1.8} aria-hidden={'true'} />
                        </div>
                        <div className={'min-w-0 flex-1'}>
                            <h2 className={'truncate text-sm font-bold text-brand-text'}>
                                D-SHOP Assistant
                            </h2>
                            <p className={'mt-0.5 text-xs text-gray-500'}>
                                Tư vấn và tra cứu thông tin
                            </p>
                        </div>
                        <button
                            type={'button'}
                            onClick={() => dispatch({ type: 'CLOSE' })}
                            aria-label={'Thu nhỏ trợ lý'}
                            className={'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 transition hover:bg-[#f5eee8] hover:text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a9544d] active:scale-[0.98]'}
                        >
                            <X size={20} aria-hidden={'true'} />
                        </button>
                    </header>

                    <div
                        className={'flex-1 space-y-3 overflow-y-auto bg-[#fffdf9] px-4 py-4'}
                        aria-live={'polite'}
                        aria-busy={state.status === 'loading'}
                    >
                        {state.messages.map((message) => (
                            <div
                                key={message.id}
                                className={message.role === 'user'
                                    ? 'flex justify-end'
                                    : 'flex justify-start'}
                            >
                                <div className={message.role === 'user'
                                    ? 'max-w-[85%] rounded-2xl rounded-br-md bg-[#a9544d] px-3.5 py-2.5 text-sm leading-6 text-white'
                                    : 'max-w-[88%] rounded-2xl rounded-bl-md border border-[#eee4dc] bg-white px-3.5 py-2.5 text-sm leading-6 text-brand-text shadow-[0_5px_16px_rgba(91,63,54,0.06)]'}>
                                    {message.role === 'assistant' ? (
                                        <SafeChatMarkdown content={message.text} />
                                    ) : (
                                        <p className={'whitespace-pre-wrap break-words'}>
                                            {message.text}
                                        </p>
                                    )}
                                    {message.role === 'assistant' && message.sources?.length > 0 && (
                                        <p className={'mt-2 border-t border-[#eee7e1] pt-2 text-[11px] leading-4 text-gray-500'}>
                                            Nguồn: {message.sources
                                                .slice(0, 3)
                                                .map((source) => source.heading || source.source)
                                                .filter(Boolean)
                                                .join(', ')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}

                        {state.status === 'loading' && (
                            <div className={'flex justify-start'}>
                                <div
                                    className={'flex items-center gap-1 rounded-2xl rounded-bl-md border border-[#eee4dc] bg-white px-4 py-3 shadow-[0_5px_16px_rgba(91,63,54,0.06)]'}
                                    aria-label={'D-SHOP Assistant đang trả lời'}
                                >
                                    {[0, 1, 2].map((index) => (
                                        <span
                                            key={index}
                                            className={'chatbot-typing-dot h-1.5 w-1.5 rounded-full bg-[#a9544d]'}
                                            style={{ animationDelay: `${index * 140}ms` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {state.error && (
                            <div
                                role={'alert'}
                                className={'rounded-xl border border-[#efc7c2] bg-[#fff3f1] px-3.5 py-3 text-sm text-[#7b3833]'}
                            >
                                <p className={'leading-5'}>{state.error.message}</p>
                                {state.error.retryable && state.error.retryPayload && (
                                    <button
                                        type={'button'}
                                        onClick={retryLastMessage}
                                        className={'mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#d99a93] bg-white px-3 py-1.5 text-xs font-semibold text-[#7b3833] transition hover:bg-[#fff8f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a9544d] active:scale-[0.98]'}
                                    >
                                        <RotateCcw size={14} aria-hidden={'true'} />
                                        Thử lại
                                    </button>
                                )}
                            </div>
                        )}
                        <div ref={messageEndRef} />
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className={'border-t border-[#eee7e1] bg-white p-3'}
                    >
                        <label htmlFor={'d-shop-chat-message'} className={'sr-only'}>
                            Tin nhắn cho D-SHOP Assistant
                        </label>
                        <div className={'flex items-end gap-2 rounded-2xl border border-[#dfd4cc] bg-white p-1.5 transition focus-within:border-[#a9544d] focus-within:ring-2 focus-within:ring-[#a9544d]/15'}>
                            <textarea
                                ref={inputRef}
                                id={'d-shop-chat-message'}
                                rows={1}
                                maxLength={2000}
                                value={state.input}
                                disabled={state.status === 'loading'}
                                onChange={(event) => dispatch({
                                    type: 'SET_INPUT',
                                    value: event.target.value,
                                })}
                                onKeyDown={handleKeyDown}
                                placeholder={'Nhập câu hỏi của bạn...'}
                                className={'max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-5 text-brand-text outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60'}
                            />
                            <button
                                type={'submit'}
                                disabled={!canSendChatMessage(state)}
                                aria-label={'Gửi tin nhắn'}
                                className={'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#a9544d] text-white transition hover:bg-[#914740] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a9544d] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#d8c5c1] disabled:text-white'}
                            >
                                <SendHorizontal size={18} aria-hidden={'true'} />
                            </button>
                        </div>
                        <p className={'mt-1.5 px-1 text-[11px] text-gray-500'}>
                            Enter để gửi, Shift+Enter để xuống dòng
                        </p>
                    </form>
                </section>
            )}

            <button
                type={'button'}
                onClick={() => dispatch({ type: 'TOGGLE' })}
                aria-label={state.isOpen ? 'Thu nhỏ trợ lý D-SHOP' : 'Mở trợ lý D-SHOP'}
                aria-expanded={state.isOpen}
                className={'inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/70 bg-[#a9544d] text-white shadow-[0_12px_30px_rgba(105,57,51,0.3)] transition hover:-translate-y-0.5 hover:bg-[#914740] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a9544d] focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98]'}
            >
                {state.isOpen
                    ? <X size={23} aria-hidden={'true'} />
                    : <MessageCircle size={24} aria-hidden={'true'} />}
            </button>
        </div>
    )
}

export default ChatbotWidget
