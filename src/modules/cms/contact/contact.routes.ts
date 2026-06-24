import { Router } from "express";
import { authenticate } from "../../../middlewares/auth.middleware.js";
import { validate } from "../../../middlewares/validation.middleware.js";
import {
  submitInquiry,
  getAllInquiries,
  getInquiry,
  markInquiryAsRead,
  replyToInquiry,
  deleteInquiry,
  getInquiryStats,
} from "./contact.controller.js";
import {
  createContactSchema,
  replyContactSchema,
} from "./contact.validation.js";

const router = Router();

// ── CONTACT — Public ──────────────────────────────────────────────────────

router.route("/submit-inquiry").post(validate(createContactSchema), submitInquiry);

// ── CONTACT — Admin ───────────────────────────────────────────────────────

router
  .route("/gt-all-inquiries")
  .get(authenticate({ type: "admin" }), getAllInquiries);

router
  .route("/get-inquiry-stats")
  .get(authenticate({ type: "admin" }), getInquiryStats);

router
  .route("/get-inquiry/:id")
  .get(authenticate({ type: "admin" }), getInquiry);

router
  .route("/mark-inquiry-read/:id")
  .patch(authenticate({ type: "admin" }), markInquiryAsRead);

router
  .route("/reply-inquiry/:id")
  .post(authenticate({ type: "admin" }), validate(replyContactSchema), replyToInquiry);

router
  .route("/delete-inquiry/:id")
  .delete(authenticate({ type: "admin" }), deleteInquiry);

export default router;
