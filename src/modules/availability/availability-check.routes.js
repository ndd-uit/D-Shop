import { Router } from "express";
import {
    checkAvailabilityController,
} from "./availability.controller.js";

const router = Router();

router.get(
    "/check",
    checkAvailabilityController
);

export default router;
