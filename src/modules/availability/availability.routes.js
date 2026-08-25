import { Router } from "express";
import authenticate from "../../middlewares/auth.middleware.js";
import authorizeRole from "../../middlewares/authorizeRole.js";
import validateUuid from "../../middlewares/validateUuid.js";
import {
    cancelAvailabilityBlockController,
    createAvailabilityBlockController,
    endAvailabilityBlockController,
    getAvailabilityBlocksController,
} from "./availability.controller.js";

const router = Router();

router.get(
    "/",
    authenticate,
    authorizeRole(
        "RENTAL_STAFF",
        "STORE_MANAGER"
    ),
    getAvailabilityBlocksController
);

router.post(
    "/",
    authenticate,
    authorizeRole(
        "RENTAL_STAFF",
        "STORE_MANAGER"
    ),
    createAvailabilityBlockController
);

router.patch(
    "/:blockId/end",
    authenticate,
    authorizeRole(
        "RENTAL_STAFF",
        "STORE_MANAGER"
    ),
    validateUuid("blockId"),
    endAvailabilityBlockController
);

router.delete(
    "/:blockId",
    authenticate,
    authorizeRole(
        "RENTAL_STAFF",
        "STORE_MANAGER"
    ),
    validateUuid("blockId"),
    cancelAvailabilityBlockController
);

export default router;
