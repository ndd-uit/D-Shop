import { Router } from "express";
import authenticate from "../../middlewares/auth.middleware.js";
import authorizeRole from "../../middlewares/authorizeRole.js";
import {
    getFinancialOverviewController,
    getManagerReportController,
    getOperationalDashboardController,
} from "./operations.controller.js";

const router = Router();

router.get(
    "/dashboard",
    authenticate,
    authorizeRole(
        "RENTAL_STAFF",
        "STORE_MANAGER"
    ),
    getOperationalDashboardController
);

router.get(
    "/financial-overview",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    getFinancialOverviewController
);

router.get(
    "/report",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    getManagerReportController
);

export default router;
