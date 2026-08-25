import { Router } from "express";
import authenticate from "../../middlewares/auth.middleware.js";
import authorizeRole from "../../middlewares/authorizeRole.js";
import validateUuid from "../../middlewares/validateUuid.js";
import {
    createCategoryController,
    getCategoriesController,
    updateCategoryController,
    updateCategoryStatusController,
} from "./garment.controller.js";

const router = Router();

router.get(
    "/",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    getCategoriesController
);

router.post(
    "/",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    createCategoryController
);

router.patch(
    "/:categoryId/status",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    validateUuid("categoryId"),
    updateCategoryStatusController
);

router.patch(
    "/:categoryId",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    validateUuid("categoryId"),
    updateCategoryController
);

export default router;
