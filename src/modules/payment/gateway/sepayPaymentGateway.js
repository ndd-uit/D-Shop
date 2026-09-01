import {
    createHmac,
    timingSafeEqual,
} from "node:crypto";

const SIGNED_FIELDS = [
    "order_amount",
    "merchant",
    "currency",
    "operation",
    "order_description",
    "order_invoice_number",
    "customer_id",
    "payment_method",
    "success_url",
    "error_url",
    "cancel_url",
];

const PURPOSE_CODES = {
    RENTAL: "R",
    DEPOSIT: "D",
};

const PURPOSE_BY_CODE = {
    R: "RENTAL",
    D: "DEPOSIT",
};

const CHECKOUT_URLS = {
    sandbox: "https://pay-sandbox.sepay.vn/v1/checkout/init",
    production: "https://pay.sepay.vn/v1/checkout/init",
};

const requireEnvironmentValue = (name) => {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`SEPAY_CONFIG_MISSING_${name}`);
    }

    return value;
};

const getSePayEnvironment = () => {
    const environment = (
        process.env.SEPAY_ENVIRONMENT || "sandbox"
    ).trim().toLowerCase();

    if (!CHECKOUT_URLS[environment]) {
        throw new Error("SEPAY_CONFIG_INVALID_ENVIRONMENT");
    }

    return environment;
};

const normalizeVndAmount = (value) => {
    const amount = Number(value);

    if (
        !Number.isSafeInteger(amount) ||
        amount <= 0
    ) {
        throw new Error("SEPAY_INVALID_AMOUNT");
    }

    return amount;
};

const buildInvoiceNumber = (paymentId, purpose) => {
    const purposeCode = PURPOSE_CODES[purpose];

    if (!purposeCode) {
        throw new Error("INVALID_PAYMENT_PURPOSE");
    }

    return `DS-${purposeCode}-${paymentId}`;
};

const parseInvoiceNumber = (invoiceNumber) => {
    if (typeof invoiceNumber !== "string") {
        throw new Error("SEPAY_REFERENCE_INVALID");
    }

    const match = /^DS-([RD])-([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.exec(
        invoiceNumber.trim()
    );

    if (!match) {
        throw new Error("SEPAY_REFERENCE_INVALID");
    }

    return {
        invoiceNumber: invoiceNumber.trim(),
        paymentId: match[2].toLowerCase(),
        purpose: PURPOSE_BY_CODE[match[1].toUpperCase()],
    };
};

const signCheckoutFields = (fields, secretKey) => {
    const signedValue = SIGNED_FIELDS
        .filter((field) => fields[field] !== undefined)
        .map((field) => `${field}=${fields[field]}`)
        .join(",");

    return createHmac("sha256", secretKey)
        .update(signedValue, "utf8")
        .digest("base64");
};

const createPaymentRequest = async ({
    paymentId,
    purpose,
    amount,
}) => {
    const environment = getSePayEnvironment();
    const merchant = requireEnvironmentValue(
        "SEPAY_MERCHANT_ID"
    );
    const secretKey = requireEnvironmentValue(
        "SEPAY_SECRET_KEY"
    );
    const normalizedAmount = normalizeVndAmount(amount);
    const invoiceNumber = buildInvoiceNumber(
        paymentId,
        purpose
    );
    const fields = {
        order_amount: String(normalizedAmount),
        merchant,
        currency: "VND",
        operation: "PURCHASE",
        order_description:
            purpose === "DEPOSIT"
                ? "D Shop - Thanh toan tien coc"
                : "D Shop - Thanh toan tien thue",
        order_invoice_number: invoiceNumber,
        success_url: requireEnvironmentValue(
            "SEPAY_SUCCESS_URL"
        ),
        error_url: requireEnvironmentValue(
            "SEPAY_ERROR_URL"
        ),
        cancel_url: requireEnvironmentValue(
            "SEPAY_CANCEL_URL"
        ),
    };

    fields.signature = signCheckoutFields(
        fields,
        secretKey
    );

    return {
        gateway: "SEPAY",
        gatewayReference: invoiceNumber,
        checkout: {
            action: CHECKOUT_URLS[environment],
            method: "POST",
            fields,
        },
    };
};

const createRefundRequest = async ({
    paymentId,
    type,
}) => ({
    gateway: "SEPAY",
    gatewayReference: paymentId
        ? buildInvoiceNumber(
            paymentId,
            type === "DEPOSIT_RETURN"
                ? "DEPOSIT"
                : "RENTAL"
        )
        : null,
    refundMode: "MANUAL_RECONCILIATION",
    manualReconciliationRequired: true,
});

const safeSecretMatches = (received, expected) => {
    if (
        typeof received !== "string" ||
        !received ||
        typeof expected !== "string" ||
        !expected
    ) {
        return false;
    }

    const receivedBuffer = Buffer.from(received, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");

    return receivedBuffer.length === expectedBuffer.length &&
        timingSafeEqual(receivedBuffer, expectedBuffer);
};

const verifyWebhookSecret = (receivedSecret) => {
    const expectedSecret = requireEnvironmentValue(
        "SEPAY_IPN_SECRET"
    );

    if (!safeSecretMatches(receivedSecret, expectedSecret)) {
        throw new Error("SEPAY_WEBHOOK_UNAUTHORIZED");
    }
};

const parsePaymentNotification = (payload) => {
    if (
        !payload ||
        typeof payload !== "object" ||
        !Number.isSafeInteger(Number(payload.timestamp)) ||
        Number(payload.timestamp) <= 0 ||
        payload.notification_type !== "ORDER_PAID" ||
        payload.order?.order_status !== "CAPTURED" ||
        payload.transaction?.transaction_type !== "PAYMENT" ||
        payload.transaction?.transaction_status !== "APPROVED"
    ) {
        throw new Error("SEPAY_WEBHOOK_INVALID");
    }

    if (
        payload.order.order_currency !== "VND" ||
        payload.transaction.transaction_currency !== "VND"
    ) {
        throw new Error("SEPAY_CURRENCY_MISMATCH");
    }

    const orderAmount = normalizeVndAmount(
        Number(payload.order.order_amount)
    );
    const transactionAmount = normalizeVndAmount(
        Number(payload.transaction.transaction_amount)
    );

    if (orderAmount !== transactionAmount) {
        throw new Error("SEPAY_AMOUNT_MISMATCH");
    }

    const transactionRef =
        payload.transaction.transaction_id;

    if (
        typeof transactionRef !== "string" ||
        !transactionRef.trim() ||
        transactionRef.trim().length > 255
    ) {
        throw new Error("SEPAY_REFERENCE_INVALID");
    }

    const reference = parseInvoiceNumber(
        payload.order.order_invoice_number
    );

    return {
        ...reference,
        amount: orderAmount,
        transactionRef: transactionRef.trim(),
    };
};

const validatePaymentNotification = (
    payment,
    notification
) => {
    if (!payment) {
        throw new Error("PAYMENT_NOT_FOUND");
    }

    if (payment.paymentId !== notification.paymentId) {
        throw new Error("SEPAY_REFERENCE_INVALID");
    }

    if (payment.purpose !== notification.purpose) {
        throw new Error("SEPAY_PURPOSE_MISMATCH");
    }

    if (Number(payment.amount) !== notification.amount) {
        throw new Error("SEPAY_AMOUNT_MISMATCH");
    }

    return notification;
};

export {
    buildInvoiceNumber,
    createPaymentRequest,
    createRefundRequest,
    parseInvoiceNumber,
    parsePaymentNotification,
    signCheckoutFields,
    validatePaymentNotification,
    verifyWebhookSecret,
};
