import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

const authenticate = async (req, res, next) => {
    // Lấy token từ header Authorization
    const authHeader = req.headers.authorization;

    // Kiểm tra xem header có tồn tại và có định dạng "Bearer <token>"
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Bạn chưa được xác thực",
        });
    }

    // Lấy token từ header
    const token = authHeader.split(" ")[1];

    let decoded;

    try {
        decoded = jwt.verify(
            token,
            process.env.JWT_SECRET,
        );
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Token không hợp lệ hoặc đã hết hạn",
        });
    }

    if (
        !decoded ||
        typeof decoded !== "object" ||
        typeof decoded.userId !== "string"
    ) {
        return res.status(401).json({
            success: false,
            message: "Token không hợp lệ hoặc đã hết hạn",
        });
    }

    try {
        const user = await prisma.user.findUnique({
            where: {
                userId: decoded.userId,
            },
            select: {
                userId: true,
                role: true,
                isActive: true,
            },
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Tài khoản không tồn tại",
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Tài khoản đã bị vô hiệu hóa",
            });
        }

        req.user = {
            userId: user.userId,
            role: user.role,
        };

        return next();
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Không thể xác thực tài khoản",
        });
    }
};

export default authenticate;
