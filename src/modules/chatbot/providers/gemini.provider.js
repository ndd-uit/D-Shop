class GeminiProviderError extends Error {
    constructor(code, { retryable = false } = {}) {
        super(code);
        this.name = 'GeminiProviderError';
        this.code = code;
        this.retryable = retryable;
    }
}

const wait = (milliseconds) =>
    new Promise((resolve) =>
        setTimeout(resolve, milliseconds)
    );

class GeminiProvider {
    constructor({
        apiKey = process.env.GEMINI_API_KEY,
        model = process.env.GEMINI_MODEL,
        fetchImpl = globalThis.fetch,
        sleep = wait,
        maxRetries = 2,
        timeoutMs = 20000,
    } = {}) {
        this.apiKey = apiKey;
        this.model = model;
        this.fetchImpl = fetchImpl;
        this.sleep = sleep;
        this.maxRetries = maxRetries;
        this.timeoutMs = timeoutMs;
    }

    assertConfigured() {
        if (
            !this.apiKey ||
            !this.model ||
            typeof this.fetchImpl !== 'function'
        ) {
            throw new GeminiProviderError(
                'GEMINI_CONFIG_ERROR'
            );
        }
    }

    async generate({
        systemInstruction,
        contents,
        tools,
    }) {
        this.assertConfigured();
        const endpoint =
            'https://generativelanguage.googleapis.com/' +
            'v1beta/models/' +
            encodeURIComponent(this.model) +
            ':generateContent';
        const body = {
            systemInstruction: {
                parts: [{ text: systemInstruction }],
            },
            contents,
            tools: [{
                functionDeclarations: tools.map((tool) => ({
                    name: tool.name,
                    description: tool.description,
                    parametersJsonSchema:
                        tool.parameters,
                })),
            }],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1000,
            },
        };

        for (
            let attempt = 0;
            attempt <= this.maxRetries;
            attempt += 1
        ) {
            try {
                const response = await this.fetchImpl(
                    endpoint,
                    {
                        method: 'POST',
                        headers: {
                            'content-type':
                                'application/json',
                            'x-goog-api-key': this.apiKey,
                        },
                        body: JSON.stringify(body),
                        signal: AbortSignal.timeout(
                            this.timeoutMs
                        ),
                    }
                );

                if (response.ok) {
                    return this.parseResponse(
                        await response.json()
                    );
                }

                const retryable =
                    response.status === 429 ||
                    response.status === 500 ||
                    response.status === 503;

                if (
                    retryable &&
                    attempt < this.maxRetries
                ) {
                    await this.sleep(
                        500 * 2 ** attempt
                    );
                    continue;
                }

                if (response.status === 429) {
                    throw new GeminiProviderError(
                        'GEMINI_RATE_LIMITED',
                        { retryable: true }
                    );
                }
                if (
                    response.status === 401 ||
                    response.status === 403
                ) {
                    throw new GeminiProviderError(
                        'GEMINI_CONFIG_ERROR'
                    );
                }
                if (retryable) {
                    throw new GeminiProviderError(
                        'GEMINI_UNAVAILABLE',
                        { retryable: true }
                    );
                }
                throw new GeminiProviderError(
                    'GEMINI_REQUEST_FAILED'
                );
            } catch (error) {
                if (error instanceof GeminiProviderError) {
                    throw error;
                }
                if (attempt < this.maxRetries) {
                    await this.sleep(
                        500 * 2 ** attempt
                    );
                    continue;
                }
                throw new GeminiProviderError(
                    'GEMINI_UNAVAILABLE',
                    { retryable: true }
                );
            }
        }

        throw new GeminiProviderError(
            'GEMINI_UNAVAILABLE',
            { retryable: true }
        );
    }

    parseResponse(payload) {
        const candidate = payload?.candidates?.[0];
        const content = candidate?.content;
        const parts = content?.parts;

        if (!content || !Array.isArray(parts)) {
            const blocked =
                payload?.promptFeedback?.blockReason;
            throw new GeminiProviderError(
                blocked
                    ? 'GEMINI_RESPONSE_BLOCKED'
                    : 'GEMINI_INVALID_RESPONSE'
            );
        }

        return {
            content,
            finishReason: candidate.finishReason,
            text: parts
                .filter(
                    (part) =>
                        typeof part.text === 'string' &&
                        !part.thought
                )
                .map((part) => part.text)
                .join('\n')
                .trim(),
            functionCalls: parts
                .map((part) => part.functionCall)
                .filter(Boolean),
        };
    }
}

export {
    GeminiProvider,
    GeminiProviderError,
};
