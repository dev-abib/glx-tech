import { Router } from "express";
import { authenticate } from "../../../middlewares/auth.middleware.js";
import { validate } from "../../../middlewares/validation.middleware.js";
import { uploadSingle } from "../../../middlewares/file-validation.middleware.js";
import {
  getSiteSettings,
  createSiteSettings,
  updateSiteSettings,
  getSocials,
  createSocial,
  updateSocial,
  deleteSocial,
} from "./site-settings.controller.js";
import {
  createSiteSettingsSchema,
  updateSiteSettingsSchema,
  createSocialSchema,
  updateSocialSchema,
} from "./site-settings.validation.js";

const router = Router();

// ── SITE SETTINGS — Public ────────────────────────────────────────────────

router.route("/site-settings").get(getSiteSettings);

// ── SITE SETTINGS — Admin ─────────────────────────────────────────────────

router
  .route("/create-site-settings")
  .post(
    authenticate({ type: "admin" }),
    validate(createSiteSettingsSchema),
    createSiteSettings
  );

router
  .route("/update-site-settings/:id")
  .put(
    authenticate({ type: "admin" }),
    validate(updateSiteSettingsSchema),
    updateSiteSettings
  );

// ── SOCIAL — Public ───────────────────────────────────────────────────────

router.route("/site-settings/socials").get(getSocials);

// ── SOCIAL — Admin ────────────────────────────────────────────────────────

router
  .route("/site-settings/create-social")
  .post(
    authenticate({ type: "admin" }),
    uploadSingle("icon"),
    (req, _res, next) => {
      delete req.body.icon;
      next();
    },
    validate(createSocialSchema),
    createSocial
  );

router
  .route("/site-settings/update-social/:socialId")
  .put(
    authenticate({ type: "admin" }),
    uploadSingle("icon"),
    (req, _res, next) => {
      delete req.body.icon;
      next();
    },
    validate(updateSocialSchema),
    updateSocial
  );

router
  .route("/site-settings/delete-social/:socialId")
  .delete(authenticate({ type: "admin" }), deleteSocial);

export default router;
