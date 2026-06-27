import { getPrismaClient } from "../../config/database.js";
import { CloudinaryService } from "../../helpers/cloudinary.service.js";
import { UserRepository } from "../user/user.repository.js";
import { ApiError } from "../../utils/api-error.js";
import type {
  CreateListingInput,
  UpdateListingInput,
  GetListingsQueryInput,
  CreateUserReviewInput,
  UpdateUserReviewInput,
} from "./listing.validation.js";
import { env } from "../../config/env.js";
import axios from "axios";

const cloudinary = new CloudinaryService();
const prisma = getPrismaClient();
const userRepo = new UserRepository();

export class ListingService {
  // create listing service
  async createListing(
    data: CreateListingInput,
    userId: string,
    imageBuffers: Buffer[] = []
  ) {
    // checking if user exists
    await userRepo.findUser("id", userId, true);

    const key = env.LOCATIONIQ_KEY;

    const url = "https://us1.locationiq.com/v1/search";

    const response = await axios
      .get(url, {
        params: {
          key,
          q: data.address,
          format: "json",
          limit: 1,
          addressdetails: 1,
          normalizecity: 1,
        },
        timeout: 10000,
      })
      .catch((error) => {
        if (error.response) {
          throw new ApiError(
            error.response.status,
            `${error.response.data.error} address`
          );
        } else if (error.request) {
          throw new ApiError(
            500,
            "Network error or no response from the geocoding service."
          );
        } else {
          throw new ApiError(
            500,
            error.message || "An unknown error occurred during geocoding."
          );
        }
      });

    if (!response?.data || response.data.length === 0) {
      throw new ApiError(400, "Unable to geocode the provided address");
    }

    const lat = Number(response.data[0].lat);
    const lng = Number(response.data[0].lon);

    if (!lat || !lng) {
      throw new ApiError(400, "Unable to geocode the provided address");
    }

    const uploadedImages = [] as Array<{ url: string; publicId: string }>;

    for (const imageBuffer of imageBuffers) {
      const uploadedImage = await cloudinary.uploadFile(
        imageBuffer,
        "listings"
      );
      uploadedImages.push(uploadedImage);
    }

    const listing = await prisma.listing.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        slug: data.slug,
        serviceId: data.serviceId,
        address: data.address,
        days: data.days,
        weekend: data.weekend,
        timeSlot: data.timeSlot,
        basePrice: data.basePrice,
        hourlyPrice: data.hourlyPrice,
        dailyPrice: data.dailyPrice,
        estimatedDuration: data.estimatedDuration,
        isAvailable: data.isAvailable,
        latitude: lat,
        longitude: lng,
        media: uploadedImages.map((image) => ({
          url: image.url,
          publicId: image.publicId,
        })),
      },
    });

    return {
      message: "Listing created successfully",
      data: {
        ...data,
        listingId: listing.id,
      },
      userId,
      images: uploadedImages,
    };
  }

  // get all listings (public)
  async getAllListings(query: GetListingsQueryInput) {
    const { page, limit, search, serviceId, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { slug: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }

    if (serviceId) {
      where.serviceId = serviceId;
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: { userReview: true },
          },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    return {
      listings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // get listing by slug (public)
  async getListingBySlug(slug: string) {
    const listing = await prisma.listing.findUnique({
      where: { slug },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            phone: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
          },
        },
        userReview: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: { id: "desc" },
        },
      },
    });

    if (!listing) {
      throw new ApiError(404, "Listing not found");
    }

    return listing;
  }

  // get my listings (authenticated seller)
  async getMyListings(userId: string, query: GetListingsQueryInput) {
    const { page, limit, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where = { userId };

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          service: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: { userReview: true },
          },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    return {
      listings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // update listing (seller - owner only)
  async updateListing(
    id: string,
    userId: string,
    data: UpdateListingInput,
    imageBuffers: Buffer[] = []
  ) {
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      throw new ApiError(404, "Listing not found");
    }

    if (listing.userId !== userId) {
      throw new ApiError(403, "You can only update your own listings");
    }

    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.serviceId !== undefined) updateData.serviceId = data.serviceId;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.days !== undefined) updateData.days = data.days;
    if (data.weekend !== undefined) updateData.weekend = data.weekend;
    if (data.timeSlot !== undefined) updateData.timeSlot = data.timeSlot;
    if (data.basePrice !== undefined) updateData.basePrice = data.basePrice;
    if (data.hourlyPrice !== undefined)
      updateData.hourlyPrice = data.hourlyPrice;
    if (data.dailyPrice !== undefined) updateData.dailyPrice = data.dailyPrice;
    if (data.estimatedDuration !== undefined)
      updateData.estimatedDuration = data.estimatedDuration;

    // Handle new image uploads
    if (imageBuffers.length > 0) {
      // Delete old images from cloudinary
      const existingMedia = listing.media as Array<{
        url: string;
        publicId: string;
      }> | null;
      if (existingMedia && Array.isArray(existingMedia)) {
        for (const img of existingMedia) {
          if (img.publicId) {
            await cloudinary.deleteFile(img.publicId).catch(() => {});
          }
        }
      }

      const uploadedImages = [] as Array<{ url: string; publicId: string }>;
      for (const imageBuffer of imageBuffers) {
        const uploadedImage = await cloudinary.uploadFile(
          imageBuffer,
          "listings"
        );
        uploadedImages.push(uploadedImage);
      }
      updateData.media = uploadedImages.map((image) => ({
        url: image.url,
        publicId: image.publicId,
      }));
    }

    const updated = await prisma.listing.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  // delete listing (seller - owner only)
  async deleteListing(id: string, userId: string) {
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      throw new ApiError(404, "Listing not found");
    }

    if (listing.userId !== userId) {
      throw new ApiError(403, "You can only delete your own listings");
    }

    // Delete listing images from cloudinary
    const existingMedia = listing.media as Array<{
      url: string;
      publicId: string;
    }> | null;
    if (existingMedia && Array.isArray(existingMedia)) {
      for (const img of existingMedia) {
        if (img.publicId) {
          await cloudinary.deleteFile(img.publicId).catch(() => {});
        }
      }
    }

    // Delete associated user reviews
    await prisma.userReview.deleteMany({ where: { listingId: id } });

    await prisma.listing.delete({ where: { id } });

    return { message: "Listing deleted successfully" };
  }

  // ════════════════════════════════════════════════════════════════════════
  // USER REVIEWS (listing reviews)
  // ════════════════════════════════════════════════════════════════════════

  // create user review for a listing
  async createUserReview(
    data: CreateUserReviewInput,
    userId: string,
    listingId: string
  ) {
    // Check if listing exists
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing) {
      throw new ApiError(404, "Listing not found");
    }

    // Check if user already reviewed this listing
    const existingReview = await prisma.userReview.findFirst({
      where: { userId, listingId },
    });
    if (existingReview) {
      throw new ApiError(409, "You have already reviewed this listing");
    }

    const review = await prisma.userReview.create({
      data: {
        userId,
        listingId,
        rating: data.rating,
        review: data.review,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return review;
  }

  // get reviews by listing
  async getListingReviews(
    listingId: string,
    page: number = 1,
    limit: number = 10
  ) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing) {
      throw new ApiError(404, "Listing not found");
    }

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.userReview.findMany({
        where: { listingId },
        skip,
        take: limit,
        orderBy: { id: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.userReview.count({ where: { listingId } }),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // get single user review
  async getUserReviewById(reviewId: string) {
    const review = await prisma.userReview.findUnique({
      where: { id: reviewId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        listing: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!review) {
      throw new ApiError(404, "Review not found");
    }

    return review;
  }

  // update user review
  async updateUserReview(
    reviewId: string,
    userId: string,
    data: UpdateUserReviewInput
  ) {
    const review = await prisma.userReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) {
      throw new ApiError(404, "Review not found");
    }

    if (review.userId !== userId) {
      throw new ApiError(403, "You can only update your own reviews");
    }

    const updateData: Record<string, unknown> = {};
    if (data.rating !== undefined) updateData.rating = data.rating;
    if (data.review !== undefined) updateData.review = data.review;

    const updated = await prisma.userReview.update({
      where: { id: reviewId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return updated;
  }

  // get all user reviews across all listings (admin only)
  async getAllUserReviews(
    page: number = 1,
    limit: number = 10,
    search?: string
  ) {
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { review: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [reviews, total] = await Promise.all([
      prisma.userReview.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          listing: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      }),
      prisma.userReview.count({ where }),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // delete user review
  async deleteUserReview(reviewId: string, userId: string) {
    const review = await prisma.userReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) {
      throw new ApiError(404, "Review not found");
    }

    if (review.userId !== userId) {
      throw new ApiError(403, "You can only delete your own reviews");
    }

    await prisma.userReview.delete({ where: { id: reviewId } });

    return { message: "Review deleted successfully" };
  }
}
