import assert from 'node:assert/strict';
import test from 'node:test';

import {
    BASE_SYSTEM_INSTRUCTION,
} from '../src/modules/chatbot/chatbot.prompt.js';
import {
    createChatbotService,
} from '../src/modules/chatbot/chatbot.service.js';
import {
    TOOL_DEFINITIONS,
    createToolExecutor,
    sanitizeForModel,
} from '../src/modules/chatbot/chatbot.tools.js';
import {
    GeminiProvider,
} from '../src/modules/chatbot/providers/gemini.provider.js';
import {
    createLocalRagRetriever,
} from '../src/modules/chatbot/rag/localRag.service.js';
import chatbotRouter from
    '../src/modules/chatbot/chatbot.routes.js';

const UUID = '11111111-1111-4111-8111-111111111111';

const createServices = (overrides = {}) => ({
    searchGarments: async () => [],
    getGarmentDetails: async () => ({}),
    checkAvailability: async () => ({
        available: true,
        requestedQuantity: 1,
        availableQuantity: 1,
        blockStartAt: new Date(0),
        blockEndAt: new Date(1),
        policy: { version: 'v1' },
    }),
    listRentalOrders: async () => [],
    getRentalOrderDetail: async () => ({}),
    getRentalOrderHistory: async () => [],
    getActiveRentalPolicy: async () => ({}),
    ...overrides,
});

const customer = {
    userId: 'customer-auth-id',
    role: 'CUSTOMER',
};

test('chatbot route requires auth and CUSTOMER role', () => {
    const layer = chatbotRouter.stack.find(
        (item) => item.route?.path === '/message'
    );
    assert.ok(layer);
    assert.equal(layer.route.methods.post, true);
    assert.equal(
        layer.route.stack[0].handle.name,
        'authenticate'
    );

    const authorize = layer.route.stack[1].handle;
    let statusCode;
    let nextCalled = false;
    authorize(
        { user: { role: 'RENTAL_STAFF' } },
        {
            status(code) {
                statusCode = code;
                return this;
            },
            json() {},
        },
        () => {
            nextCalled = true;
        }
    );
    assert.equal(statusCode, 403);
    assert.equal(nextCalled, false);

    authorize(
        { user: { role: 'CUSTOMER' } },
        {},
        () => {
            nextCalled = true;
        }
    );
    assert.equal(nextCalled, true);
});

test('chatbot exposes only the approved read-only tool whitelist', () => {
    assert.deepEqual(
        TOOL_DEFINITIONS.map(({ name }) => name),
        [
            'search_garments',
            'get_garment_details',
            'check_availability',
            'list_my_rental_orders',
            'get_my_rental_order',
            'get_my_rental_order_history',
            'get_active_rental_policy',
        ]
    );

    const names = TOOL_DEFINITIONS
        .map(({ name }) => name)
        .join(' ');
    for (const forbidden of [
        'cart',
        'checkout',
        'payment',
        'refund',
        'settlement',
        'create_order',
        'update',
        'delete',
    ]) {
        assert.equal(names.includes(forbidden), false);
    }
});

test('tool executor rejects unknown or mutation tools', async () => {
    const executor = createToolExecutor(
        createServices()
    );

    await assert.rejects(
        executor.execute(
            'checkout',
            {},
            customer
        ),
        (error) =>
            error.code === 'CHATBOT_TOOL_NOT_ALLOWED'
    );
});

test('tool executor rejects malformed and identity args', async () => {
    const executor = createToolExecutor(
        createServices()
    );

    await assert.rejects(
        executor.execute(
            'list_my_rental_orders',
            { customerId: 'another-user' },
            customer
        ),
        (error) =>
            error.code === 'CHATBOT_TOOL_ARGS_INVALID'
    );

    await assert.rejects(
        executor.execute(
            'get_my_rental_order',
            { orderId: 'not-a-uuid' },
            customer
        ),
        (error) =>
            error.code === 'CHATBOT_TOOL_ARGS_INVALID'
    );
});

test('personal order tools derive identity from auth context', async () => {
    let received;
    const executor = createToolExecutor(
        createServices({
            listRentalOrders: async (args) => {
                received = args;
                return [{ orderId: UUID }];
            },
        })
    );

    const result = await executor.execute(
        'list_my_rental_orders',
        {},
        customer
    );

    assert.deepEqual(received, {
        userId: customer.userId,
        role: 'CUSTOMER',
    });
    assert.equal(result[0].orderId, UUID);
});

test('chatbot tools reject non-customer auth context', async () => {
    const executor = createToolExecutor(
        createServices()
    );

    await assert.rejects(
        executor.execute(
            'get_active_rental_policy',
            {},
            {
                userId: 'staff-id',
                role: 'RENTAL_STAFF',
            }
        ),
        (error) => error.code === 'CHATBOT_FORBIDDEN'
    );
});

test('model payload removes personal and operational secrets', () => {
    const safe = sanitizeForModel({
        orderId: UUID,
        email: 'customer@example.com',
        nationalId: 'secret-id',
        transactionRef: 'gateway-ref',
        evidenceUrls: ['signed-private-url'],
        amount: {
            toJSON: () => '80000.00',
        },
    });

    assert.deepEqual(safe, {
        orderId: UUID,
        amount: '80000.00',
    });
});

