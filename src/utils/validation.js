const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateUuidValue = (value) => {
    if (
        typeof value !== "string" ||
        !UUID_REGEX.test(value)
    ) {
        throw new Error("INVALID_UUID");
    }

    return value;
};

const validateAndNormalizeTransactionRef = (value) => {
    if (
        value === null ||
        value === undefined ||
        (
            typeof value === "string" &&
            !value.trim()
        )
    ) {
        throw new Error("TRANSACTION_REF_REQUIRED");
    }

    if (typeof value !== "string") {
        throw new Error("INVALID_TRANSACTION_REF");
    }

    const normalized = value.trim();

    if (normalized.length > 255) {
        throw new Error("INVALID_TRANSACTION_REF");
    }

    return normalized;
};

export {
    UUID_REGEX,
    validateUuidValue,
    validateAndNormalizeTransactionRef,
};
