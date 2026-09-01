import prisma from "../../config/prisma.js";

const findAllRentalPolicies = async (
    db = prisma
) => {
    return db.rentalPolicy.findMany({
        include: {
            creator: {
                select: {
                    userId: true,
                    fullName: true,
                },
            },
        },
        orderBy: [
            {
                effectiveFrom: "desc",
            },
            {
                version: "desc",
            },
        ],
    });
};

const findRentalPolicyByVersion = async (
    version,
    db = prisma
) => {
    return db.rentalPolicy.findUnique({
        where: {
            version,
        },
    });
};

const findRentalPolicyByEffectiveFrom = async (
    effectiveFrom,
    db = prisma
) => db.rentalPolicy.findFirst({
    where: { effectiveFrom },
});

const findPreviousRentalPolicy = async (
    effectiveFrom,
    db = prisma
) => db.rentalPolicy.findFirst({
    where: {
        effectiveFrom: { lt: effectiveFrom },
    },
    orderBy: {
        effectiveFrom: "desc",
    },
});

const findNextRentalPolicy = async (
    effectiveFrom,
    db = prisma
) => db.rentalPolicy.findFirst({
    where: {
        effectiveFrom: { gt: effectiveFrom },
    },
    orderBy: {
        effectiveFrom: "asc",
    },
});

const createRentalPolicy = async (
    data,
    db = prisma
) => {
    return db.rentalPolicy.create({
        data,
    });
};

const updateRentalPolicyEffectiveTo = async (
    policyId,
    effectiveTo,
    db = prisma
) => db.rentalPolicy.update({
    where: { policyId },
    data: { effectiveTo },
});

export {
    findAllRentalPolicies,
    findNextRentalPolicy,
    findPreviousRentalPolicy,
    findRentalPolicyByEffectiveFrom,
    findRentalPolicyByVersion,
    createRentalPolicy,
    updateRentalPolicyEffectiveTo,
};
