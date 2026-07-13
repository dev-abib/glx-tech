import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import {
  CreatePlanSchema,
  UpdatePlanSchema,
  BulkSetPlanFeaturesSchema,
  CreateFeatureDefinitionSchema,
  UpdateFeatureDefinitionSchema,
} from "./plans.validation.js";
import {
  adminCreatePlan,
  adminGetAllPlans,
  adminGetPlanById,
  adminUpdatePlan,
  adminDeletePlan,
  adminSetPlanFeatures,
  adminGetAllFeatureDefinitions,
  adminCreateFeatureDefinition,
  adminUpdateFeatureDefinition,
  adminDeleteFeatureDefinition,
  getPublicPlans,
} from "./plans.controller.js";

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// GET /plans — public pricing page
router.route("/plans").get(getPublicPlans);

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES (authenticated)
// ═══════════════════════════════════════════════════════════════════════════

// Plan CRUD
router
  .route("/admin/plans")
  .get(authenticate({ type: "admin" }), adminGetAllPlans)
  .post(authenticate({ type: "admin" }), validate(CreatePlanSchema), adminCreatePlan);

router
  .route("/admin/plans/:id")
  .get(authenticate({ type: "admin" }), adminGetPlanById)
  .patch(authenticate({ type: "admin" }), validate(UpdatePlanSchema), adminUpdatePlan)
  .delete(authenticate({ type: "admin" }), adminDeletePlan);

// Plan features
router
  .route("/admin/plans/:id/features")
  .patch(authenticate({ type: "admin" }), validate(BulkSetPlanFeaturesSchema), adminSetPlanFeatures);

// Feature definitions
router
  .route("/admin/feature-definitions")
  .get(authenticate({ type: "admin" }), adminGetAllFeatureDefinitions)
  .post(authenticate({ type: "admin" }), validate(CreateFeatureDefinitionSchema), adminCreateFeatureDefinition);

router
  .route("/admin/feature-definitions/:id")
  .patch(authenticate({ type: "admin" }), validate(UpdateFeatureDefinitionSchema), adminUpdateFeatureDefinition)
  .delete(authenticate({ type: "admin" }), adminDeleteFeatureDefinition);

export default router;
