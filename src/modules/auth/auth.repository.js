import prisma from "../../config/prisma.js";

const findUserByEmail = async (
    email,
    db = prisma
) => {
    return db.user.findUnique({
        where: {
            email,
        },
    });
};

const findUserByEmailOrPhone = async (
    email,
    phone,
    db = prisma
) => {
    return db.user.findFirst({
        where: {
            OR: [
                {
                    email,
                },
                ...(phone
                    ? [
                        {
                            phone,
                        },
                    ]
                    : []),
            ],
        },
    });
};

const createUser = async (
    data,
    db = prisma
) => {
    return db.user.create({
        data,
        select: {
            userId: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
        },
    });
};

export {
    findUserByEmail,
    findUserByEmailOrPhone,
    createUser,
};
