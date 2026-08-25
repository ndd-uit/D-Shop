import { Router } from "express";
import {
    loginUser,
    registerController,
} from "./auth.controller.js"

const router = Router();

// Login route
router.post("/login", loginUser);

// Register route
router.post("/register", registerController);

export default router;
