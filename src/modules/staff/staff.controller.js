import {
    createStaff,
    getStaffList,
    updateStaff,
    updateStaffStatus,
} from "./staff.service.js";

const getStaffListController = async (
    req,
    res
) => {
    try {
        const staff = await getStaffList();

        return res.status(200).json({
            success: true,
            data: staff,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể lấy danh sách nhân viên",
        });
    }
};

const createStaffController = async (
    req,
    res
) => {
    try {
        const staff = await createStaff(
            req.body ?? {}
        );

        return res.status(201).json({
            success: true,
            message: "Tạo tài khoản nhân viên thành công",
            data: staff,
        });
    } catch (error) {
        if (error.message === "INVALID_STAFF_DATA") {
            return res.status(400).json({
                success: false,
                message:
                    "Thông tin tài khoản nhân viên không hợp lệ",
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
            "STAFF_ACCOUNT_ALREADY_EXISTS"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Email hoặc số điện thoại đã được sử dụng",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể tạo tài khoản nhân viên",
        });
    }
};

const updateStaffController = async (
    req,
    res
) => {
    try {
        const staff = await updateStaff(
            req.params.userId,
            req.body ?? {}
        );

        return res.status(200).json({
            success: true,
            message:
                "Cập nhật thông tin nhân viên thành công",
            data: staff,
        });
    } catch (error) {
        if (error.message === "STAFF_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy nhân viên",
            });
        }

        if (
            error.message ===
            "TARGET_NOT_RENTAL_STAFF" ||
            error.message ===
            "STAFF_FIELD_NOT_ALLOWED"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    error.message ===
                    "TARGET_NOT_RENTAL_STAFF"
                        ? "Tài khoản mục tiêu không phải nhân viên cho thuê"
                        : "Không được phép cập nhật trường này",
            });
        }

        if (error.message === "INVALID_STAFF_DATA") {
            return res.status(400).json({
                success: false,
                message:
                    "Thông tin nhân viên không hợp lệ",
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
            "STAFF_ACCOUNT_ALREADY_EXISTS"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Email hoặc số điện thoại đã được sử dụng",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể cập nhật thông tin nhân viên",
        });
    }
};

const updateStaffStatusController = async (
    req,
    res
) => {
    try {
        const staff = await updateStaffStatus(
            req.params.userId,
            req.body?.isActive
        );

        return res.status(200).json({
            success: true,
            message:
                "Cập nhật trạng thái nhân viên thành công",
            data: staff,
        });
    } catch (error) {
        if (error.message === "STAFF_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy nhân viên",
            });
        }

        if (
            error.message ===
            "TARGET_NOT_RENTAL_STAFF"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Tài khoản mục tiêu không phải nhân viên cho thuê",
            });
        }

        if (
            error.message ===
            "INVALID_STAFF_STATUS"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Trạng thái nhân viên không hợp lệ",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể cập nhật trạng thái nhân viên",
        });
    }
};

export {
    getStaffListController,
    createStaffController,
    updateStaffController,
    updateStaffStatusController,
};
