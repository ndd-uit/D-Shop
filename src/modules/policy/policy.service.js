import prisma from "../../config/prisma.js";
import { findActiveRentalPolicy } from "../availability/availability.repository.js";
import {
    createRentalPolicy,
    findAllRentalPolicies,
    findNextRentalPolicy,
    findPreviousRentalPolicy,
    findRentalPolicyByEffectiveFrom,
    findRentalPolicyByVersion,
    updateRentalPolicyEffectiveTo,
} from "./policy.repository.js";
import { validateLateFeePolicy } from "./policy.validator.js";

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
    holdDuration,
    approvalThreshold,
    lateFeePolicy,
    damageFeePolicy,
}, managerId) => {
    const normalizedVersion = version?.trim();

    if (!normalizedVersion) {
        throw new Error("POLICY_VERSION_REQUIRED");
    }

    const startAt = new Date(effectiveFrom);

    if (Number.isNaN(startAt.getTime())) {
        throw new Error("INVALID_EFFECTIVE_FROM");
    }

    if (startAt <= new Date()) {
        throw new Error(
            "POLICY_EFFECTIVE_FROM_MUST_BE_FUTURE"
        );
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


                const effectiveFromConflict =
                    await findRentalPolicyByEffectiveFrom(
                        startAt,
                        tx
                    );

                if (effectiveFromConflict) {
                    throw new Error(
                        "POLICY_EFFECTIVE_FROM_ALREADY_EXISTS"
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

                const [previousPolicy, nextPolicy] =
                    await Promise.all([
                        findPreviousRentalPolicy(startAt, tx),
                        findNextRentalPolicy(startAt, tx),
                    ]);
                const sourcePolicy =
                    previousPolicy ?? current;
                const finalLateFeePolicy =
                    lateFeePolicy ??
                    sourcePolicy.lateFeePolicy;

                const finalHoldDuration =
                    normalizeNonNegativeInteger(
                        holdDuration ??
                        sourcePolicy.holdDuration
                    );
                const finalApprovalThreshold =
                    normalizeNonNegativeNumber(
                        approvalThreshold ??
                        sourcePolicy.approvalThreshold
                    );

                validateLateFeePolicy(
                    finalLateFeePolicy
                );

                const policy = await createRentalPolicy(
                    {
                        version: normalizedVersion,
                        effectiveFrom: startAt,
                        effectiveTo:
                            nextPolicy?.effectiveFrom ?? null,
                        holdDuration:
                            finalHoldDuration,
                        approvalThreshold:
                            finalApprovalThreshold,
                        lateFeePolicy:
                            finalLateFeePolicy,
                        damageFeePolicy:
                            damageFeePolicy ??
                            sourcePolicy.damageFeePolicy,
                        createdBy: managerId,
                        createdAt: new Date(),
                    },
                    tx
                );

                if (previousPolicy) {
                    await updateRentalPolicyEffectiveTo(
                        previousPolicy.policyId,
                        startAt,
                        tx
                    );
                }

                return policy;
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

        if (error?.code === "P2034") {
            throw new Error(
                "POLICY_VERSION_CONFLICT"
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
