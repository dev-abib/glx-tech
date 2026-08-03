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
//
// Any authenticated user can buy/manage a subscription — the flow is now
// "subscribe first, become a seller later" (via POST /users/update-as-seller,
// which requires an active paid subscription). So these routes only require
// being logged in, NOT the seller role.

// Create a subscription checkout session (authenticated)
router
  .route("/subscription/checkout")
  .post(
    authenticate(),
    validate(CreateSubscriptionCheckoutSchema),
    createSubscriptionCheckout
  );

// Create a billing portal session (authenticated)
router
  .route("/subscription/portal")
  .get(authenticate(), createBillingPortal);

// Get my subscription details (authenticated)
router
  .route("/subscription/my-plan")
  .get(authenticate(), getMySubscription);

// Cancel my subscription at period end (authenticated)
router
  .route("/subscription/cancel")
  .post(authenticate(), cancelMySubscription);

// Renew/reactivate my subscription (authenticated)
router
  .route("/subscription/renew")
  .post(authenticate(), renewMySubscription);

export default router;
