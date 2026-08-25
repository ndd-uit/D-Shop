import { Router } from "express";
import authenticate from "../../middlewares/auth.middleware.js";
import authorizeRole from "../../middlewares/authorizeRole.js";
import validateUuid from "../../middlewares/validateUuid.js";
import {
    createRentalUnitController,
    getRentalUnitsForManagementController,
    retireRentalUnitController,
    updateRentalUnitController,
} from "./garment.controller.js";

const router = Router();

router.get(
    "/manage",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    getRentalUnitsForManagementController
);

router.post(
    "/",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    createRentalUnitController
);

router.patch(
    "/:rentalUnitId/retire",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    validateUuid("rentalUnitId"),
    retireRentalUnitController
);

router.patch(
    "/:rentalUnitId",
    authenticate,
    authorizeRole("STORE_MANAGER"),
    validateUuid("rentalUnitId"),
    updateRentalUnitController
);

export default router;
