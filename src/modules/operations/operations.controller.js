import {
    getFinancialOverview,
    getManagerReport,
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

const getFinancialOverviewController = async (
    req,
    res
) => {
    try {
        const data = await getFinancialOverview(
            req.query.from,
            req.query.to
        );

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        if (
            error.message === "INVALID_FINANCIAL_DATE_RANGE" ||
            error.message === "FINANCIAL_DATE_RANGE_TOO_LARGE"
        ) {
            return res.status(400).json({
                success: false,
                message: error.message === "FINANCIAL_DATE_RANGE_TOO_LARGE"
                    ? "Khoảng thời gian báo cáo không được vượt quá 366 ngày"
                    : "Khoảng thời gian báo cáo không hợp lệ",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Không thể lấy tổng quan tài chính",
        });
    }
};

const getManagerReportController = async (req, res) => {
    try {
        const data = await getManagerReport(
            req.query.from,
            req.query.to
        );

        return res.status(200).json({ success: true, data });
    } catch (error) {
        if (
            error.message === "INVALID_FINANCIAL_DATE_RANGE" ||
            error.message === "FINANCIAL_DATE_RANGE_TOO_LARGE"
        ) {
            return res.status(400).json({
                success: false,
                message: error.message === "FINANCIAL_DATE_RANGE_TOO_LARGE"
                    ? "Khoảng thời gian báo cáo không được vượt quá 366 ngày"
                    : "Khoảng thời gian báo cáo không hợp lệ",
            });
        }

        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Không thể lấy báo cáo cửa hàng",
        });
    }
};

export {
    getFinancialOverviewController,
    getManagerReportController,
    getOperationalDashboardController,
};
