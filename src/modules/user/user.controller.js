import {
    getMyProfile,
    updateMyProfile,
} from "./user.service.js";

const getMyProfileController = async (
    req,
    res
) => {
    try {
        const user = await getMyProfile(
            req.user.userId
        );

        return res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        if (error.message === "USER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Không thể lấy hồ sơ người dùng",
        });
    }
};

const updateMyProfileController = async (
    req,
    res
) => {
    try {
        const user = await updateMyProfile(
            req.user.userId,
            req.body ?? {}
        );

        return res.status(200).json({
            success: true,
            message: "Cập nhật hồ sơ thành công",
            data: user,
        });
    } catch (error) {
        if (
            error.message ===
            "PROFILE_FIELD_NOT_ALLOWED"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Không được phép cập nhật trường này",
            });
        }

        if (
            error.message === "NO_PROFILE_CHANGES" ||
            error.message === "INVALID_PROFILE_DATA"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Thông tin cập nhật hồ sơ không hợp lệ",
            });
        }

        if (error.message === "EMAIL_ALREADY_EXISTS") {
            return res.status(409).json({
                success: false,
                message: "Email đã được sử dụng",
            });
        }

        if (error.message === "PHONE_ALREADY_EXISTS") {
            return res.status(409).json({
                success: false,
                message: "Số điện thoại đã được sử dụng",
            });
        }

        if (
            error.message ===
            "PROFILE_CONTACT_ALREADY_EXISTS"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Email, số điện thoại hoặc CCCD đã được sử dụng",
            });
        }

        if (error.message === "USER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Không thể cập nhật hồ sơ người dùng",
        });
    }
};

export {
    getMyProfileController,
    updateMyProfileController,
};
