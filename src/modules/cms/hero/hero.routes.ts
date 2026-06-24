import { Router } from "express";
import { authenticate } from "../../../middlewares/auth.middleware.js";
import { validate } from "../../../middlewares/validation.middleware.js";
import { uploadSingle } from "../../../middlewares/file-validation.middleware.js";
import {
  getHero,
  createHero,
  updateHero,
  createService,
  updateService,
  deleteService,
  getServices,
} from "./hero.controller.js";
import {
  createHeroSchema,
  updateHeroSchema,
  createServiceSchema,
  updateServiceSchema,
} from "./hero.validation.js";

const router = Router();

// ── HERO — Public ─────────────────────────────────────────────────────────

router.route("/hero").get(getHero);

// ── HERO — Admin ──────────────────────────────────────────────────────────

router
  .route("/create-hero")
  .post(authenticate({ type: "admin" }), validate(createHeroSchema), createHero);

router
  .route("/update-hero/:id")
  .put(authenticate({ type: "admin" }), validate(updateHeroSchema), updateHero);

// ── SERVICES — Public ─────────────────────────────────────────────────────

router.route("/hero/:heroId/services").get(getServices);

// ── SERVICES — Admin ──────────────────────────────────────────────────────

router
  .route("/hero/:heroId/create-service")
  .post(
    authenticate({ type: "admin" }),
    uploadSingle("icon"),
    (req, _res, next) => {
      delete req.body.icon;
      next();
    },
    validate(createServiceSchema),
    createService
  );

router
  .route("/update-service/:serviceId")
  .put(
    authenticate({ type: "admin" }),
    uploadSingle("icon"),
    (req, _res, next) => {
      delete req.body.icon;
      next();
    },
    validate(updateServiceSchema),
    updateService
  );

router
  .route("/delete-service/:serviceId")
  .delete(authenticate({ type: "admin" }), deleteService);

export default router;
