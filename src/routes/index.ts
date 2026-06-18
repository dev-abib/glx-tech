import express from "express";
const router = express.Router();

import userRoutes from "../modules/user/user.routes.js";
import adminRoutes from "../modules/admin/admin.routes.js";

// user routes
router.use("/users", userRoutes);

// admin routes
router.use("/admin", adminRoutes);

export default router;
