import express from "express";
const router = express.Router();

import userRoutes from "../modules/user/user.routes.js";
import adminRoutes from "../modules/admin/admin.routes.js";
import cmsRoutes from "../modules/cms/cms.route.js";
import { getSystemReport } from "../modules/system/system.controller.js";

// health check — returns detailed system report (also available at root /health)
router.get("/health", getSystemReport);

// user routes
router.use("/users", userRoutes);

// admin routes
router.use("/admin", adminRoutes);

// cms routes (hero, services, contact inquiries)
router.use("/cms", cmsRoutes);

export default router;
