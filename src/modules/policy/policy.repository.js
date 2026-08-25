import prisma from "../../config/prisma.js";

const findAllRentalPolicies = async (
    db = prisma
) => {
    return db.rentalPolicy.findMany({
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

const createRentalPolicy = async (
    data,
    db = prisma
) => {
    return db.rentalPolicy.create({
        data,
    });
};

export {
    findAllRentalPolicies,
    findRentalPolicyByVersion,
    createRentalPolicy,
};
