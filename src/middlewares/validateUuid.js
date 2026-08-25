import { UUID_REGEX } from "../utils/validation.js";

const validateUuid = (paramName) => (req, res, next) => {
    if (!UUID_REGEX.test(req.params[paramName])) {
        return res.status(400).json({
            success: false,
            message: `Tham số ${paramName} không hợp lệ`,
        });
    }

    next();
};

export default validateUuid;
