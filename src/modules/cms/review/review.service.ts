import { getPrismaClient } from "../../../config/database.js";
import { CloudinaryService } from "../../../helpers/cloudinary.service.js";
import { ApiError } from "../../../utils/api-error.js";
import type {
  CreateReviewSectionInput,
  UpdateReviewSectionInput,
  CreateReviewInput,
  UpdateReviewInput,
} from "./review.validation.js";

const prisma = getPrismaClient();
const cloudinary = new CloudinaryService();

export class ReviewService {
  // ════════════════════════════════════════════════════════════════════════
  // REVIEW SECTION
  // ════════════════════════════════════════════════════════════════════════

  async getReviewSection() {
    const section = await prisma.reviewSection.findFirst({
      include: { reviews: true },
      orderBy: { id: "asc" },
    });
    return section;
  }

  async createReviewSection(data: CreateReviewSectionInput) {
    const existing = await prisma.reviewSection.findFirst();
    if (existing) {
      throw new ApiError(
        409,
        "A review section already exists. Use update instead."
      );
    }

    const section = await prisma.reviewSection.create({
      data: {
        title: data.title,
        subTitle: data.subTitle,
      },
      include: { reviews: true },
    });

    return section;
  }

  async updateReviewSection(id: string, data: UpdateReviewSectionInput) {
    const existing = await prisma.reviewSection.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, "Review section not found");
    }

    const section = await prisma.reviewSection.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.subTitle !== undefined && { subTitle: data.subTitle }),
      },
      include: { reviews: true },
    });

    return section;
  }

  async deleteReviewSection(id: string) {
    const existing = await prisma.reviewSection.findUnique({
      where: { id },
      include: { reviews: true },
    });
    if (!existing) {
      throw new ApiError(404, "Review section not found");
    }

    // Clean up all review images from Cloudinary
    for (const review of existing.reviews) {
      if (review.picturePublicId) {
        await cloudinary.deleteFile(review.picturePublicId).catch(() => {});
      }
    }

    // Delete all reviews in the section first, then the section
    await prisma.review.deleteMany({ where: { sectionId: id } });
    await prisma.reviewSection.delete({ where: { id } });

    return { message: "Review section deleted successfully" };
  }

  // ════════════════════════════════════════════════════════════════════════
  // REVIEWS
  // ════════════════════════════════════════════════════════════════════════

  async getReviews(sectionId: string) {
    const section = await prisma.reviewSection.findUnique({ where: { id: sectionId } });
    if (!section) {
      throw new ApiError(404, "Review section not found");
    }

    const reviews = await prisma.review.findMany({
      where: { sectionId },
      orderBy: { id: "asc" },
    });

    return reviews;
  }

  async getReviewById(reviewId: string) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new ApiError(404, "Review not found");
    }
    return review;
  }

  async createReview(
    sectionId: string,
    data: CreateReviewInput,
    pictureBuffer?: Buffer
  ) {
    const section = await prisma.reviewSection.findUnique({ where: { id: sectionId } });
    if (!section) {
      throw new ApiError(404, "Review section not found");
    }

    let pictureUrl: string | null = null;
    let picturePublicId: string | null = null;

    if (pictureBuffer) {
      const result = await cloudinary.uploadFile(pictureBuffer, "cms/reviews");
      pictureUrl = result.url;
      picturePublicId = result.publicId;
    }

    const review = await prisma.review.create({
      data: {
        name: data.name,
        position: data.position,
        reviewDate: data.reviewDate,
        review: data.review,
        ratingCount: data.ratingCount,
        picture: pictureUrl ?? "",
        picturePublicId: picturePublicId ?? "",
        sectionId,
      },
    });

    return review;
  }

  async updateReview(
    reviewId: string,
    data: UpdateReviewInput,
    pictureBuffer?: Buffer
  ) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new ApiError(404, "Review not found");
    }

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.reviewDate !== undefined) updateData.reviewDate = data.reviewDate;
    if (data.review !== undefined) updateData.review = data.review;
    if (data.ratingCount !== undefined) updateData.ratingCount = data.ratingCount;

    if (pictureBuffer) {
      if (review.picturePublicId) {
        await cloudinary.deleteFile(review.picturePublicId).catch(() => {});
      }

      const result = await cloudinary.uploadFile(pictureBuffer, "cms/reviews");
      updateData.picture = result.url;
      updateData.picturePublicId = result.publicId;
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: updateData,
    });

    return updated;
  }

  async deleteReview(reviewId: string) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new ApiError(404, "Review not found");
    }

    if (review.picturePublicId) {
      await cloudinary.deleteFile(review.picturePublicId).catch(() => {});
    }

    await prisma.review.delete({ where: { id: reviewId } });

    return { message: "Review deleted successfully" };
  }
}
