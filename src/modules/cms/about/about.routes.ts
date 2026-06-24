import { Router } from "express";
import { authenticate } from "../../../middlewares/auth.middleware.js";
import { validate } from "../../../middlewares/validation.middleware.js";
import { uploadFields } from "../../../middlewares/file-validation.middleware.js";
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
    uploadFields([
      { name: "image1", maxCount: 1 },
      { name: "image2", maxCount: 1 },
    ]),
    validate(createAboutSchema),
    createAbout
  );

router
  .route("/update-about/:id")
  .put(
    authenticate({ type: "admin" }),
    uploadFields([
      { name: "image1", maxCount: 1 },
      { name: "image2", maxCount: 1 },
    ]),
    validate(updateAboutSchema),
    updateAbout
  );

router
  .route("/delete-about-image/:id")
  .delete(authenticate({ type: "admin" }), deleteAboutImage);

export default router;
