import { Request, RequestHandler, Response } from "express";
import { ApiResponse } from "../../utils/api-response.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { stripe } from "../../config/stripe.config.js";
import { StripeService } from "./stripe.service.js";
import type { CreateDonationInput, CreateSubscriptionCheckoutInput } from "./stripe.validation.js";
import { env } from "../../config/env.js";

const stripeService = new StripeService();

/**
 * Quick-donate: creates a Checkout Session and returns the checkout URL.
 * Public endpoint — no authentication or payload required.
 */
export const quickDonateCheckout: RequestHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = await stripeService.createDonationCheckoutSession();
    if (!result.url) {
      return res
        .status(500)
        .json(new ApiResponse(500, "Failed to create checkout session"));
    }
    return res
      .status(200)
      .json(
        new ApiResponse(200, "Checkout session created successfully", {
          checkoutUrl: result.url,
          donationId: result.donationId,
        })
      );
  }
);

/**
 * Create a donation payment link.
 * Public endpoint — no authentication required.
 */
export const createDonationPaymentLink: RequestHandler<
  {},
  ApiResponse<{ paymentLinkUrl: string; donationId: string }>,
  CreateDonationInput
> = asyncHandler(async (req: Request, res: Response) => {
  const result = await stripeService.createDonationPaymentLink(req.body);

  return res
    .status(201)
    .json(new ApiResponse(201, "Donation payment link created successfully", result));
});

/**
 * Get all completed donations (public).
 */
export const getDonations: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await stripeService.getDonations({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, "Donations fetched successfully", result));
  }
);

/**
 * Get donation statistics (public).
 */
export const getDonationStats: RequestHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = await stripeService.getDonationStats();

    return res
      .status(200)
      .json(new ApiResponse(200, "Donation stats fetched successfully", result));
  }
);

/**
 * Create a Stripe Checkout Session for a subscription plan.
 * Requires authentication.
 */
export const createSubscriptionCheckout: RequestHandler<
  {},
  ApiResponse<{ url: string; sessionId: string }>,
  CreateSubscriptionCheckoutInput
> = asyncHandler(async (req: Request, res: Response) => {
  const result = await stripeService.createSubscriptionCheckoutSession(
    req.body,
    req.user!.id
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Checkout session created", result));
});

/**
 * Create a Stripe Billing Portal session for subscription management.
 * Requires authentication.
 */
export const createBillingPortal: RequestHandler<
  {},
  ApiResponse<{ url: string }>
> = asyncHandler(async (req: Request, res: Response) => {
  const returnUrl = (req.query.return_url as string) || undefined;
  const result = await stripeService.createBillingPortalSession(
    req.user!.id,
    returnUrl
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Billing portal session created", result));
});

/**
 * Get the authenticated user's current subscription details.
 */
export const getMySubscription: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await stripeService.getMySubscription(req.user!.id);

    return res
      .status(200)
      .json(new ApiResponse(200, "Subscription fetched successfully", result));
  }
);

/**
 * Cancel the authenticated user's subscription at period end.
 */
export const cancelMySubscription: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await stripeService.cancelSubscription(req.user!.id);

    return res
      .status(200)
      .json(new ApiResponse(200, result.message, { currentPeriodEnd: result.currentPeriodEnd }));
  }
);

/**
 * Renew/reactivate the authenticated user's subscription.
 */
export const renewMySubscription: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await stripeService.renewSubscription(req.user!.id);

    return res
      .status(201)
      .json(new ApiResponse(201, "Subscription renewal initiated", { checkoutUrl: result.url, sessionId: result.sessionId }));
  }
);

/**
 * Stripe webhook handler for checkout.session.completed AND subscription events.
 * This endpoint is called by Stripe — no auth, but verifies the Stripe webhook signature.
 */
export const stripeWebhook: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;

    if (!sig) {
      return res
        .status(400)
        .json(new ApiResponse(400, "Missing stripe-signature header"));
    }

    const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res
        .status(500)
        .json(new ApiResponse(500, "STRIPE_WEBHOOK_SECRET is not configured"));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let event: any;
    try {
      const rawBody = req.body as Buffer;
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        webhookSecret
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid signature";
      return res
        .status(400)
        .json(new ApiResponse(400, `Webhook signature verification failed: ${message}`));
    }

    const object = event.data.object as Record<string, unknown>;

    switch (event.type) {
      case "checkout.session.completed": {
        // Handle both donations and subscriptions
        await stripeService.handleCheckoutCompleted(object);

        // If it's a subscription checkout, also update the user's plan
        if (object.mode === "subscription") {
          await stripeService.handleSubscriptionCheckoutCompleted(object);
        }
        break;
      }
      case "customer.subscription.updated": {
        await stripeService.handleSubscriptionUpdated(object);
        break;
      }
      case "customer.subscription.deleted": {
        await stripeService.handleSubscriptionDeleted(object);
        break;
      }
      case "invoice.paid": {
        await stripeService.handleInvoicePaid(object);
        break;
      }
      case "invoice.payment_failed": {
        await stripeService.handleInvoicePaymentFailed(object);
        break;
      }
    }

    return res
      .status(200)
      .json(new ApiResponse(200, "Webhook received"));
  }
);
