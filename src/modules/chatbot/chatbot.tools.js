import { ChatbotError } from './chatbot.errors.js';

const UUID_PATTERN =
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';
const UUID_REGEX = new RegExp(UUID_PATTERN);
const objectSchema = (
    properties = {},
    required = []
) => ({
    type: 'object',
    properties,
    required,
    additionalProperties: false,
});
const id = {
    type: 'string',
    pattern: UUID_PATTERN,
};
const text = {
    type: 'string',
    minLength: 1,
};

const TOOL_DEFINITIONS = Object.freeze([
    {
        name: 'search_garments',
        description: 'Search active garments. Read-only.',
        parameters: objectSchema({
            keyword: { ...text, maxLength: 200 },
            categoryId: id,
            size: { ...text, maxLength: 50 },
            minPrice: { type: 'number', minimum: 0 },
            maxPrice: { type: 'number', minimum: 0 },
            rentalStartAt: text,
            returnDueAt: text,
        }),
    },
    {
        name: 'get_garment_details',
        description: 'Get active garment details. Read-only.',
        parameters: objectSchema(
            { garmentId: id },
            ['garmentId']
        ),
    },
    {
        name: 'check_availability',
        description:
            'Check realtime availability through the existing business service.',
        parameters: objectSchema(
            {
                garmentId: id,
                size: { ...text, maxLength: 50 },
                quantity: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 20,
                },
                rentalStartAt: text,
                returnDueAt: text,
            },
            [
                'garmentId',
                'size',
                'quantity',
                'rentalStartAt',
                'returnDueAt',
            ]
        ),
    },
    {
        name: 'list_my_rental_orders',
        description:
            'List orders for the authenticated Customer. Does not accept customerId.',
        parameters: objectSchema(),
    },
    {
        name: 'get_my_rental_order',
        description:
            'Get an order owned by the authenticated Customer.',
        parameters: objectSchema(
            { orderId: id },
            ['orderId']
        ),
    },
    {
        name: 'get_my_rental_order_history',
        description:
            'Get status history for an order owned by the authenticated Customer.',
        parameters: objectSchema(
            { orderId: id },
            ['orderId']
        ),
    },
    {
        name: 'get_active_rental_policy',
        description:
            'Get the active RentalPolicy. Read-only.',
        parameters: objectSchema(),
    },
]);

const invalidArgs = () => {
    throw new ChatbotError(
        'CHATBOT_TOOL_ARGS_INVALID',
        { status: 400 }
    );
};

const validateValue = (value, schema) => {
    if (!schema) invalidArgs();

    if (schema.type === 'string') {
        if (typeof value !== 'string') invalidArgs();
        if (
            schema.minLength !== undefined &&
            value.length < schema.minLength
        ) invalidArgs();
        if (
            schema.maxLength !== undefined &&
            value.length > schema.maxLength
        ) invalidArgs();
        if (
            schema.pattern &&
            !new RegExp(schema.pattern).test(value)
        ) invalidArgs();
        return;
    }

    if (
        schema.type === 'number' &&
        (
            typeof value !== 'number' ||
            !Number.isFinite(value)
        )
    ) invalidArgs();

    if (
        schema.type === 'integer' &&
        !Number.isInteger(value)
    ) invalidArgs();

    if (
        schema.minimum !== undefined &&
        value < schema.minimum
    ) invalidArgs();

    if (
        schema.maximum !== undefined &&
        value > schema.maximum
    ) invalidArgs();
};

const validateToolArgs = (args, schema) => {
    if (
        !args ||
        typeof args !== 'object' ||
        Array.isArray(args)
    ) invalidArgs();

    const properties = schema.properties ?? {};
    const required = schema.required ?? [];
    const fields = Object.keys(args);

    if (
        required.some(
            (field) =>
                !Object.prototype.hasOwnProperty.call(
                    args,
                    field
                )
        ) ||
        fields.some(
            (field) =>
                !Object.prototype.hasOwnProperty.call(
                    properties,
                    field
                )
        )
    ) invalidArgs();

    for (const field of fields) {
        validateValue(args[field], properties[field]);
    }

    if (
        args.rentalStartAt !== undefined ||
        args.returnDueAt !== undefined
    ) {
        if (
            typeof args.rentalStartAt !== 'string' ||
            typeof args.returnDueAt !== 'string' ||
            !args.rentalStartAt.trim() ||
            !args.returnDueAt.trim()
        ) invalidArgs();
    }

    if (
        args.minPrice !== undefined &&
        args.maxPrice !== undefined &&
        args.minPrice > args.maxPrice
    ) invalidArgs();

    return args;
};

