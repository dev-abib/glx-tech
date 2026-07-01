import express from "express";
const router = express.Router();

import userRoutes from "../modules/user/user.routes.js";
import adminRoutes from "../modules/admin/admin.routes.js";
import cmsRoutes from "../modules/cms/cms.route.js";
import listingRoutes from "../modules/listing/listing.route.js";
import newsLetterRoutes from "../modules/admin/newsletter/newsletter.route.js";
import { getSystemReport } from "../modules/system/system.controller.js";

// health check — returns detailed system report (also available at root /health)
router.get("/health", getSystemReport);

// user routes
router.use("/users", userRoutes);

// admin routes
router.use("/admin", adminRoutes);

// news letter routes
router.use("/newsletter", newsLetterRoutes);

// cms routes (hero, services, contact inquiries)
router.use("/cms", cmsRoutes);

// listing routes (listings & user reviews)
router.use("/listings", listingRoutes);

export default router;
