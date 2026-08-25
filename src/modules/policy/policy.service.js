import prisma from "../../config/prisma.js";
import { findActiveRentalPolicy } from "../availability/availability.repository.js";
import {
    createRentalPolicy,
    findAllRentalPolicies,
    findRentalPolicyByVersion,
} from "./policy.repository.js";
import {
    validateCancellationPolicy,
    validateLateFeePolicy,
} from "./policy.validator.js";

const normalizeNonNegativeInteger = (value) => {
    if (
        typeof value === "boolean" ||
        value === null ||
        Array.isArray(value) ||
        (
            typeof value === "string" &&
            !value.trim()
        )
    ) {
        throw new Error(
            "INVALID_POLICY_NUMERIC_FIELDS"
        );
    }

    const normalized = Number(value);

    if (
        !Number.isFinite(normalized) ||
        !Number.isInteger(normalized) ||
        normalized < 0
    ) {
        throw new Error(
            "INVALID_POLICY_NUMERIC_FIELDS"
        );
    }

    return normalized;
};

const normalizeNonNegativeNumber = (value) => {
    if (
        typeof value === "boolean" ||
        value === null ||
        Array.isArray(value) ||
        (
            typeof value === "string" &&
            !value.trim()
        )
    ) {
        throw new Error(
            "INVALID_POLICY_NUMERIC_FIELDS"
        );
    }

    const normalized = Number(value);

    if (
        !Number.isFinite(normalized) ||
        normalized < 0
    ) {
        throw new Error(
            "INVALID_POLICY_NUMERIC_FIELDS"
        );
    }

    return normalized;
};

const getRentalPolicies = async () => {
    return findAllRentalPolicies();
};

const getActiveRentalPolicy = async () => {
    const policy = await findActiveRentalPolicy();

    if (!policy) {
        throw new Error("ACTIVE_POLICY_NOT_FOUND");
    }

    return policy;
};

const createRentalPolicyVersion = async ({
    version,
    effectiveFrom,
    preparationBuffer,
    cleaningBuffer,
    holdDuration,
    approvalThreshold,
    lateFeePolicy,
    damageFeePolicy,
    cancellationPolicy,
}, managerId) => {
    const normalizedVersion = version?.trim();

    if (!normalizedVersion) {
        throw new Error("POLICY_VERSION_REQUIRED");
    }

    const startAt = new Date(effectiveFrom);

    if (Number.isNaN(startAt.getTime())) {
        throw new Error("INVALID_EFFECTIVE_FROM");
    }

    try {
        return await prisma.$transaction(
            async (tx) => {
                const existing =
                    await findRentalPolicyByVersion(
                        normalizedVersion,
                        tx
                    );

                if (existing) {
                    throw new Error(
                        "POLICY_VERSION_ALREADY_EXISTS"
                    );
                }

                const current =
                    await findActiveRentalPolicy(
                        new Date(),
                        tx
                    );

                if (!current) {
                    throw new Error(
                        "ACTIVE_POLICY_NOT_FOUND"
                    );
                }

                const finalCancellationPolicy =
                    cancellationPolicy ??
                    current.cancellationPolicy;
                const finalLateFeePolicy =
                    lateFeePolicy ??
                    current.lateFeePolicy;

                const finalPreparationBuffer =
                    normalizeNonNegativeInteger(
                        preparationBuffer ??
                        current.preparationBuffer
                    );
                const finalCleaningBuffer =
                    normalizeNonNegativeInteger(
                        cleaningBuffer ??
                        current.cleaningBuffer
                    );
                const finalHoldDuration =
                    normalizeNonNegativeInteger(
                        holdDuration ??
                        current.holdDuration
                    );
                const finalApprovalThreshold =
                    normalizeNonNegativeNumber(
                        approvalThreshold ??
                        current.approvalThreshold
                    );

                validateCancellationPolicy(
                    finalCancellationPolicy
                );
                validateLateFeePolicy(
                    finalLateFeePolicy
                );

                return createRentalPolicy(
                    {
                        version: normalizedVersion,
                        effectiveFrom: startAt,
                        effectiveTo: null,
                        preparationBuffer:
                            finalPreparationBuffer,
                        cleaningBuffer:
                            finalCleaningBuffer,
                        holdDuration:
                            finalHoldDuration,
                        approvalThreshold:
                            finalApprovalThreshold,
                        lateFeePolicy:
                            finalLateFeePolicy,
                        damageFeePolicy:
                            damageFeePolicy ??
                            current.damageFeePolicy,
                        cancellationPolicy:
                            finalCancellationPolicy,
                        createdBy: managerId,
                        createdAt: new Date(),
                    },
                    tx
                );
            },
            {
                isolationLevel: "Serializable",
                maxWait: 10000,
                timeout: 30000,
            }
        );
    } catch (error) {
        if (
            error?.code === "P2002"
        ) {
            throw new Error(
                "POLICY_VERSION_ALREADY_EXISTS"
            );
        }

        throw error;
    }
};

export {
    getRentalPolicies,
    getActiveRentalPolicy,
    createRentalPolicyVersion,
};
