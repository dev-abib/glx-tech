import { getPrismaClient } from "../../../config/database.js";
import { CloudinaryService } from "../../../helpers/cloudinary.service.js";
import { ApiError } from "../../../utils/api-error.js";
import type {
  CreateHeroInput,
  UpdateHeroInput,
  CreateServiceInput,
  UpdateServiceInput,
} from "./hero.validation.js";

const prisma = getPrismaClient();
const cloudinary = new CloudinaryService();

export class HeroService {
  // ── Hero ──────────────────────────────────────────────────────────────

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

  // ── Services ──────────────────────────────────────────────────────────

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

  async updateService(serviceId: string, data: UpdateServiceInput, iconBuffer?: Buffer) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) {
      throw new ApiError(404, "Service not found");
    }

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;

    if (iconBuffer) {
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

  async deleteService(serviceId: string) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) {
      throw new ApiError(404, "Service not found");
    }

    if (service.iconPublicId) {
      await cloudinary.deleteFile(service.iconPublicId).catch(() => {});
    }

    await prisma.service.delete({ where: { id: serviceId } });

    return { message: "Service deleted successfully" };
  }

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
}
