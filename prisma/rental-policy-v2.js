const RENTAL_POLICY_V2 = Object.freeze({
  version: "v2.0",
  effectiveFrom: new Date("2026-08-27T00:00:00+07:00"),
  holdDuration: 15,
  approvalThreshold: 500000,
  lateFeePolicy: Object.freeze({
    basis: "RENTAL_AMOUNT",
    timezone: "Asia/Ho_Chi_Minh",
    dueHour: 18,
    businessStartHour: 8,
    halfDayCutoffHour: 12,
    businessEndHour: 18,
    morningMultiplier: 0.5,
    afternoonMultiplier: 1,
    rounding: "HALF_UP_TO_VND",
  }),
});

const policyMatchesV2 = (policy) => {
  const lateFeePolicy = policy?.lateFeePolicy;

  return Boolean(
    policy &&
    policy.version === RENTAL_POLICY_V2.version &&
    new Date(policy.effectiveFrom).getTime() ===
      RENTAL_POLICY_V2.effectiveFrom.getTime() &&
    policy.effectiveTo === null &&
    Number(policy.holdDuration) === RENTAL_POLICY_V2.holdDuration &&
    Number(policy.approvalThreshold) ===
      RENTAL_POLICY_V2.approvalThreshold &&
    lateFeePolicy?.basis === "RENTAL_AMOUNT" &&
    lateFeePolicy?.timezone === "Asia/Ho_Chi_Minh" &&
    Number(lateFeePolicy?.dueHour) === 18 &&
    Number(lateFeePolicy?.businessStartHour) === 8 &&
    Number(lateFeePolicy?.halfDayCutoffHour) === 12 &&
    Number(lateFeePolicy?.businessEndHour) === 18 &&
    Number(lateFeePolicy?.morningMultiplier) === 0.5 &&
    Number(lateFeePolicy?.afternoonMultiplier) === 1 &&
    lateFeePolicy?.rounding === "HALF_UP_TO_VND" &&
    !("gracePeriodHours" in lateFeePolicy) &&
    !("unitHours" in lateFeePolicy) &&
    !("feeRateBpsPerUnit" in lateFeePolicy)
  );
};

const activateRentalPolicyV2 = async (
  prisma,
  createdBy,
  now = new Date(),
) => prisma.$transaction(
  async (tx) => {
    const conflictingLaterPolicy =
      await tx.rentalPolicy.findFirst({
        where: {
          version: { not: RENTAL_POLICY_V2.version },
          effectiveFrom: {
            gte: RENTAL_POLICY_V2.effectiveFrom,
          },
        },
      });

    if (conflictingLaterPolicy) {
      throw new Error("POLICY_AFTER_V2_ALREADY_EXISTS");
    }

    let policy = await tx.rentalPolicy.findUnique({
      where: { version: RENTAL_POLICY_V2.version },
    });

    if (policy) {
      const referencedOrderCount =
        await tx.rentalOrder.count({
          where: { policyId: policy.policyId },
        });

      if (
        referencedOrderCount > 0 &&
        !policyMatchesV2(policy)
      ) {
        throw new Error(
          "REFERENCED_POLICY_V2_DOES_NOT_MATCH",
        );
      }

      if (!policyMatchesV2(policy)) {
        policy = await tx.rentalPolicy.update({
          where: { policyId: policy.policyId },
          data: {
            effectiveFrom: RENTAL_POLICY_V2.effectiveFrom,
            effectiveTo: null,
            holdDuration: RENTAL_POLICY_V2.holdDuration,
            approvalThreshold:
              RENTAL_POLICY_V2.approvalThreshold,
            lateFeePolicy: RENTAL_POLICY_V2.lateFeePolicy,
            createdBy,
          },
        });
      }
    } else {
      policy = await tx.rentalPolicy.create({
        data: {
          version: RENTAL_POLICY_V2.version,
          effectiveFrom: RENTAL_POLICY_V2.effectiveFrom,
          effectiveTo: null,
          holdDuration: RENTAL_POLICY_V2.holdDuration,
          approvalThreshold:
            RENTAL_POLICY_V2.approvalThreshold,
          lateFeePolicy: RENTAL_POLICY_V2.lateFeePolicy,
          createdBy,
        },
      });
    }

    const policyTimeline = await tx.rentalPolicy.findMany({
      where: {
        effectiveFrom: { lte: RENTAL_POLICY_V2.effectiveFrom },
      },
      orderBy: [
        { effectiveFrom: "asc" },
        { version: "asc" },
      ],
    });
    let closedPolicyCount = 0;

    for (let index = 0; index < policyTimeline.length; index += 1) {
      const timelinePolicy = policyTimeline[index];
      const nextPolicy = policyTimeline[index + 1] ?? null;
      const expectedEffectiveTo = nextPolicy?.effectiveFrom ?? null;
      const currentEffectiveTo = timelinePolicy.effectiveTo
        ? new Date(timelinePolicy.effectiveTo).getTime()
        : null;
      const expectedTime = expectedEffectiveTo
        ? new Date(expectedEffectiveTo).getTime()
        : null;

      if (currentEffectiveTo !== expectedTime) {
        await tx.rentalPolicy.update({
          where: { policyId: timelinePolicy.policyId },
          data: { effectiveTo: expectedEffectiveTo },
        });
        closedPolicyCount += 1;
      }
    }

    if (now >= RENTAL_POLICY_V2.effectiveFrom) {
      const activePolicies = await tx.rentalPolicy.findMany({
        where: {
          effectiveFrom: { lte: now },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gt: now } },
          ],
        },
        select: {
          policyId: true,
          version: true,
        },
      });

      if (
        activePolicies.length !== 1 ||
        activePolicies[0].policyId !== policy.policyId
      ) {
        throw new Error("POLICY_V2_ACTIVATION_CONFLICT");
      }
    }

    return {
      policy,
      closedPolicyCount,
    };
  },
  {
    isolationLevel: "Serializable",
    maxWait: 10000,
    timeout: 30000,
  },
);

export {
  RENTAL_POLICY_V2,
  activateRentalPolicyV2,
  policyMatchesV2,
};
