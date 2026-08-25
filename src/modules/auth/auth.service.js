import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserRole } from "../../generated/prisma/client.ts";
import {
    createUser,
    findUserByEmail,
    findUserByEmailOrPhone,
} from "./auth.repository.js";

const login = async (email, password) => {
    const normalizedEmail =
        typeof email === "string"
            ? email.trim().toLowerCase()
            : "";

    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
        !normalizedEmail ||
        !emailRegex.test(normalizedEmail) ||
        typeof password !== "string" ||
        !password
    ) {
        throw new Error("INVALID_LOGIN_DATA");
    }

    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
        throw new Error("INVALID_CREDENTIALS");
    }

    if (!user.isActive) {
        throw new Error("USER_INACTIVE");
    }

    const isPasswordValid = await bcrypt.compare(
        password,
        user.passwordHash,
    );

    if (!isPasswordValid) {
        throw new Error("INVALID_CREDENTIALS");
    }

    const token = jwt.sign(
        {
            userId: user.userId,
            role: user.role,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d",
        },
    );

    return {
        token,
        user: {
            userId: user.userId,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
        },
    };
};

const register = async ({
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
        normalizedPhone === undefined
    ) {
        throw new Error("INVALID_REGISTER_DATA");
    }

    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
        throw new Error("INVALID_REGISTER_DATA");
    }

    const existingUser =
        await findUserByEmailOrPhone(
            normalizedEmail,
            normalizedPhone
        );

    if (existingUser) {
        if (existingUser.email === normalizedEmail) {
            throw new Error("EMAIL_ALREADY_EXISTS");
        }

        throw new Error("PHONE_ALREADY_EXISTS");
    }

    const passwordHash = await bcrypt.hash(
        password,
        10
    );

    try {
        return await createUser({
            fullName: normalizedName,
            email: normalizedEmail,
            phone: normalizedPhone,
            passwordHash,
            role: UserRole.CUSTOMER,
            isActive: true,
        });
    } catch (error) {
        if (error?.code === "P2002") {
            throw new Error("ACCOUNT_ALREADY_EXISTS");
        }

        throw error;
    }
};

export { login, register };
