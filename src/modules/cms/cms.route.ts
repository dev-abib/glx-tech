import { Router } from "express";
import heroRoutes from "./hero/hero.routes.js";
import contactRoutes from "./contact/contact.routes.js";
import aboutRoutes from "./about/about.routes.js";
import reviewRoutes from "./review/review.routes.js";
import siteSettingsRoutes from "./site-settings/site-settings.routes.js";

const router = Router();

// Mount all sub-module routes at the same level
// Each sub-module defines its own routes with full paths
router.use("/", heroRoutes);
router.use("/", contactRoutes);
router.use("/", aboutRoutes);
router.use("/", reviewRoutes);
router.use("/", siteSettingsRoutes);

export default router;