const REDACTED_MODEL_FIELDS = new Set([
    'password',
    'passwordHash',
    'nationalId',
    'email',
    'phone',
    'customerId',
    'userId',
    'secret',
    'signature',
    'rawPayload',
    'gatewayTransactionId',
    'transactionRef',
    'evidenceUrls',
    'preparationImages',
    'changedBy',
    'replacedBy',
    'inspectedBy',
    'additionalPaymentConfirmedBy',
]);

const sanitizeForModel = (value, depth = 0) => {
    if (depth > 8) return '[truncated]';
    if (value === null || value === undefined) {
        return value;
    }
    if (typeof value === 'bigint') {
        return value.toString();
    }
    if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) return value;
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (
        typeof value?.toJSON === 'function'
    ) {
        return sanitizeForModel(
            value.toJSON(),
            depth + 1
        );
    }
    if (Array.isArray(value)) {
        return value
            .slice(0, 20)
            .map((item) =>
                sanitizeForModel(item, depth + 1)
            );
    }
    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value)
                .filter(
                    ([key]) =>
                        !REDACTED_MODEL_FIELDS.has(key)
                )
                .map(([key, item]) => [
                    key,
                    sanitizeForModel(item, depth + 1),
                ])
        );
    }
    return String(value);
};

const requireCustomerContext = (authContext) => {
    if (
        !authContext ||
        typeof authContext.userId !== 'string' ||
        !authContext.userId
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

const createToolExecutor = (services) => {
    const definitionsByName = new Map(
        TOOL_DEFINITIONS.map((definition) => [
            definition.name,
            definition,
        ])
    );

    const handlers = {
        search_garments: async (args) => {
            const garments =
                await services.searchGarments(args);
            return {
                items: garments.slice(0, 20),
                total: garments.length,
                truncated: garments.length > 20,
            };
        },
        get_garment_details: async ({ garmentId }) =>
            services.getGarmentDetails(garmentId),
        check_availability: async (args) => {
            const result =
                await services.checkAvailability({
                    garmentId: args.garmentId,
                    requestedSize: args.size,
                    quantity: args.quantity,
                    rentalStartAt: args.rentalStartAt,
                    returnDueAt: args.returnDueAt,
                });
            return {
                available: result.available,
                requestedQuantity:
                    result.requestedQuantity,
                availableQuantity:
                    result.availableQuantity,
                blockStartAt: result.blockStartAt,
                blockEndAt: result.blockEndAt,
                policyVersion:
                    result.policy?.version ?? null,
            };
        },
        list_my_rental_orders: async (
            _args,
            authContext
        ) => services.listRentalOrders({
            userId: authContext.userId,
            role: 'CUSTOMER',
        }),
        get_my_rental_order: async (
            { orderId },
            authContext
        ) => services.getRentalOrderDetail({
            orderId,
            userId: authContext.userId,
            role: 'CUSTOMER',
        }),
        get_my_rental_order_history: async (
            { orderId },
            authContext
        ) => services.getRentalOrderHistory({
            orderId,
            userId: authContext.userId,
            role: 'CUSTOMER',
        }),
        get_active_rental_policy: async () =>
            services.getActiveRentalPolicy(),
    };

    const execute = async (
        name,
        args,
        authContext
    ) => {
        requireCustomerContext(authContext);
        const definition = definitionsByName.get(name);
        const handler = handlers[name];

        if (!definition || !handler) {
            throw new ChatbotError(
                'CHATBOT_TOOL_NOT_ALLOWED',
                { status: 403 }
            );
        }

        const validArgs = validateToolArgs(
            args ?? {},
            definition.parameters
        );
        const result = await handler(
            validArgs,
            authContext
        );
        return sanitizeForModel(result);
    };

    return {
        definitions: TOOL_DEFINITIONS,
        names: Object.freeze(
            TOOL_DEFINITIONS.map(({ name }) => name)
        ),
        execute,
    };
};

export {
    TOOL_DEFINITIONS,
    UUID_REGEX,
    createToolExecutor,
    sanitizeForModel,
    validateToolArgs,
};
