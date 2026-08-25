import { Router } from "express";
import authenticate from "../../middlewares/auth.middleware.js";
import {
    getMyProfileController,
    updateMyProfileController,
} from "./user.controller.js";

const router = Router();

router.get(
    "/me",
    authenticate,
    getMyProfileController
);

router.patch(
    "/me",
    authenticate,
    updateMyProfileController
);

export default router;
