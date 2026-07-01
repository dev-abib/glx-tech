import { getPrismaClient } from "../../../config/database.js";
import { sendEmail } from "../../../emails/email.services.js";
import { wrapInCampaignEmailShell } from "../../../emails/templates/campaign/campaign-email.template.js";
import { ApiError } from "../../../utils/api-error.js";
import type { SubscribeInput, CreateCampaignInput } from "./campaign.validation.js";

const prisma = getPrismaClient();
const BATCH_SIZE = 50;

export class NewsLetterService {
  // ── Public: Subscribe ───────────────────────────────────────────────────
  //
  async subscribe(data: SubscribeInput): Promise<{ message: string }> {
    const existing = await prisma.emailSubscribe.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return { message: "You are already subscribed to our newsletter." };
    }

    await prisma.emailSubscribe.create({
      data: { email: data.email },
    });

    return { message: "Successfully subscribed to the newsletter!" };
  }

  // ── Public: Unsubscribe ─────────────────────────────────────────────────
  //
  async unsubscribe(token: string): Promise<{ message: string }> {
    const subscriber = await prisma.emailSubscribe.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!subscriber) {
      throw new ApiError(404, "Invalid or expired unsubscribe link.");
    }

    await prisma.emailSubscribe.delete({
      where: { id: subscriber.id },
    });

    return { message: "You have been unsubscribed successfully." };
  }

  // ── Get subscriber count ────────────────────────────────────────────────
  //
  async getSubscriberCount(): Promise<number> {
    return prisma.emailSubscribe.count();
  }

  // ── Admin: Create Campaign (draft) ──────────────────────────────────────
  //
  async createCampaign(data: CreateCampaignInput) {
    const campaign = await prisma.campaign.create({
      data: {
        subject: data.subject,
        heading: data.heading,
        bodyHtml: data.bodyHtml,
        ctaText: data.ctaText ?? null,
        ctaLink: data.ctaLink ?? null,
        status: "draft",
      },
    });

    return campaign;
  }

  // ── Admin: List Campaigns ───────────────────────────────────────────────
  //
  async listCampaigns(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.campaign.count(),
    ]);

    // Enrich with subscriber count for "sent" campaigns
    const subscriberCount = await prisma.emailSubscribe.count();

    return {
      campaigns: campaigns.map((c) => ({
        ...c,
        recipientCount: c.status === "sent" ? subscriberCount : 0,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Admin: Send Campaign ────────────────────────────────────────────────
  //
  async sendCampaign(campaignId: string): Promise<void> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new ApiError(404, "Campaign not found");
    }

    if (campaign.status !== "draft") {
      throw new ApiError(400, `Campaign is already ${campaign.status}. Cannot send again.`);
    }

    // Fetch all subscribers
    const subscribers = await prisma.emailSubscribe.findMany();
    if (subscribers.length === 0) {
      throw new ApiError(400, "No subscribers to send to.");
    }

    // Mark campaign as "sending"
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "sending" },
    });

    const totalSubscribers = subscribers.length;
    let sentCount = 0;
    let failedCount = 0;

    // Send in batches
    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map((subscriber) =>
          sendEmail({
            to: subscriber.email,
            subject: campaign.subject,
            html: wrapInCampaignEmailShell({
              subject: campaign.subject,
              heading: campaign.heading,
              bodyHtml: campaign.bodyHtml,
              ctaText: campaign.ctaText,
              ctaLink: campaign.ctaLink,
              unsubscribeToken: subscriber.unsubscribeToken,
            }),
          })
        )
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          sentCount++;
        } else {
          failedCount++;
          console.error(
            `[Campaign ${campaignId}] Failed to send to a subscriber:`,
            result.reason
          );
        }
      }
    }

    // Update campaign status to 'sent' with timestamp
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "sent",
        sentAt: new Date(),
      },
    });

    console.info(
      `[Campaign ${campaignId}] Sent to ${sentCount}/${totalSubscribers} subscribers (${failedCount} failed)`
    );
  }
}
