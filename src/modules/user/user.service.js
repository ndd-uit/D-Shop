import {
    findProfileConflict,
    findUserProfileById,
    updateUserProfile,
} from "./user.repository.js";

const ALLOWED_PROFILE_FIELDS = new Set([
    "fullName",
    "email",
    "phone",
    "nationalId",
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getMyProfile = async (userId) => {
    const user = await findUserProfileById(userId);

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    return user;
};

const updateMyProfile = async (
    userId,
    body
) => {
    if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body)
    ) {
        throw new Error("INVALID_PROFILE_DATA");
    }

    const fields = Object.keys(body);

    if (
        fields.some(
            (field) =>
                !ALLOWED_PROFILE_FIELDS.has(field)
        )
    ) {
        throw new Error("PROFILE_FIELD_NOT_ALLOWED");
    }

    if (fields.length === 0) {
        throw new Error("NO_PROFILE_CHANGES");
    }

    const data = {};

    if (fields.includes("fullName")) {
        if (typeof body.fullName !== "string") {
            throw new Error("INVALID_PROFILE_DATA");
        }

        const fullName = body.fullName.trim();

        if (!fullName) {
            throw new Error("INVALID_PROFILE_DATA");
        }

        data.fullName = fullName;
    }

    if (fields.includes("email")) {
        if (typeof body.email !== "string") {
            throw new Error("INVALID_PROFILE_DATA");
        }

        const email = body.email.trim().toLowerCase();

        if (!EMAIL_REGEX.test(email)) {
            throw new Error("INVALID_PROFILE_DATA");
        }

        data.email = email;
    }

    if (fields.includes("phone")) {
        if (
            body.phone !== null &&
            typeof body.phone !== "string"
        ) {
            throw new Error("INVALID_PROFILE_DATA");
        }

        data.phone = body.phone?.trim() || null;
    }

    if (fields.includes("nationalId")) {
        if (
            body.nationalId !== null &&
            typeof body.nationalId !== "string"
        ) {
            throw new Error("INVALID_PROFILE_DATA");
        }

        data.nationalId =
            body.nationalId?.trim() || null;
    }

    const currentUser =
        await findUserProfileById(userId);

    if (!currentUser) {
        throw new Error("USER_NOT_FOUND");
    }

    const conflict = await findProfileConflict(
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
        return await updateUserProfile(
            userId,
            data
        );
    } catch (error) {
        if (error?.code === "P2002") {
            throw new Error(
                "PROFILE_CONTACT_ALREADY_EXISTS"
            );
        }

        if (error?.code === "P2025") {
            throw new Error("USER_NOT_FOUND");
        }

        throw error;
    }
};

export { getMyProfile, updateMyProfile };
