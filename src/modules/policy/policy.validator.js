const validateLateFeePolicy = (policy) => {
    if (
        !policy ||
        typeof policy !== "object" ||
        Array.isArray(policy) ||
        !["RENTAL_AMOUNT", "DAILY_RENTAL_AMOUNT"].includes(policy.basis) ||
        policy.timezone !== "Asia/Ho_Chi_Minh" ||
        Number(policy.dueHour) !== 18 ||
        Number(policy.businessStartHour) !== 8 ||
        Number(policy.halfDayCutoffHour) !== 12 ||
        Number(policy.businessEndHour) !== 18 ||
        Number(policy.morningMultiplier) !== 0.5 ||
        Number(policy.afternoonMultiplier) !== 1 ||
        policy.rounding !== "HALF_UP_TO_VND"
    ) {
        throw new Error("INVALID_LATE_FEE_POLICY");
    }
};

export { validateLateFeePolicy };
