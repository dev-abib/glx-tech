import { getPrismaClient } from "../../../config/database.js";
import { CloudinaryService } from "../../../helpers/cloudinary.service.js";
import { ApiError } from "../../../utils/api-error.js";
import type {
  CreateAboutInput,
  UpdateAboutInput,
} from "./about.validation.js";

const prisma = getPrismaClient();
const cloudinary = new CloudinaryService();

export class AboutService {
  async getAbout() {
    const about = await prisma.aboutUs.findFirst({ orderBy: { id: "asc" } });
    return about;
  }

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

  async updateAbout(id: string, data: UpdateAboutInput, image1Buffer?: Buffer, image2Buffer?: Buffer) {
    const about = await prisma.aboutUs.findUnique({ where: { id } });
    if (!about) {
      throw new ApiError(404, "About Us section not found");
    }

    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;

    if (image1Buffer) {
      if (about.image1PublicId) {
        await cloudinary.deleteFile(about.image1PublicId).catch(() => {});
      }
      const result = await cloudinary.uploadFile(image1Buffer, "cms/about");
      updateData.image1 = result.url;
      updateData.image1PublicId = result.publicId;
    }

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
