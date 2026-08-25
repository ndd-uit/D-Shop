import { login, register } from "./auth.service.js";

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body ?? {}; // ?? là toán tử nullish coalescing, nếu req.body là null hoặc undefined thì sẽ gán giá trị mặc định là {}
        const result = await login(email, password);
        res.status(200).json({
            success: true,
            message: "Đăng nhập thành công",
            data: result,
        });

    } catch (error) {
        if (error.message === "INVALID_LOGIN_DATA") {
            return res.status(400).json({
                success: false,
                message: "Thông tin đăng nhập không hợp lệ",
            });
        }

        if (error.message === "INVALID_CREDENTIALS") {
            // 401 Unauthorized
            return res.status(401).json({
                success: false,
                message: "Email hoặc mật khẩu không chính xác",
            });
        }
        if (error.message === "USER_INACTIVE") {
            // 403 Forbidden
            return res.status(403).json({
                success: false,
                message: "Tài khoản đã bị vô hiệu hóa",
            });
        }
        // 500 Internal Server Error for other unexpected errors
        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi không mong muốn",
        });
    }
};

const registerController = async (
    req,
    res
) => {
    try {
        const user = await register(req.body ?? {});

        return res.status(201).json({
            success: true,
            message: "Đăng ký tài khoản thành công",
            data: user,
        });
    } catch (error) {
        if (
            error.message === "INVALID_REGISTER_DATA"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Thông tin đăng ký không hợp lệ",
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
            error.message === "ACCOUNT_ALREADY_EXISTS"
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
            message: "Không thể đăng ký tài khoản",
        });
    }
};

export { loginUser, registerController };
