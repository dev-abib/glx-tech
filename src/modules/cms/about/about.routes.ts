import { Router } from "express";
import { authenticate } from "../../../middlewares/auth.middleware.js";
import { validate } from "../../../middlewares/validation.middleware.js";
import { upload } from "../../../middlewares/file-validation.middleware.js";
import {
  getAbout,
  createAbout,
  updateAbout,
  deleteAboutImage,
} from "./about.controller.js";
import {
  createAboutSchema,
  updateAboutSchema,
} from "./about.validation.js";

const router = Router();

// ── ABOUT US — Public ─────────────────────────────────────────────────────

router.route("/get-about").get(getAbout);

// ── ABOUT US — Admin ──────────────────────────────────────────────────────

router
  .route("/create-about")
  .post(
    authenticate({ type: "admin" }),
    (req, _res, next) => {
      upload.any()(req, _res, (err) => {
        if (err) return next(err);
        next();
      });
    },
    validate(createAboutSchema),
    createAbout
  );

router
  .route("/update-about/:id")
  .put(
    authenticate({ type: "admin" }),
    (req, _res, next) => {
      upload.any()(req, _res, (err) => {
        if (err) return next(err);
        next();
      });
    },
    validate(updateAboutSchema),
    updateAbout
  );

router
  .route("/delete-about-image/:id")
  .delete(authenticate({ type: "admin" }), deleteAboutImage);

export default router;
