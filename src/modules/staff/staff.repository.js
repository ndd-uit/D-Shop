import prisma from "../../config/prisma.js";
import { UserRole } from "../../generated/prisma/client.ts";

const STAFF_SELECT = {
    userId: true,
    fullName: true,
    email: true,
    phone: true,
    role: true,
    isActive: true,
    createdAt: true,
};

const findRentalStaff = async (
    db = prisma
) => {
    return db.user.findMany({
        where: {
            role: UserRole.RENTAL_STAFF,
        },
        select: STAFF_SELECT,
        orderBy: {
            createdAt: "desc",
        },
    });
};

const findStaffConflict = async (
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
        select: {
            userId: true,
            email: true,
            phone: true,
        },
    });
};

const findStaffById = async (
    userId,
    db = prisma
) => {
    return db.user.findUnique({
        where: {
            userId,
        },
        select: STAFF_SELECT,
    });
};

const findStaffUpdateConflict = async (
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

const createRentalStaff = async (
    data,
    db = prisma
) => {
    return db.user.create({
        data,
        select: STAFF_SELECT,
    });
};

const updateRentalStaff = async (
    userId,
    data,
    db = prisma
) => {
    return db.user.update({
        where: {
            userId,
        },
        data,
        select: STAFF_SELECT,
    });
};

export {
    STAFF_SELECT,
    findRentalStaff,
    findStaffConflict,
    findStaffById,
    findStaffUpdateConflict,
    createRentalStaff,
    updateRentalStaff,
};
