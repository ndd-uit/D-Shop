import {
    createRentalPolicyVersion,
    getActiveRentalPolicy,
    getRentalPolicies,
} from "./policy.service.js";

const getRentalPoliciesController = async (
    req,
    res
) => {
    try {
        const data = await getRentalPolicies();

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể lấy danh sách chính sách thuê",
        });
    }
};

const getActiveRentalPolicyController = async (
    req,
    res
) => {
    try {
        const data = await getActiveRentalPolicy();

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        if (
            error.message === "ACTIVE_POLICY_NOT_FOUND"
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Không tìm thấy chính sách đang có hiệu lực",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể lấy chính sách đang có hiệu lực",
        });
    }
};

const createRentalPolicyVersionController = async (
    req,
    res
) => {
    try {
        const policy =
            await createRentalPolicyVersion(
                req.body,
                req.user.userId
            );

        return res.status(201).json({
            success: true,
            data: policy,
        });
    } catch (error) {
        if (
            error.message === "POLICY_VERSION_REQUIRED" ||
            error.message === "INVALID_EFFECTIVE_FROM" ||
            error.message ===
                "POLICY_EFFECTIVE_FROM_MUST_BE_FUTURE" ||
            error.message ===
                "INVALID_POLICY_NUMERIC_FIELDS" ||
            error.message === "INVALID_LATE_FEE_POLICY"
        ) {
            const messages = {
                POLICY_VERSION_REQUIRED:
                    "Cần cung cấp phiên bản chính sách",
                INVALID_EFFECTIVE_FROM:
                    "Thời điểm bắt đầu hiệu lực không hợp lệ",
                POLICY_EFFECTIVE_FROM_MUST_BE_FUTURE:
                    "Thời điểm hiệu lực phải ở tương lai",
                INVALID_POLICY_NUMERIC_FIELDS:
                    "Các giá trị số của chính sách không hợp lệ",
                INVALID_LATE_FEE_POLICY:
                    "Cấu hình chính sách phí trả trễ không hợp lệ",
            };

            return res.status(400).json({
                success: false,
                message: messages[error.message],
            });
        }

        if (
            error.message ===
                "POLICY_VERSION_ALREADY_EXISTS" ||
            error.message ===
                "POLICY_EFFECTIVE_FROM_ALREADY_EXISTS" ||
            error.message ===
                "POLICY_VERSION_CONFLICT"
        ) {
            return res.status(409).json({
                success: false,
                message: error.message ===
                    "POLICY_EFFECTIVE_FROM_ALREADY_EXISTS"
                    ? "Đã có chính sách bắt đầu tại thời điểm này"
                    : error.message === "POLICY_VERSION_CONFLICT"
                        ? "Có xung đột khi tạo phiên bản chính sách"
                        : "Phiên bản chính sách đã tồn tại",
            });
        }

        if (
            error.message === "ACTIVE_POLICY_NOT_FOUND"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Không tìm thấy chính sách hiện hành để tạo phiên bản mới",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể tạo phiên bản chính sách mới",
        });
    }
};

export {
    getRentalPoliciesController,
    getActiveRentalPolicyController,
    createRentalPolicyVersionController,
};
