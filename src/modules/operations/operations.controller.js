import {
    getOperationalDashboard,
} from "./operations.service.js";

const getOperationalDashboardController = async (
    req,
    res
) => {
    try {
        const data = await getOperationalDashboard();

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể lấy dữ liệu vận hành",
        });
    }
};

export { getOperationalDashboardController };
