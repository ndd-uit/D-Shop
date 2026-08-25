import { Router } from "express";
import authenticate from "../../middlewares/auth.middleware.js";
import authorizeRole from "../../middlewares/authorizeRole.js";
import {
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

export default router;
