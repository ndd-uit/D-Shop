import { ChatbotError } from './chatbot.errors.js';
import {
    buildSystemInstruction,
} from './chatbot.prompt.js';
import {
    validateChatRequest,
} from './chatbot.validation.js';

const mapProviderError = (error) => {
    if (error instanceof ChatbotError) return error;

    if (error?.code === 'GEMINI_RATE_LIMITED') {
        return new ChatbotError(
            'CHATBOT_RATE_LIMITED',
            { status: 429, retryable: true }
        );
    }
    if (
        error?.code === 'GEMINI_CONFIG_ERROR' ||
        error?.code === 'GEMINI_UNAVAILABLE'
    ) {
        return new ChatbotError(
            'CHATBOT_UNAVAILABLE',
            { status: 503, retryable: true }
        );
    }
    if (error?.code === 'GEMINI_RESPONSE_BLOCKED') {
        return new ChatbotError(
            'CHATBOT_RESPONSE_BLOCKED',
            { status: 422 }
        );
    }
    return new ChatbotError(
        'CHATBOT_PROVIDER_FAILED',
        { status: 502 }
    );
};

const assertCustomer = (authContext) => {
    if (
        !authContext ||
        typeof authContext.userId !== 'string'
    ) {
        throw new ChatbotError(
            'CHATBOT_AUTH_REQUIRED',
            { status: 401 }
        );
    }
    if (authContext.role !== 'CUSTOMER') {
        throw new ChatbotError(
            'CHATBOT_FORBIDDEN',
            { status: 403 }
        );
    }
};

const createChatbotService = ({
    provider,
    toolExecutor,
    retriever,
    maxToolRounds = 4,
}) => {
    const chat = async ({ body, authContext }) => {
        assertCustomer(authContext);
        const { message, history } =
            validateChatRequest(body);
        let retrieval = {
            context: '',
            results: [],
        };

        try {
            retrieval = retriever.buildContext(
                message,
                5
            );
        } catch {
            // Realtime tools can still work if local docs
            // are temporarily unavailable.
        }

        const contents = [
            ...history,
            {
                role: 'user',
                parts: [{ text: message }],
            },
        ];
        const usedTools = [];

        for (
            let round = 0;
            round <= maxToolRounds;
            round += 1
        ) {
            let response;
            try {
                response = await provider.generate({
                    systemInstruction:
                        buildSystemInstruction(
                            retrieval.context
                        ),
                    contents,
                    tools: toolExecutor.definitions,
                });
            } catch (error) {
                throw mapProviderError(error);
            }

            if (!response.functionCalls.length) {
                if (!response.text) {
                    throw new ChatbotError(
                        'CHATBOT_EMPTY_RESPONSE',
                        { status: 502 }
                    );
                }
                return {
                    message: response.text,
                    sources: retrieval.results.map(
                        ({ source, heading }) => ({
                            source,
                            heading,
                        })
                    ),
                    usedTools: [...new Set(usedTools)],
                };
            }

            if (round === maxToolRounds) {
                throw new ChatbotError(
                    'CHATBOT_TOOL_LIMIT_REACHED',
                    { status: 502 }
                );
            }

            contents.push(response.content);
            const responseParts = [];

            for (const call of response.functionCalls) {
                try {
                    const result =
                        await toolExecutor.execute(
                            call.name,
                            call.args ?? {},
                            authContext
                        );
                    usedTools.push(call.name);
                    responseParts.push({
                        functionResponse: {
                            ...(call.id
                                ? { id: call.id }
                                : {}),
                            name: call.name,
                            response: { result },
                        },
                    });
                } catch (error) {
                    if (
                        error?.code ===
                            'CHATBOT_TOOL_NOT_ALLOWED' ||
                        error?.code ===
                            'CHATBOT_TOOL_ARGS_INVALID'
                    ) {
                        throw new ChatbotError(
                            'CHATBOT_PROVIDER_RESPONSE_INVALID',
                            { status: 502 }
                        );
                    }
                    throw error;
                }
            }

            contents.push({
                role: 'user',
                parts: responseParts,
            });
        }

        throw new ChatbotError(
            'CHATBOT_TOOL_LIMIT_REACHED',
            { status: 502 }
        );
    };

    return { chat };
};

export {
    createChatbotService,
    mapProviderError,
};
