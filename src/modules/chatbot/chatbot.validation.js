import { ChatbotError } from './chatbot.errors.js';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_ITEMS = 10;

const invalidRequest = () => {
    throw new ChatbotError(
        'CHATBOT_INVALID_REQUEST',
        { status: 400 }
    );
};

const validateChatRequest = (body) => {
    if (
        !body ||
        typeof body !== 'object' ||
        Array.isArray(body)
    ) {
        invalidRequest();
    }

    const allowedFields = new Set([
        'message',
        'history',
    ]);

    if (
        Object.keys(body).some(
            (field) => !allowedFields.has(field)
        )
    ) {
        invalidRequest();
    }

    const message =
        typeof body.message === 'string'
            ? body.message.trim()
            : '';

    if (
        !message ||
        message.length > MAX_MESSAGE_LENGTH
    ) {
        invalidRequest();
    }

    const rawHistory = body.history ?? [];

    if (
        !Array.isArray(rawHistory) ||
        rawHistory.length > MAX_HISTORY_ITEMS
    ) {
        invalidRequest();
    }

    const history = rawHistory.map((item) => {
        if (
            !item ||
            typeof item !== 'object' ||
            Array.isArray(item) ||
            !['user', 'model'].includes(item.role) ||
            typeof item.content !== 'string'
        ) {
            invalidRequest();
        }

        const content = item.content.trim();

        if (
            !content ||
            content.length > MAX_MESSAGE_LENGTH
        ) {
            invalidRequest();
        }

        return {
            role: item.role,
            parts: [{ text: content }],
        };
    });

    return { message, history };
};

export {
    MAX_HISTORY_ITEMS,
    MAX_MESSAGE_LENGTH,
    validateChatRequest,
};
