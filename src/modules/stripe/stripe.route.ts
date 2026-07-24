import express from "express";
import { validate } from "../../middlewares/validation.middleware.js";
import {
  CreateDonationSchema,
  CreateSubscriptionCheckoutSchema,
} from "./stripe.validation.js";
import {
  createDonationPaymentLink,
  getDonations,
  getDonationStats,
  quickDonateCheckout,
  createSubscriptionCheckout,
  createBillingPortal,
  getMySubscription,
  cancelMySubscription,
  renewMySubscription,
} from "./stripe.controllers.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// ── Donations ────────────────────────────────────────────────────────────

// Quick donate — returns checkout URL (no payload needed)
router.route("/donate/checkout").get(quickDonateCheckout);

// Create a donation payment link (public)
router
  .route("/donate")
  .post(validate(CreateDonationSchema), createDonationPaymentLink);

// Get all completed donations (public)
router.route("/donations").get(getDonations);

// Get donation stats (public)
router.route("/donations/stats").get(getDonationStats);

// ── Subscriptions ────────────────────────────────────────────────────────

// Create a subscription checkout session (authenticated sellers)
router
  .route("/subscription/checkout")
  .post(
    authenticate({ type: "seller" }),
    validate(CreateSubscriptionCheckoutSchema),
    createSubscriptionCheckout
  );

// Create a billing portal session (authenticated sellers)
router
  .route("/subscription/portal")
  .get(authenticate({ type: "seller" }), createBillingPortal);

// Get my subscription details (authenticated sellers)
router
  .route("/subscription/my-plan")
  .get(authenticate({ type: "seller" }), getMySubscription);

// Cancel my subscription at period end (authenticated sellers)
router
  .route("/subscription/cancel")
  .post(authenticate({ type: "seller" }), cancelMySubscription);

// Renew/reactivate my subscription (authenticated sellers)
router
  .route("/subscription/renew")
  .post(authenticate({ type: "seller" }), renewMySubscription);

export default router;
