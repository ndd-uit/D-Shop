import { Router } from "express";
import authenticate from "../../middlewares/auth.middleware.js";
import authorizeRole from "../../middlewares/authorizeRole.js";
import {
    createRentalPolicyVersionController,
    getActiveRentalPolicyController,
    getRentalPoliciesController,
} from "./policy.controller.js";

const router = Router();

router.get(
    "/",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    getRentalPoliciesController
);

router.get(
    "/active",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    getActiveRentalPolicyController
);

router.post(
    "/versions",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    createRentalPolicyVersionController
);

export default router;
