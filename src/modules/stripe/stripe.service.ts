import { stripe } from "../../config/stripe.config.js";
import { getPrismaClient } from "../../config/database.js";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/api-error.js";
import type { CreateDonationInput, DonationQueryInput, CreateSubscriptionCheckoutInput } from "./stripe.validation.js";
import type { Prisma } from "@prisma/client";

const prisma = getPrismaClient();

// Reusable price ID for the donation checkout session (lazy-initialised)
let cachedDonationPriceId: string | null = null;

async function getOrCreateDonationPrice(): Promise<string> {
  if (cachedDonationPriceId) return cachedDonationPriceId;
  const price = await stripe.prices.create({
    currency: "usd",
    custom_unit_amount: { enabled: true },
    product_data: { name: "Donation" },
  });
  cachedDonationPriceId = price.id;
  return price.id;
}

export class StripeService {
  /**
   * Build a frontend URL from env config, stripping trailing slashes
   * and trimming whitespace/spurious characters.
   */
  private getFrontendUrl(): string {
    const raw = (env.FRONTEND_URL || env.APP_URL).trim();
    return raw.replace(/\/+$/, "");
  }

  /**
   * Create a Stripe Checkout Session for a quick donation.
   * No payload needed — donors enter amount/name/email on Stripe's hosted page.
   */
  async createDonationCheckoutSession() {
    // Reuse the same price — the config (custom_unit_amount) never changes
    const priceId = await getOrCreateDonationPrice();

    const baseUrl = this.getFrontendUrl();
    const successUrl = `${baseUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/donate`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: "auto",
      customer_creation: "always",
      metadata: {
        source: "donate_button",
      },
    });

    // Create a pending donation record so the webhook can look it up by session ID
    const donation = await prisma.donation.create({
      data: {
        currency: "usd",
        stripeSessionId: session.id,
        status: "pending" as const,
        metadata: {
          checkoutUrl: session.url,
        } as Prisma.InputJsonValue,
      },
    });

    return {
      url: session.url,
      donationId: donation.id,
    };
  }

  /**
   * Create a Stripe payment link for a donation.
   * Anyone can donate without authentication.
   */
  async createDonationPaymentLink(data: CreateDonationInput) {
    // Create a donation product
    const product = await stripe.products.create({
      name: "Donation",
      description: data.message || "General donation",
    });

    // Create a price with custom amount (donor chooses how much)
    const price = await stripe.prices.create({
      product: product.id,
      currency: "usd",
      custom_unit_amount: { enabled: true },
    });

    const baseUrl = this.getFrontendUrl();
    const successUrl = data.successUrl || `${baseUrl}/donate/success`;

    // Create the payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      after_completion: {
        type: "redirect",
        redirect: { url: successUrl },
      },
      metadata: {
        customer_name: data.customerName || "",
        customer_email: data.customerEmail || "",
        message: data.message || "",
      },
    });

    // Create a pending donation record in the database
    const donation = await prisma.donation.create({
      data: {
        amount: data.amount ?? null,
        currency: "usd",
        customerEmail: data.customerEmail ?? null,
        customerName: data.customerName ?? null,
        message: data.message ?? null,
        stripePaymentLinkId: paymentLink.id,
        status: "pending" as const,
        metadata: {
          paymentLinkUrl: paymentLink.url,
          paymentLinkId: paymentLink.id,
        } as Prisma.InputJsonValue,
      },
    });

    return {
      paymentLinkUrl: paymentLink.url,
      donationId: donation.id,
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION CHECKOUT
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Create a Stripe Checkout Session for subscribing to a plan.
   * Requires authentication — user must be logged in.
   */
  async createSubscriptionCheckoutSession(data: CreateSubscriptionCheckoutInput, userId: string) {
    // Look up the plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: data.planId },
    });

    if (!plan) {
      throw new ApiError(404, "Plan not found");
    }

    if (!plan.isActive) {
      throw new ApiError(400, "This plan is no longer available");
    }

    // Determine which price ID to use
    const isMonthly = data.billingCycle === "monthly";
    const priceId = isMonthly ? plan.stripePriceIdMonthly : plan.stripePriceIdAnnual;

    if (!priceId) {
      throw new ApiError(400, `No Stripe price configured for ${data.billingCycle} billing on this plan`);
    }

    // Get or create Stripe customer for this user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true, email: true, name: true },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        metadata: { userId },
      });
      customerId = customer.id;

      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const baseUrl = this.getFrontendUrl();
    const successUrl = data.successUrl || `${baseUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = data.cancelUrl || `${baseUrl}/pricing`;

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        planId: plan.id,
        planSlug: plan.slug,
        userId,
        billingCycle: data.billingCycle,
      },
      subscription_data: {
        metadata: {
          planId: plan.id,
          planSlug: plan.slug,
          userId,
        },
      },
    });

    return {
      url: session.url,
      sessionId: session.id,
    };
  }

  /**
   * Create a Stripe Billing Portal session for managing the subscription.
   */
  async createBillingPortalSession(userId: string, returnUrl?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      throw new ApiError(400, "No Stripe customer record found. Subscribe to a plan first.");
    }

    const baseUrl = this.getFrontendUrl();

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl || `${baseUrl}/profile`,
    });

    return { url: session.url };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WEBHOOK HANDLERS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Handle checkout.session.completed — supports donations only.
   * Subscription checkouts are handled by handleSubscriptionCheckoutCompleted.
   */
  async handleCheckoutCompleted(session: Record<string, unknown>) {
    // Skip if this is a subscription checkout
    if (session.mode === "subscription") return { received: true };

    const paymentLinkId = session.payment_link as string | undefined;
    const sessionId = session.id as string;
    const paymentIntentId = session.payment_intent as string | undefined;
    const amountTotal = session.amount_total as number | undefined;
    const currency = session.currency as string | undefined;
    const customerDetails = session.customer_details as Record<string, unknown> | undefined;

    // Find donation by stripePaymentLinkId OR stripeSessionId
    let donation = null;

    if (paymentLinkId) {
      donation = await prisma.donation.findFirst({
        where: { stripePaymentLinkId: paymentLinkId },
      });
    }

    if (!donation && sessionId) {
      donation = await prisma.donation.findFirst({
        where: { stripeSessionId: sessionId },
      });
    }

    // Extract customer info from session
    const customerEmail = (customerDetails?.email as string) || undefined;
    const customerName = (customerDetails?.name as string) || undefined;

    if (donation) {
      // Update existing donation record
      await prisma.donation.update({
        where: { id: donation.id },
        data: {
          stripeSessionId: sessionId,
          stripePaymentId: paymentIntentId,
          amount: amountTotal !== undefined ? amountTotal / 100 : undefined,
          currency: currency || undefined,
          customerEmail: customerEmail ?? undefined,
          customerName: customerName ?? undefined,
          status: "completed" as const,
          metadata: {
            sessionData: session,
            previousMetadata: donation.metadata,
          } as Prisma.InputJsonValue,
        },
      });
    } else {
      // Create a new donation record if we couldn't find one by payment link
      await prisma.donation.create({
        data: {
          amount: amountTotal ? amountTotal / 100 : null,
          currency: currency || "usd",
          stripeSessionId: sessionId,
          stripePaymentId: paymentIntentId,
          stripePaymentLinkId: paymentLinkId,
          customerEmail,
          customerName,
          status: "completed" as const,
          metadata: { sessionData: session } as Prisma.InputJsonValue,
        },
      });
    }

    return { received: true };
  }

  /**
   * Handle checkout.session.completed for subscription mode.
   * Updates the user's subscription plan and Stripe IDs.
   */
  async handleSubscriptionCheckoutCompleted(session: Record<string, unknown>) {
    const clientReferenceId = session.client_reference_id as string | undefined;
    const metadata = session.metadata as Record<string, string> | undefined;
    const subscriptionId = session.subscription as string | undefined;
    const customerId = session.customer as string | undefined;
    const mode = session.mode as string | undefined;

    // Only handle subscription mode
    if (mode !== "subscription") return;

    const userId = metadata?.userId || clientReferenceId;
    const planId = metadata?.planId;

    if (!userId || !planId) {
      console.warn("[StripeService] Missing userId or planId in subscription session metadata");
      return;
    }

    const updateData: Record<string, unknown> = {
      stripeCustomerId: customerId ?? null,
      subscriptionStatus: "active",
    };

    if (subscriptionId) {
      updateData.stripeSubscriptionId = subscriptionId;
    }

    // Set current period end from the session (line items have period info)
    // For simplicity, we set it to 30 days from now; webhook will correct it
    updateData.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Update the user's plan
    if (planId) {
      updateData.subscriptionPlanId = planId;
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    console.log(`[StripeService] Subscription activated for user ${userId} — plan: ${planId}`);
  }

  /**
   * Handle customer.subscription.updated — sync status changes.
   */
  async handleSubscriptionUpdated(subscription: Record<string, unknown>) {
    const metadata = subscription.metadata as Record<string, string> | undefined;
    let userId = metadata?.userId;
    const status = subscription.status as string;
    const currentPeriodEnd = subscription.current_period_end as number | undefined;

    if (!userId) {
      // Fallback: find user by customer ID
      const customerId = subscription.customer as string;
      if (customerId) {
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (user) {
          userId = user.id;
        }
      }

      if (!userId) {
        console.warn("[StripeService] Could not resolve user for subscription update");
        return;
      }
    }

    const updateData: Record<string, unknown> = {
      subscriptionStatus: status,
    };

    if (currentPeriodEnd) {
      updateData.currentPeriodEnd = new Date(currentPeriodEnd * 1000);
    }

    // Handle specific statuses
    if (status === "canceled" || status === "incomplete_expired") {
      updateData.subscriptionPlanId = null;
      updateData.subscriptionStatus = "canceled";
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    console.log(`[StripeService] Subscription updated for user ${userId} — status: ${status}`);
  }

  /**
   * Handle invoice.paid — confirm subscription is active.
   */
  async handleInvoicePaid(invoice: Record<string, unknown>) {
    const subscriptionId = invoice.subscription as string | undefined;
    const customerId = invoice.customer as string | undefined;
    const periodEnd = invoice.period_end as number | undefined;
    const amountPaid = invoice.amount_paid as number | undefined;

    if (!subscriptionId) return;

    // Find user by stripeSubscriptionId
    const user = await prisma.user.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!user) {
      // Try finding by stripeCustomerId
      if (!customerId) return;
      const userByCustomer = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (!userByCustomer) return;

      // Update the subscription ID on the user record
      await prisma.user.update({
        where: { id: userByCustomer.id },
        data: {
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: "active",
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
        },
      });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: "active",
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
      },
    });

    console.log(`[StripeService] Invoice paid for user ${user.id} — amount: ${amountPaid ? amountPaid / 100 : "?"}`);
  }

  /**
   * Handle invoice.payment_failed — mark subscription as past_due.
   */
  async handleInvoicePaymentFailed(invoice: Record<string, unknown>) {
    const subscriptionId = invoice.subscription as string | undefined;
    if (!subscriptionId) return;

    const user = await prisma.user.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!user) {
      // Try finding by customer ID
      const customerId = invoice.customer as string | undefined;
      if (customerId) {
        const userByCustomer = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (userByCustomer) {
          await prisma.user.update({
            where: { id: userByCustomer.id },
            data: { subscriptionStatus: "past_due" },
          });
        }
      }
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionStatus: "past_due" },
    });

    console.log(`[StripeService] Invoice payment failed for user ${user.id} — subscription past_due`);
  }

  /**
   * Handle customer.subscription.deleted — clean up.
   */
  async handleSubscriptionDeleted(subscription: Record<string, unknown>) {
    const metadata = subscription.metadata as Record<string, string> | undefined;
    const userId = metadata?.userId;
    const customerId = subscription.customer as string;

    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionPlanId: null,
          subscriptionStatus: "canceled",
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
        },
      });
      console.log(`[StripeService] Subscription deleted for user ${userId}`);
      return;
    }

    // Fallback: find by customer ID
    if (customerId) {
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionPlanId: null,
            subscriptionStatus: "canceled",
            stripeSubscriptionId: null,
            currentPeriodEnd: null,
          },
        });
        console.log(`[StripeService] Subscription deleted for user ${user.id} (via customer lookup)`);
      }
    }
  }

  /**
   * Get all donations (public - no auth needed).
   * Returns paginated list of completed donations.
   */
  async getDonations(query: DonationQueryInput) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const where = { status: "completed" as const };

    const [donations, total] = await Promise.all([
      prisma.donation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          currency: true,
          customerEmail: true,
          customerName: true,
          message: true,
          createdAt: true,
        },
      }),
      prisma.donation.count({ where }),
    ]);

    return {
      donations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get donation statistics.
   */
  async getDonationStats() {
    const [totalDonations, totalAmount, recentDonations] = await Promise.all([
      prisma.donation.count({ where: { status: "completed" as const } }),
      prisma.donation.aggregate({
        where: { status: "completed" as const },
        _sum: { amount: true },
      }),
      prisma.donation.findMany({
        where: { status: "completed" as const },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          amount: true,
          customerName: true,
          message: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalDonations,
      totalAmount: totalAmount._sum.amount || 0,
      recentDonations,
    };
  }
}
