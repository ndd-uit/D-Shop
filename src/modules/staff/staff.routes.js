import { Router } from "express";
import authenticate from "../../middlewares/auth.middleware.js";
import authorizeRole from "../../middlewares/authorizeRole.js";
import validateUuid from "../../middlewares/validateUuid.js";
import {
    createStaffController,
    getStaffListController,
    updateStaffController,
    updateStaffStatusController,
} from "./staff.controller.js";

const router = Router();

router.get(
    "/",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    getStaffListController
);

router.post(
    "/",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    createStaffController
);

router.patch(
    "/:userId/status",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    validateUuid("userId"),
    updateStaffStatusController
);

router.patch(
    "/:userId",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    validateUuid("userId"),
    updateStaffController
);

export default router;
