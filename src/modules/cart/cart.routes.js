import { Router } from "express";
import authenticate from "../../middlewares/auth.middleware.js";
import authorizeRole from "../../middlewares/authorizeRole.js";
import validateUuid from "../../middlewares/validateUuid.js";
import { getCustomerCart, addCartItem, updateCartItem, updateRentalPeriod, deleteCartItem } from "./cart.controller.js";

const router = Router();

// GET /cart
router.get("/", authenticate, authorizeRole("CUSTOMER"), getCustomerCart);

// POST /cart/items
router.post("/items", authenticate, authorizeRole("CUSTOMER"), addCartItem);

// PATCH /cart/items/:id
router.patch(
    "/items/:id",
    authenticate,
    authorizeRole("CUSTOMER"),
    validateUuid("id"),
    updateCartItem
);

// PATCH /cart/rental-period
router.patch(
    "/rental-period",
    authenticate,
    authorizeRole("CUSTOMER"),
    updateRentalPeriod
);

// DELETE /cart/items/:id
router.delete(
    "/items/:id",
    authenticate,
    authorizeRole("CUSTOMER"),
    validateUuid("id"),
    deleteCartItem
);

export default router;
