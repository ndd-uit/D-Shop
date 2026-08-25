import prisma from "../../config/prisma.js";

const PROFILE_SELECT = {
    userId: true,
    fullName: true,
    email: true,
    phone: true,
    nationalId: true,
    role: true,
    isActive: true,
    createdAt: true,
};

const findUserProfileById = async (
    userId,
    db = prisma
) => {
    return db.user.findUnique({
        where: {
            userId,
        },
        select: PROFILE_SELECT,
    });
};

const findProfileConflict = async (
    userId,
    email,
    phone,
    db = prisma
) => {
    const contacts = [
        ...(email
            ? [
                {
                    email,
                },
            ]
            : []),
        ...(phone
            ? [
                {
                    phone,
                },
            ]
            : []),
    ];

    if (contacts.length === 0) {
        return null;
    }

    return db.user.findFirst({
        where: {
            userId: {
                not: userId,
            },
            OR: contacts,
        },
        select: {
            userId: true,
            email: true,
            phone: true,
        },
    });
};

const updateUserProfile = async (
    userId,
    data,
    db = prisma
) => {
    return db.user.update({
        where: {
            userId,
        },
        data,
        select: PROFILE_SELECT,
    });
};

export {
    PROFILE_SELECT,
    findUserProfileById,
    findProfileConflict,
    updateUserProfile,
};
