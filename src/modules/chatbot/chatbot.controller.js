import { ChatbotError } from './chatbot.errors.js';
import {
    getChatbotService,
} from './chatbot.runtime.js';

const PUBLIC_MESSAGES = {
    CHATBOT_INVALID_REQUEST:
        `Tin nhắn hoặc lịch sử trò chuyện không hợp lệ.`,
    CHATBOT_RATE_LIMITED:
        `Trợ lý đang vượt giới hạn sử dụng. Vui lòng thử lại sau.`,
    CHATBOT_UNAVAILABLE:
        `Trợ lý đang tạm thời không khả dụng. Vui lòng thử lại sau.`,
    CHATBOT_RESPONSE_BLOCKED:
        `Trợ lý không thể trả lời yêu cầu này.`,
    CHATBOT_AUTH_REQUIRED:
        `Bạn cần đăng nhập để sử dụng trợ lý.`,
    CHATBOT_FORBIDDEN:
        `Chức năng chatbot hiện chỉ dành cho Customer.`,
};

const chatController = async (req, res) => {
    try {
        const result = await getChatbotService().chat({
            body: req.body,
            authContext: req.user,
        });

        res.set('Cache-Control', 'private, no-store');
        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        const isKnown = error instanceof ChatbotError;
        const code = isKnown
            ? error.code
            : 'CHATBOT_INTERNAL_ERROR';
        const status = isKnown
            ? error.status
            : 500;

        console.error('Chatbot request failed', {
            code,
        });

        return res.status(status).json({
            success: false,
            message:
                PUBLIC_MESSAGES[code] ??
                `Không thể xử lý yêu cầu chatbot.`,
            retryable:
                isKnown && error.retryable,
        });
    }
};

export { chatController };
