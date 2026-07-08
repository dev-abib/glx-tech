import express from "express";
import { validate } from "../../middlewares/validation.middleware.js";
import { CreateDonationSchema } from "./stripe.validation.js";
import {
  createDonationPaymentLink,
  getDonations,
  getDonationStats,
} from "./stripe.controllers.js";

const router = express.Router();

// Create a donation payment link (public)
router
  .route("/donate")
  .post(validate(CreateDonationSchema), createDonationPaymentLink);

// Get all completed donations (public)
router.route("/donations").get(getDonations);

// Get donation stats (public)
router.route("/donations/stats").get(getDonationStats);

export default router;
