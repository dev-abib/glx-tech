import { getPrismaClient } from "../../../config/database.js";
import { ApiError } from "../../../utils/api-error.js";
import { sendEmail } from "../../../emails/email.services.js";
import { newInquiryNotificationTemplate } from "../../../emails/templates/cms/new-inquiry-notification.template.js";
import { replyToInquiryTemplate } from "../../../emails/templates/cms/reply-inquiry.template.js";
import { env } from "../../../config/env.js";
import type {
  CreateContactInput,
  ReplyContactInput,
} from "./contact.validation.js";

const prisma = getPrismaClient();

interface PaginationParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  search?: string;
  status?: "all" | "unread" | "replied";
}

export class ContactService {
  async createInquiry(data: CreateContactInput) {
    const inquiry = await prisma.contactInquiry.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        subject: data.subject ?? null,
        message: data.message,
      },
    });

    // Send email notification to site owner (fire-and-forget)
    try {
      await sendEmail({
        to: env.MAIL_FROM_ADDRESS,
        subject: `New Contact Inquiry — ${data.name}`,
        html: newInquiryNotificationTemplate({
          fullName: data.name,
          email: data.email,
          phoneNumber: data.phone,
          subject: data.subject,
          message: data.message,
          submittedAt: inquiry.createdAt,
        }),
      });
    } catch {
      console.error("Failed to send contact notification email");
    }

    return { id: inquiry.id, message: "Your inquiry has been submitted successfully. We will get back to you soon." };
  }

  async getInquiries(params: PaginationParams) {
    const { page, limit, sortBy, sortOrder, search, status } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status && status !== "all") {
      if (status === "unread") {
        where.isRead = false;
      } else if (status === "replied") {
        where.isReplied = true;
        where.isRead = true;
      }
    }

    const allowedSortFields = ["createdAt", "name", "email", "isRead", "isReplied", "subject"];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const [inquiries, total] = await Promise.all([
      prisma.contactInquiry.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [safeSortBy]: sortOrder },
      }),
      prisma.contactInquiry.count({ where: where as any }),
    ]);

    return {
      inquiries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getInquiryById(id: string) {
    const inquiry = await prisma.contactInquiry.findUnique({ where: { id } });
    if (!inquiry) throw new ApiError(404, "Inquiry not found");
    return inquiry;
  }

  async markInquiryAsRead(id: string) {
    const inquiry = await prisma.contactInquiry.findUnique({ where: { id } });
    if (!inquiry) throw new ApiError(404, "Inquiry not found");

    return prisma.contactInquiry.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async replyToInquiry(id: string, data: ReplyContactInput) {
    const inquiry = await prisma.contactInquiry.findUnique({ where: { id } });
    if (!inquiry) throw new ApiError(404, "Inquiry not found");

    const updated = await prisma.contactInquiry.update({
      where: { id },
      data: {
        replyMessage: data.replyMessage,
        isReplied: true,
        isRead: true,
        repliedAt: new Date(),
      },
    });

    // Send reply email (fire-and-forget)
    try {
      await sendEmail({
        to: inquiry.email,
        subject: `Re: ${inquiry.subject ?? "Your Inquiry"} — ${env.SITE_NAME}`,
        html: replyToInquiryTemplate({
          name: inquiry.name,
          originalMessage: inquiry.message,
          replyMessage: data.replyMessage,
        }),
      });
    } catch {
      console.error("Failed to send reply email");
    }

    return updated;
  }

  async deleteInquiry(id: string) {
    const inquiry = await prisma.contactInquiry.findUnique({ where: { id } });
    if (!inquiry) throw new ApiError(404, "Inquiry not found");

    await prisma.contactInquiry.delete({ where: { id } });
    return { message: "Inquiry deleted successfully" };
  }

  async getInquiryStats() {
    const [total, unread, replied] = await Promise.all([
      prisma.contactInquiry.count(),
      prisma.contactInquiry.count({ where: { isRead: false } }),
      prisma.contactInquiry.count({ where: { isReplied: true } }),
    ]);
    return { total, unread, replied };
  }
}
