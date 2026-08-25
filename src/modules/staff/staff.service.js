import bcrypt from "bcrypt";
import { UserRole } from "../../generated/prisma/client.ts";
import {
    createRentalStaff,
    findStaffById,
    findRentalStaff,
    findStaffConflict,
    findStaffUpdateConflict,
    updateRentalStaff,
} from "./staff.repository.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_STAFF_UPDATE_FIELDS = new Set([
    "fullName",
    "email",
    "phone",
]);

const getStaffList = async () => {
    return findRentalStaff();
};

const createStaff = async ({
    fullName,
    email,
    phone,
    password,
}) => {
    const normalizedName =
        typeof fullName === "string"
            ? fullName.trim()
            : "";
    const normalizedEmail =
        typeof email === "string"
            ? email.trim().toLowerCase()
            : "";
    const normalizedPhone =
        typeof phone === "string"
            ? phone.trim() || null
            : phone == null
                ? null
                : undefined;

    if (
        !normalizedName ||
        !normalizedEmail ||
        typeof password !== "string" ||
        !password ||
        normalizedPhone === undefined ||
        !EMAIL_REGEX.test(normalizedEmail)
    ) {
        throw new Error("INVALID_STAFF_DATA");
    }

    const conflict = await findStaffConflict(
        normalizedEmail,
        normalizedPhone
    );

    if (conflict) {
        if (conflict.email === normalizedEmail) {
            throw new Error("EMAIL_ALREADY_EXISTS");
        }

        throw new Error("PHONE_ALREADY_EXISTS");
    }

    const passwordHash = await bcrypt.hash(
        password,
        10
    );

    try {
        return await createRentalStaff({
            fullName: normalizedName,
            email: normalizedEmail,
            phone: normalizedPhone,
            passwordHash,
            role: UserRole.RENTAL_STAFF,
            isActive: true,
        });
    } catch (error) {
        if (error?.code === "P2002") {
            throw new Error(
                "STAFF_ACCOUNT_ALREADY_EXISTS"
            );
        }

        throw error;
    }
};

const updateStaff = async (
    userId,
    body
) => {
    const staff = await findStaffById(userId);

    if (!staff) {
        throw new Error("STAFF_NOT_FOUND");
    }

    if (staff.role !== UserRole.RENTAL_STAFF) {
        throw new Error("TARGET_NOT_RENTAL_STAFF");
    }

    if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body)
    ) {
        throw new Error("INVALID_STAFF_DATA");
    }

    const fields = Object.keys(body);

    if (
        fields.some(
            (field) =>
                !ALLOWED_STAFF_UPDATE_FIELDS.has(field)
        )
    ) {
        throw new Error("STAFF_FIELD_NOT_ALLOWED");
    }

    if (fields.length === 0) {
        throw new Error("INVALID_STAFF_DATA");
    }

    const data = {};

    if (fields.includes("fullName")) {
        if (typeof body.fullName !== "string") {
            throw new Error("INVALID_STAFF_DATA");
        }

        const fullName = body.fullName.trim();

        if (!fullName) {
            throw new Error("INVALID_STAFF_DATA");
        }

        data.fullName = fullName;
    }

    if (fields.includes("email")) {
        if (typeof body.email !== "string") {
            throw new Error("INVALID_STAFF_DATA");
        }

        const email = body.email.trim().toLowerCase();

        if (!EMAIL_REGEX.test(email)) {
            throw new Error("INVALID_STAFF_DATA");
        }

        data.email = email;
    }

    if (fields.includes("phone")) {
        if (
            body.phone !== null &&
            typeof body.phone !== "string"
        ) {
            throw new Error("INVALID_STAFF_DATA");
        }

        data.phone = body.phone?.trim() || null;
    }

    const conflict = await findStaffUpdateConflict(
        userId,
        data.email,
        data.phone
    );

    if (
        conflict &&
        conflict.email === data.email
    ) {
        throw new Error("EMAIL_ALREADY_EXISTS");
    }

    if (
        conflict &&
        conflict.phone === data.phone
    ) {
        throw new Error("PHONE_ALREADY_EXISTS");
    }

    try {
        return await updateRentalStaff(
            userId,
            data
        );
    } catch (error) {
        if (error?.code === "P2002") {
            throw new Error(
                "STAFF_ACCOUNT_ALREADY_EXISTS"
            );
        }

        if (error?.code === "P2025") {
            throw new Error("STAFF_NOT_FOUND");
        }

        throw error;
    }
};

const updateStaffStatus = async (
    userId,
    isActive
) => {
    if (typeof isActive !== "boolean") {
        throw new Error("INVALID_STAFF_STATUS");
    }

    const staff = await findStaffById(userId);

    if (!staff) {
        throw new Error("STAFF_NOT_FOUND");
    }

    if (staff.role !== UserRole.RENTAL_STAFF) {
        throw new Error("TARGET_NOT_RENTAL_STAFF");
    }

    try {
        return await updateRentalStaff(
            userId,
            {
                isActive,
            }
        );
    } catch (error) {
        if (error?.code === "P2025") {
            throw new Error("STAFF_NOT_FOUND");
        }

        throw error;
    }
};

export {
    getStaffList,
    createStaff,
    updateStaff,
    updateStaffStatus,
};
