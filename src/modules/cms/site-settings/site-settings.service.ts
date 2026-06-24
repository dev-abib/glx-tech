import { getPrismaClient } from "../../../config/database.js";
import { CloudinaryService } from "../../../helpers/cloudinary.service.js";
import { ApiError } from "../../../utils/api-error.js";
import type {
  CreateSiteSettingsInput,
  UpdateSiteSettingsInput,
  CreateSocialInput,
  UpdateSocialInput,
} from "./site-settings.validation.js";

const prisma = getPrismaClient();
const cloudinary = new CloudinaryService();

export class SiteSettingsService {
  // ════════════════════════════════════════════════════════════════════════
  // SITE SETTINGS (Singleton)
  // ════════════════════════════════════════════════════════════════════════

  async getSiteSettings() {
    const settings = await prisma.siteSettings.findFirst({
      orderBy: { id: "asc" },
    });
    return settings;
  }

  async createSiteSettings(data: CreateSiteSettingsInput) {
    const existing = await prisma.siteSettings.findFirst();
    if (existing) {
      throw new ApiError(
        409,
        "Site settings already exist. Use update instead."
      );
    }

    const settings = await prisma.siteSettings.create({
      data: {
        title: data.title ?? null,
        subTitle: data.subTitle ?? null,
        footerTxt: data.footerTxt ?? null,
        siteLink: data.siteLink ?? null,
        location: data.location ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
      },
    });

    return settings;
  }

  async updateSiteSettings(id: string, data: UpdateSiteSettingsInput) {
    const existing = await prisma.siteSettings.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, "Site settings not found");
    }

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.subTitle !== undefined) updateData.subTitle = data.subTitle;
    if (data.footerTxt !== undefined) updateData.footerTxt = data.footerTxt;
    if (data.siteLink !== undefined) updateData.siteLink = data.siteLink;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;

    const updated = await prisma.siteSettings.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  // ════════════════════════════════════════════════════════════════════════
  // SOCIAL LINKS
  // ════════════════════════════════════════════════════════════════════════

  async getSocials() {
    const socials = await prisma.social.findMany({
      orderBy: { id: "asc" },
    });
    return socials;
  }

  async createSocial(data: CreateSocialInput, iconBuffer?: Buffer) {
    let iconUrl: string | null = null;
    let iconPublicId: string | null = null;

    if (iconBuffer) {
      const result = await cloudinary.uploadFile(iconBuffer, "cms/socials");
      iconUrl = result.url;
      iconPublicId = result.publicId;
    }

    const social = await prisma.social.create({
      data: {
        icon: iconUrl ?? data.icon ?? "",
        iconPublicId: iconPublicId ?? "",
        socialLink: data.socialLink,
      },
    });

    return social;
  }

  async updateSocial(
    socialId: string,
    data: UpdateSocialInput,
    iconBuffer?: Buffer
  ) {
    const social = await prisma.social.findUnique({
      where: { id: socialId },
    });
    if (!social) {
      throw new ApiError(404, "Social link not found");
    }

    const updateData: Record<string, unknown> = {};

    if (data.socialLink !== undefined) updateData.socialLink = data.socialLink;

    if (iconBuffer) {
      if (social.iconPublicId) {
        await cloudinary.deleteFile(social.iconPublicId).catch(() => {});
      }
      const result = await cloudinary.uploadFile(iconBuffer, "cms/socials");
      updateData.icon = result.url;
      updateData.iconPublicId = result.publicId;
    } else if (data.icon !== undefined) {
      updateData.icon = data.icon;
    }

    const updated = await prisma.social.update({
      where: { id: socialId },
      data: updateData,
    });

    return updated;
  }

  async deleteSocial(socialId: string) {
    const social = await prisma.social.findUnique({
      where: { id: socialId },
    });
    if (!social) {
      throw new ApiError(404, "Social link not found");
    }

    if (social.iconPublicId) {
      await cloudinary.deleteFile(social.iconPublicId).catch(() => {});
    }

    await prisma.social.delete({ where: { id: socialId } });

    return { message: "Social link deleted successfully" };
  }
}