test('chatbot service keeps mutation requests in read-only scope', async () => {
    let providerInput;
    const provider = {
        generate: async (input) => {
            providerInput = input;
            return {
                content: {
                    role: 'model',
                    parts: [{ text: 'Read-only guidance' }],
                },
                text: 'Read-only guidance',
                functionCalls: [],
            };
        },
    };
    const service = createChatbotService({
        provider,
        toolExecutor: createToolExecutor(
            createServices()
        ),
        retriever: {
            buildContext: () => ({
                context: '',
                results: [],
            }),
        },
    });

    const result = await service.chat({
        body: {
            message: 'Please checkout my cart',
        },
        authContext: customer,
    });

    assert.equal(result.message, 'Read-only guidance');
    assert.match(
        providerInput.systemInstruction,
        /READ-ONLY/
    );
    assert.equal(
        providerInput.tools.some(
            ({ name }) => name === 'checkout'
        ),
        false
    );
    assert.match(
        BASE_SYSTEM_INSTRUCTION,
        /không được thêm\/sửa giỏ hàng/i
    );
});

test('malformed model tool args fail without executing service', async () => {
    let called = false;
    const executor = createToolExecutor(
        createServices({
            getRentalOrderDetail: async () => {
                called = true;
                return {};
            },
        })
    );
    const service = createChatbotService({
        provider: {
            generate: async () => ({
                content: {
                    role: 'model',
                    parts: [{
                        functionCall: {
                            name: 'get_my_rental_order',
                            args: { orderId: 'bad' },
                        },
                    }],
                },
                text: '',
                functionCalls: [{
                    name: 'get_my_rental_order',
                    args: { orderId: 'bad' },
                }],
            }),
        },
        toolExecutor: executor,
        retriever: {
            buildContext: () => ({
                context: '',
                results: [],
            }),
        },
    });

    await assert.rejects(
        service.chat({
            body: { message: 'Order status' },
            authContext: customer,
        }),
        (error) =>
            error.code ===
                'CHATBOT_PROVIDER_RESPONSE_INVALID'
    );
    assert.equal(called, false);
});

test('chatbot completes a whitelisted tool-calling round', async () => {
    let turn = 0;
    const service = createChatbotService({
        provider: {
            generate: async ({ contents }) => {
                turn += 1;
                if (turn === 1) {
                    return {
                        content: {
                            role: 'model',
                            parts: [{
                                functionCall: {
                                    name:
                                        'list_my_rental_orders',
                                    args: {},
                                },
                            }],
                        },
                        text: '',
                        functionCalls: [{
                            name: 'list_my_rental_orders',
                            args: {},
                        }],
                    };
                }
                assert.equal(
                    contents.at(-1).role,
                    'user'
                );
                assert.deepEqual(
                    contents.at(-1).parts,
                    [{
                        functionResponse: {
                            name:
                                'list_my_rental_orders',
                            response: {
                                result: [{
                                    orderId: UUID,
                                }],
                            },
                        },
                    }]
                );
                return {
                    content: {
                        role: 'model',
                        parts: [{ text: 'One order' }],
                    },
                    text: 'One order',
                    functionCalls: [],
                };
            },
        },
        toolExecutor: createToolExecutor(
            createServices({
                listRentalOrders: async () => [
                    { orderId: UUID },
                ],
            })
        ),
        retriever: {
            buildContext: () => ({
                context: '',
                results: [],
            }),
        },
    });

    const result = await service.chat({
        body: { message: 'My orders' },
        authContext: customer,
    });
    assert.equal(result.message, 'One order');
    assert.deepEqual(result.usedTools, [
        'list_my_rental_orders',
    ]);
});

test('Gemini provider maps 429 without leaking provider body', async () => {
    let request;
    const provider = new GeminiProvider({
        apiKey: 'test-secret-key',
        model: 'test-model',
        maxRetries: 0,
        fetchImpl: async (url, options) => {
            request = { url, options };
            return {
                ok: false,
                status: 429,
                json: async () => ({
                    error: {
                        message:
                            'secret provider detail',
                    },
                }),
            };
        },
    });

    await assert.rejects(
        provider.generate({
            systemInstruction: 'system',
            contents: [{
                role: 'user',
                parts: [{ text: 'hello' }],
            }],
            tools: [],
        }),
        (error) => {
            assert.equal(
                error.code,
                'GEMINI_RATE_LIMITED'
            );
            assert.equal(error.retryable, true);
            assert.equal(
                error.message.includes('secret'),
                false
            );
            return true;
        }
    );
    assert.equal(
        request.url.includes('test-secret-key'),
        false
    );
    assert.equal(
        request.options.headers['x-goog-api-key'],
        'test-secret-key'
    );
});

test('chatbot service gracefully maps provider failure', async () => {
    const service = createChatbotService({
        provider: {
            generate: async () => {
                const error = new Error('internal');
                error.code = 'GEMINI_UNAVAILABLE';
                throw error;
            },
        },
        toolExecutor: createToolExecutor(
            createServices()
        ),
        retriever: {
            buildContext: () => ({
                context: '',
                results: [],
            }),
        },
    });

    await assert.rejects(
        service.chat({
            body: { message: 'Hello' },
            authContext: customer,
        }),
        (error) => {
            assert.equal(
                error.code,
                'CHATBOT_UNAVAILABLE'
            );
            assert.equal(error.status, 503);
            assert.equal(error.retryable, true);
            return true;
        }
    );
});

test('local RAG retrieves current BA Markdown without external DB', () => {
    const retriever = createLocalRagRetriever();
    const results = retriever.search(
        'reservation buffer availability',
        3
    );

    assert.ok(results.length > 0);
    assert.ok(
        results.every((item) =>
            item.source.endsWith('.md')
        )
    );
    assert.ok(
        results.every((item) =>
            !item.source.startsWith('09-alignment/')
        )
    );
});
