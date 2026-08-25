const validateCancellationPolicy = (policy) => {
    if (
        !policy ||
        typeof policy !== "object" ||
        Array.isArray(policy)
    ) {
        throw new Error("INVALID_CANCELLATION_POLICY");
    }

    const {
        basis,
        gracePeriodHours,
        rounding,
        rules,
    } = policy;

    if (
        basis !== "RENTAL_AMOUNT" ||
        rounding !== "HALF_UP_TO_VND" ||
        !Number.isFinite(Number(gracePeriodHours)) ||
        Number(gracePeriodHours) < 0 ||
        !Array.isArray(rules) ||
        rules.length === 0
    ) {
        throw new Error("INVALID_CANCELLATION_POLICY");
    }

    const seenThresholds = new Set();

    for (const rule of rules) {
        const minHours =
            Number(rule?.minHoursBeforeRental);
        const rate = Number(rule?.feeRateBps);

        if (
            !Number.isFinite(minHours) ||
            minHours < 0 ||
            !Number.isFinite(rate) ||
            rate < 0 ||
            rate > 10000 ||
            seenThresholds.has(minHours)
        ) {
            throw new Error(
                "INVALID_CANCELLATION_POLICY"
            );
        }

        seenThresholds.add(minHours);
    }

    if (!seenThresholds.has(0)) {
        throw new Error("INVALID_CANCELLATION_POLICY");
    }
};

const validateLateFeePolicy = (policy) => {
    if (
        !policy ||
        typeof policy !== "object" ||
        Array.isArray(policy)
    ) {
        throw new Error("INVALID_LATE_FEE_POLICY");
    }

    const {
        basis,
        gracePeriodHours,
        unitHours,
        feeRateBpsPerUnit,
        maxFeeRateBps,
        rounding,
    } = policy;

    const grace = Number(gracePeriodHours);
    const unit = Number(unitHours);
    const rate = Number(feeRateBpsPerUnit);
    const maxRate = Number(maxFeeRateBps);

    if (
        basis !== "RENTAL_AMOUNT" ||
        rounding !== "HALF_UP_TO_VND" ||
        !Number.isFinite(grace) ||
        grace < 0 ||
        !Number.isFinite(unit) ||
        unit <= 0 ||
        !Number.isFinite(rate) ||
        rate < 0 ||
        rate > 10000 ||
        !Number.isFinite(maxRate) ||
        maxRate < 0 ||
        maxRate > 10000 ||
        maxRate < rate
    ) {
        throw new Error("INVALID_LATE_FEE_POLICY");
    }
};

export {
    validateCancellationPolicy,
    validateLateFeePolicy,
};
