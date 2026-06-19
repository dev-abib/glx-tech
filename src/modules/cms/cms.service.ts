
import { getPrismaClient } from "../../config/database.js";
import { CloudinaryService } from "../../helpers/cloudinary.service.js";
import { ApiError } from "../../utils/api-error.js";
import { sendEmail } from "../../emails/email.services.js";
import { newInquiryNotificationTemplate } from "../../emails/templates/cms/new-inquiry-notification.template.js";
import { env } from "../../config/env.js";
import type {
  CreateHeroInput,
  UpdateHeroInput,
  CreateServiceInput,
  UpdateServiceInput,
  CreateContactInput,
  ReplyContactInput,
  CreateAboutInput,
  UpdateAboutInput,
} from "./cms.validation.js";

const prisma = getPrismaClient();
const cloudinary = new CloudinaryService();

interface PaginationParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  search?: string;
  status?: "all" | "unread" | "replied";
}

export class CmsService {
  // ── Hero ────────────────────────────────────────────────────────────────

  /**
   * Get the home hero section with its services.
   * Uses the first hero record (there should typically be one).
   */
  async getHero() {
    const hero = await prisma.hero.findFirst({
      include: { services: true },
      orderBy: { id: "asc" },
    });

    if (!hero) {
      return null;
    }

    return hero;
  }

  /**
   * Create the home hero section. Only one hero section should exist,
   * so this fails if one already exists.
   */
  async createHero(data: CreateHeroInput) {
    const existing = await prisma.hero.findFirst();
    if (existing) {
      throw new ApiError(
        409,
        "A home hero section already exists. Use update instead."
      );
    }

    const hero = await prisma.hero.create({
      data: {
        title: data.title ?? null,
        sub_title: data.sub_title ?? null,
        highlighted_txt: data.highlighted_txt ?? null,
      },
      include: { services: true },
    });

    return hero;
  }

