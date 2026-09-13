import { validateLateFeePolicy } from "../src/modules/policy/policy.validator.js";

const VERSION = "v3.0";

// Explicit activation after deploying compatible code. No backdating, no
// repricing existing orders and no overwriting an already referenced policy.
const activateRentalPolicyV3 = async (db, createdBy, now = new Date()) =>
    db.$transaction(async (tx) => {
        const existing = await tx.rentalPolicy.findUnique({ where: { version: VERSION } });
        if (existing) {
            validateLateFeePolicy(existing.lateFeePolicy);
            if (existing.lateFeePolicy.basis !== "DAILY_RENTAL_AMOUNT") {
                throw new Error("POLICY_V3_CONFLICT");
            }
            return { policy: existing, alreadyExists: true };
        }
        const policies = await tx.rentalPolicy.findMany({
            where: { OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
        });
        if (policies.some((policy) => new Date(policy.effectiveFrom) >= now)) {
            throw new Error("FUTURE_POLICY_EXISTS");
        }
        const active = policies.filter((policy) => new Date(policy.effectiveFrom) < now);
        if (active.length !== 1) throw new Error("ACTIVE_POLICY_CONFLICT");
        const previous = active[0];
        const lateFeePolicy = { ...previous.lateFeePolicy, basis: "DAILY_RENTAL_AMOUNT" };
        validateLateFeePolicy(lateFeePolicy);
        const policy = await tx.rentalPolicy.create({ data: {
            version: VERSION,
            effectiveFrom: now,
            effectiveTo: null,
            holdDuration: previous.holdDuration,
            approvalThreshold: previous.approvalThreshold,
            damageFeePolicy: previous.damageFeePolicy,
            lateFeePolicy,
            createdBy,
            createdAt: now,
        } });
        await tx.rentalPolicy.update({
            where: { policyId: previous.policyId },
            data: { effectiveTo: now },
        });
        return { policy, alreadyExists: false };
    }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 30000 });

export { activateRentalPolicyV3 };
