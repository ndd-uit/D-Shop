class ChatbotError extends Error {
    constructor(
        code,
        {
            status = 500,
            retryable = false,
        } = {}
    ) {
        super(code);
        this.name = 'ChatbotError';
        this.code = code;
        this.status = status;
        this.retryable = retryable;
    }
}

export { ChatbotError };
