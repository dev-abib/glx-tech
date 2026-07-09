import { stripe } from "../../config/stripe.config.js";
import { getPrismaClient } from "../../config/database.js";
import { env } from "../../config/env.js";
import type { CreateDonationInput, DonationQueryInput } from "./stripe.validation.js";
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
   * Create a Stripe Checkout Session for a quick donation.
   * No payload needed — donors enter amount/name/email on Stripe's hosted page.
   */
  async createDonationCheckoutSession() {
    // Reuse the same price — the config (custom_unit_amount) never changes
    const priceId = await getOrCreateDonationPrice();

    const successUrl = `${
      env.FRONTEND_URL || env.APP_URL
    }/donate/success?session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl = `${env.FRONTEND_URL || env.APP_URL}/donate`;

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

    const successUrl = data.successUrl || `${env.FRONTEND_URL || env.APP_URL}/donate/success`;

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

  /**
   * Handle Stripe checkout.session.completed webhook event.
   * Updates the donation record with payment details.
   */
  async handleCheckoutCompleted(session: Record<string, unknown>) {
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
