import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./config/prisma.js"
import garmentRoutes from "./modules/garment/garment.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import cartRoutes from "./modules/cart/cart.routes.js";
import rentalRoutes from "./modules/rental/rental.routes.js";
import paymentRoutes from "./modules/payment/payment.routes.js";
import policyRoutes from "./modules/policy/policy.routes.js";
import availabilityRoutes from "./modules/availability/availability.routes.js";
import availabilityCheckRoutes from "./modules/availability/availability-check.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import staffRoutes from "./modules/staff/staff.routes.js";
import categoryRoutes from "./modules/garment/category.routes.js";
import rentalUnitRoutes from "./modules/garment/rentalUnit.routes.js";
import operationsRoutes from "./modules/operations/operations.routes.js";
import { startExpireTemporaryHoldsJob } from "./jobs/expireTemporaryHolds.job.js";
dotenv.config();

const app = express();

const allowedCorsOrigins = new Set(
    (process.env.CORS_ORIGINS || "")
        .split(",")
        .map((origin) => origin.trim().replace(/\/$/, ""))
        .filter(Boolean)
);

app.use(cors({
    origin(origin, callback) {
        if (
            !origin ||
            allowedCorsOrigins.size === 0 ||
            allowedCorsOrigins.has(origin.replace(/\/$/, ""))
        ) {
            callback(null, true);
            return;
        }

        callback(null, false);
    },
}));
app.use(express.json()); // Cho phép phân tích cú pháp JSON trong body của yêu cầu

// Định nghĩa các route

app.use('/api/auth', authRoutes);
app.use('/api/garments', garmentRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/rentals', rentalRoutes)
app.use('/api/policies', policyRoutes)
app.use('/api/availability-blocks', availabilityRoutes)
app.use('/api/availability', availabilityCheckRoutes)
app.use('/api/users', userRoutes)
app.use('/api/staff', staffRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/rental-units', rentalUnitRoutes)
app.use('/api/operations', operationsRoutes)

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'API D Shop đang hoạt động',
    })
})

app.get('/api/health/db', async (req, res) => {
    try {
        const useCount = await prisma.user.count();
        res.json({
            success: true,
            message: 'Kết nối cơ sở dữ liệu thành công',
            userCount: useCount,
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Kết nối cơ sở dữ liệu thất bại',
        })
    }
})


// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
    startExpireTemporaryHoldsJob();
    console.log(`Server running on port ${PORT}`)
})
