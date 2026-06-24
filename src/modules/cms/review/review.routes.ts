import { Router } from "express";
import { authenticate } from "../../../middlewares/auth.middleware.js";
import { validate } from "../../../middlewares/validation.middleware.js";
import { uploadSingle } from "../../../middlewares/file-validation.middleware.js";
import {
  getReviewSection,
  createReviewSection,
  updateReviewSection,
  deleteReviewSection,
  getReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
} from "./review.controller.js";
import {
  createReviewSectionSchema,
  updateReviewSectionSchema,
  createReviewSchema,
  updateReviewSchema,
} from "./review.validation.js";

const router = Router();

// ── REVIEW SECTION — Public ───────────────────────────────────────────────
// Static routes must come before dynamic ones to avoid param conflicts

router.route("/review/section").get(getReviewSection);

// ── REVIEW SECTION — Admin ────────────────────────────────────────────────

router
  .route("/review/create-section")
  .post(
    authenticate({ type: "admin" }),
    validate(createReviewSectionSchema),
    createReviewSection
  );

router
  .route("/review/update-section/:id")
  .put(
    authenticate({ type: "admin" }),
    validate(updateReviewSectionSchema),
    updateReviewSection
  );

router
  .route("/review/delete-section/:id")
  .delete(authenticate({ type: "admin" }), deleteReviewSection);

// ── REVIEWS — Public ──────────────────────────────────────────────────────

router.route("/review/:sectionId/reviews").get(getReviews);

// Single review — placed after static "/review/section" to avoid param conflicts
router.route("/review/:reviewId").get(getReview);

// ── REVIEWS — Admin ───────────────────────────────────────────────────────

router
  .route("/review/:sectionId/create-review")
  .post(
    authenticate({ type: "admin" }),
    uploadSingle("picture"),
    (req, _res, next) => {
      delete req.body.picture;
      next();
    },
    validate(createReviewSchema),
    createReview
  );

router
  .route("/review/update-review/:reviewId")
  .put(
    authenticate({ type: "admin" }),
    uploadSingle("picture"),
    (req, _res, next) => {
      delete req.body.picture;
      next();
    },
    validate(updateReviewSchema),
    updateReview
  );

router
  .route("/review/delete-review/:reviewId")
  .delete(authenticate({ type: "admin" }), deleteReview);

export default router;