  /**
   * Update the home hero section. Uses the first hero record.
   * If no hero exists, creates one with the provided data.
   */
  async updateHero(id: string, data: UpdateHeroInput) {
    const existing = await prisma.hero.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, "Home hero section not found");
    }

    const hero = await prisma.hero.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.sub_title !== undefined && { sub_title: data.sub_title }),
        ...(data.highlighted_txt !== undefined && {
          highlighted_txt: data.highlighted_txt,
        }),
      },
      include: { services: true },
    });

    return hero;
  }

  // ── Services ────────────────────────────────────────────────────────────

  /**
   * Add a service to the hero section.
   * Optionally accepts an icon buffer to upload to Cloudinary.
   */
  async createService(heroId: string, data: CreateServiceInput, iconBuffer?: Buffer) {
    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero) {
      throw new ApiError(404, "Home hero section not found");
    }

    let iconUrl: string | null = null;
    let iconPublicId: string | null = null;

    if (iconBuffer) {
      const result = await cloudinary.uploadFile(iconBuffer, "cms/services");
      iconUrl = result.url;
      iconPublicId = result.publicId;
    }

    const service = await prisma.service.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        icon: iconUrl ?? data.icon ?? null,
        iconPublicId: iconPublicId ?? "",
        heroId,
      },
    });

    return service;
  }

  /**
   * Update a service within the hero section.
   */
  async updateService(
    serviceId: string,
    data: UpdateServiceInput,
    iconBuffer?: Buffer
  ) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) {
      throw new ApiError(404, "Service not found");
    }

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;

    // Handle icon upload
    if (iconBuffer) {
      // Delete old icon if it exists
      if (service.iconPublicId) {
        await cloudinary.deleteFile(service.iconPublicId).catch(() => {});
      }

      const result = await cloudinary.uploadFile(iconBuffer, "cms/services");
      updateData.icon = result.url;
      updateData.iconPublicId = result.publicId;
    } else if (data.icon !== undefined) {
      updateData.icon = data.icon;
    }

    const updated = await prisma.service.update({
      where: { id: serviceId },
      data: updateData,
    });

    return updated;
  }

  /**
   * Delete a service from the hero section.
   */
  async deleteService(serviceId: string) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) {
      throw new ApiError(404, "Service not found");
    }

    // Clean up Cloudinary icon if it exists
    if (service.iconPublicId) {
      await cloudinary.deleteFile(service.iconPublicId).catch(() => {});
    }

    await prisma.service.delete({ where: { id: serviceId } });

    return { message: "Service deleted successfully" };
  }

  /**
   * Get all services for a hero section.
   */
  async getServices(heroId: string) {
    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero) {
      throw new ApiError(404, "Home hero section not found");
    }

    const services = await prisma.service.findMany({
      where: { heroId },
      orderBy: { id: "asc" },
    });

    return services;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CONTACT INQUIRIES
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Submit a contact inquiry (public) and notify the site owner.
   */
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

  /**
   * Get all inquiries with pagination, sorting, search, and status filter (admin).
   */
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

  /**
   * Get a single inquiry by ID (admin).
   */
  async getInquiryById(id: string) {
    const inquiry = await prisma.contactInquiry.findUnique({ where: { id } });
    if (!inquiry) throw new ApiError(404, "Inquiry not found");
    return inquiry;
  }

  /**
   * Mark an inquiry as read (admin).
   */
  async markInquiryAsRead(id: string) {
    const inquiry = await prisma.contactInquiry.findUnique({ where: { id } });
    if (!inquiry) throw new ApiError(404, "Inquiry not found");

    return prisma.contactInquiry.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Reply to an inquiry and send email to the inquirer (admin).
   */
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

  /**
   * Delete an inquiry (admin).
   */
  async deleteInquiry(id: string) {
    const inquiry = await prisma.contactInquiry.findUnique({ where: { id } });
    if (!inquiry) throw new ApiError(404, "Inquiry not found");

    await prisma.contactInquiry.delete({ where: { id } });
    return { message: "Inquiry deleted successfully" };
  }

  /**
   * Get inquiry stats (admin).
   */
  async getInquiryStats() {
    const [total, unread, replied] = await Promise.all([
      prisma.contactInquiry.count(),
      prisma.contactInquiry.count({ where: { isRead: false } }),
      prisma.contactInquiry.count({ where: { isReplied: true } }),
    ]);
    return { total, unread, replied };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ABOUT US
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get the About Us section (there should only be one).
   */
  async getAbout() {
    const about = await prisma.aboutUs.findFirst({ orderBy: { id: "asc" } });
    return about;
  }

  /**
   * Create the About Us section. Only one should exist.
   */
  async createAbout(data: CreateAboutInput, image1Buffer?: Buffer, image2Buffer?: Buffer) {
    const existing = await prisma.aboutUs.findFirst();
    if (existing) {
      throw new ApiError(409, "An About Us section already exists. Use update instead.");
    }

    let image1Url: string | null = null;
    let image1PublicId: string | null = null;
    let image2Url: string | null = null;
    let image2PublicId: string | null = null;

    if (image1Buffer) {
      const result = await cloudinary.uploadFile(image1Buffer, "cms/about");
      image1Url = result.url;
      image1PublicId = result.publicId;
    }
    if (image2Buffer) {
      const result = await cloudinary.uploadFile(image2Buffer, "cms/about");
      image2Url = result.url;
      image2PublicId = result.publicId;
    }

    const about = await prisma.aboutUs.create({
      data: {
        title: data.title,
        description: data.description,
        image1: image1Url,
        image1PublicId,
        image2: image2Url,
        image2PublicId,
      },
    });

    return about;
  }

  /**
   * Update the About Us section.
   */
  async updateAbout(id: string, data: UpdateAboutInput, image1Buffer?: Buffer, image2Buffer?: Buffer) {
    const about = await prisma.aboutUs.findUnique({ where: { id } });
    if (!about) {
      throw new ApiError(404, "About Us section not found");
    }

    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;

    // Handle image1 upload
    if (image1Buffer) {
      if (about.image1PublicId) {
        await cloudinary.deleteFile(about.image1PublicId).catch(() => {});
      }
      const result = await cloudinary.uploadFile(image1Buffer, "cms/about");
      updateData.image1 = result.url;
      updateData.image1PublicId = result.publicId;
    }

    // Handle image2 upload
    if (image2Buffer) {
      if (about.image2PublicId) {
        await cloudinary.deleteFile(about.image2PublicId).catch(() => {});
      }
      const result = await cloudinary.uploadFile(image2Buffer, "cms/about");
      updateData.image2 = result.url;
      updateData.image2PublicId = result.publicId;
    }

    const updated = await prisma.aboutUs.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  /**
   * Delete an image from the About Us section.
   */
  async deleteAboutImage(id: string, imageField: "image1" | "image2") {
    const about = await prisma.aboutUs.findUnique({ where: { id } });
    if (!about) {
      throw new ApiError(404, "About Us section not found");
    }

    const publicId = imageField === "image1" ? about.image1PublicId : about.image2PublicId;
    if (publicId) {
      await cloudinary.deleteFile(publicId).catch(() => {});
    }

    const updateData: Record<string, unknown> = {};
    if (imageField === "image1") {
      updateData.image1 = null;
      updateData.image1PublicId = null;
    } else {
      updateData.image2 = null;
      updateData.image2PublicId = null;
    }

    return prisma.aboutUs.update({ where: { id }, data: updateData });
  }
}

// ── Inline reply email template ───────────────────────────────────────────

function replyToInquiryTemplate({
  name,
  originalMessage,
  replyMessage,
}: {
  name: string;
  originalMessage: string;
  replyMessage: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e5ea;">
        <tr><td style="background:#0a0a0a;padding:28px 32px 26px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Reply to Your Inquiry</h1>
        </td></tr>
        <tr><td style="padding:32px 32px 28px;font-size:14px;color:#374151;line-height:1.75;">
          <p>Dear ${name},</p>
          <p>Thank you for reaching out to us. Here is our response to your inquiry:</p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;font-size:14px;color:#111827;white-space:pre-wrap;">${replyMessage}</div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
          <p style="font-size:12px;color:#6b7280;">Your original message:</p>
          <div style="background:#f3f4f6;border-radius:8px;padding:12px;font-size:13px;color:#6b7280;font-style:italic;white-space:pre-wrap;">${originalMessage}</div>
        </td></tr>
        <tr><td style="border-top:1px solid #e5e7eb;padding:16px 32px;font-size:11px;color:#9ca3af;">
          &copy; ${new Date().getFullYear()} ${env.SITE_NAME}. All rights reserved.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

