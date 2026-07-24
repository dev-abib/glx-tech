import { getPrismaClient } from "../../config/database.js";
import { CloudinaryService } from "../../helpers/cloudinary.service.js";
import { UserRepository } from "../user/user.repository.js";
import { ApiError } from "../../utils/api-error.js";
import { SubscriptionService } from "../plans/subscription.service.js";
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
const subscriptionService = new SubscriptionService();

export class ListingService {
  // create listing service
  async createListing(
    data: CreateListingInput,
    userId: string,
    imageBuffers: Buffer[] = []
  ) {
    // checking if user exists
    await userRepo.findUser("id", userId, true);

    // Enforce plan limits — check if user can create a new listing
    const planCheck = await subscriptionService.canCreateListing(userId);
    if (!planCheck.allowed) {
      throw new ApiError(
        403,
        `Listing limit reached. Your plan allows a maximum of ${planCheck.maxAllowed} active listing(s). ` +
        `You currently have ${planCheck.currentCount}. Upgrade your plan to create more listings.`
      );
    }

    // Validate that the seller has this serviceId in their servicesId array
    const sellerInfo = await prisma.sellerInfo.findUnique({
      where: { userId },
    });
    if (!sellerInfo) {
      throw new ApiError(400, "Seller profile not found. Please set up your business account first.");
    }
    if (!sellerInfo.servicesId.includes(data.serviceId)) {
      throw new ApiError(
        403,
        `You are not authorized to create listings for this service category. ` +
        `Your account only supports the following service IDs: ${sellerInfo.servicesId.join(", ")}.`
      );
    }

    // Resolve the seller's address record
    const sellerAddress = await prisma.selleraddress.findUnique({
      where: { id: data.addressId },
    });
    if (!sellerAddress) {
      throw new ApiError(404, "Seller address not found");
    }

    // Geocode the full street address from Selleraddress
    const fullAddress = `${sellerAddress.streetAddress}, ${sellerAddress.city}, ${sellerAddress.state} ${sellerAddress.zipCode}`;
    const { lat, lng } = await this.geocodeAddress(fullAddress);

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
        addressId: data.addressId,
        basePrice: data.basePrice,
        hourlyPrice: data.hourlyPrice ?? null,
        dailyPrice: data.dailyPrice ?? null,
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
        address: {
          id: sellerAddress.id,
          streetAddress: sellerAddress.streetAddress,
          city: sellerAddress.city,
          state: sellerAddress.state,
          zipCode: sellerAddress.zipCode,
        },
      },
      userId,
      images: uploadedImages,
    };
  }

  /**
   * Calculate the great-circle distance between two points
   * on the Earth using the Haversine formula.
   * @returns distance in miles
   */
  private calculateDistanceInMiles(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 3959; // Earth's radius in miles
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Geocode an address string to { lat, lng } using LocationIQ.
   */
  private async geocodeAddress(
    address: string
  ): Promise<{ lat: number; lng: number }> {
    const key = env.LOCATIONIQ_KEY;
    const url = "https://us1.locationiq.com/v1/search";

    const response = await axios
      .get(url, {
        params: {
          key,
          q: address,
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

    return { lat, lng };
  }

  // get all listings (public)
  async getAllListings(query: GetListingsQueryInput) {
    const {
      page,
      limit,
      search,
      serviceId,
      serviceName,
      address,
      radius,
      minRating,
      isAvailable,
      isFeatured,
      sortBy,
      sortOrder,
    } = query;
    const skip = (page - 1) * limit;

    // ── Build the Prisma where clause (DB-level filters) ────────────
    const where: Record<string, unknown> = {};

    // Text search
    if (search) {
      where.OR = [
        { slug: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        {
          address: {
            streetAddress: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    // Filter by exact serviceId
    if (serviceId) {
      where.serviceId = serviceId;
    }

    // Filter by service name (case-insensitive lookup on Service model)
    if (serviceName && !serviceId) {
      const services = await prisma.service.findMany({
        where: { name: { contains: serviceName, mode: "insensitive" } },
        select: { id: true },
      });

      if (services.length > 0) {
        where.serviceId = { in: services.map((s) => s.id) };
      } else {
        // No services match the name — return empty result early
        return {
          listings: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        };
      }
    }

    // Filter by availability
    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable;
    }

    // Filter by featured status
    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    // ── Geocode address only when both address AND radius are provided ──
    let originCoords: { lat: number; lng: number } | null = null;
    if (address && radius !== undefined) {
      originCoords = await this.geocodeAddress(address);
    }

    // Determine if we need to do any post-fetch (in-memory) filtering
    const needsInMemoryFiltering =
      originCoords !== null || minRating !== undefined;

    // ── Common Prisma include (always includes ratings for avgRating) ──
    const includeWithRatings = {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      address: {
        select: {
          id: true,
          streetAddress: true,
          city: true,
          state: true,
          zipCode: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
        },
      },
      userReview: {
        select: { rating: true },
      },
      _count: {
        select: { userReview: true },
      },
    } as const;

    // ── Helper to compute avgRating from userReview array ───────────
    const computeAvgRating = (
      reviews: { rating: number }[]
    ): number => {
      if (reviews.length === 0) return 0;
      return parseFloat(
        (
          reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        ).toFixed(1)
      );
    };

    // If we need in-memory filtering (radius or minRating),
    // fetch ALL matching records first, then filter + paginate after.
    if (needsInMemoryFiltering) {
      let allListings = await prisma.listing.findMany({
        where,
        orderBy: [
          { isFeatured: "desc" },
          { [sortBy]: sortOrder },
        ],
        include: includeWithRatings,
      });

      // Filter by radius (Haversine)
      if (originCoords !== null) {
        allListings = allListings.filter((listing) => {
          const distance = this.calculateDistanceInMiles(
            originCoords!.lat,
            originCoords!.lng,
            listing.latitude,
            listing.longitude
          );
          return distance <= radius!;
        });
      }

      // Filter by minimum average rating
      if (minRating) {
        allListings = allListings.filter((listing) => {
          const reviews = listing.userReview;
          if (!reviews || reviews.length === 0) return false;
          const avg =
            reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
          return avg >= minRating!;
        });
      }

      const total = allListings.length;
      const paginatedListings = allListings.slice(skip, skip + limit);

      const listings = paginatedListings.map(
        ({ userReview, ...rest }) => ({
          ...rest,
          avgRating: computeAvgRating(userReview),
        })
      );

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

    // ── Standard DB-paginated path (no in-memory filters) ───────────
    // Always include avgRating for consistent response structure
    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isFeatured: "desc" },
          { [sortBy]: sortOrder },
        ],
        include: includeWithRatings,
      }),
      prisma.listing.count({ where }),
    ]);

    const enrichedListings = listings.map(
      ({ userReview, ...rest }) => ({
        ...rest,
        avgRating: computeAvgRating(userReview),
      })
    );

    return {
      listings: enrichedListings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // get related listings by service type (public)
  async getRelatedListings(
    slug: string,
    page: number = 1,
    limit: number = 6
  ) {
    const skip = (page - 1) * limit;

    // Find the source listing to get its serviceId
    const sourceListing = await prisma.listing.findUnique({
      where: { slug },
      select: {
        id: true,
        serviceId: true,
        service: {
          select: { name: true },
        },
      },
    });

    if (!sourceListing) {
      throw new ApiError(404, "Listing not found");
    }

    const where = {
      serviceId: sourceListing.serviceId,
      id: { not: sourceListing.id },
    };

    // Fetch other listings with the same serviceId, excluding the current one
    const [relatedListings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          address: {
            select: {
              id: true,
              streetAddress: true,
              city: true,
              state: true,
              zipCode: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
            },
          },
          userReview: {
            select: { rating: true },
          },
          _count: {
            select: { userReview: true },
          },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    // Compute avgRating for each related listing
    const enrichedListings = relatedListings.map(
      ({ userReview, ...rest }) => ({
        ...rest,
        avgRating:
          userReview.length > 0
            ? parseFloat(
                (
                  userReview.reduce((sum, r) => sum + r.rating, 0) /
                  userReview.length
                ).toFixed(1)
              )
            : 0,
      })
    );

    return {
      service: {
        id: sourceListing.serviceId,
        name: sourceListing.service?.name ?? null,
      },
      listings: enrichedListings,
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
            email: true,
            avatar: true,
            phone: true,
          },
        },
        address: {
          select: {
            id: true,
            streetAddress: true,
            city: true,
            state: true,
            zipCode: true,
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
    const { page, limit, sortBy, sortOrder, isAvailable, isFeatured } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };

    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable;
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          address: {
            select: {
              id: true,
              streetAddress: true,
              city: true,
              state: true,
              zipCode: true,
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

    // If serviceId is being changed, validate it against the seller's servicesId
    if (data.serviceId !== undefined) {
      const sellerInfo = await prisma.sellerInfo.findUnique({
        where: { userId },
      });
      if (!sellerInfo) {
        throw new ApiError(400, "Seller profile not found. Please set up your business account first.");
      }
      if (!sellerInfo.servicesId.includes(data.serviceId)) {
        throw new ApiError(
          403,
          `You are not authorized to assign this service category to your listing. ` +
          `Your account only supports the following service IDs: ${sellerInfo.servicesId.join(", ")}.`
        );
      }
    }

    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.serviceId !== undefined) updateData.serviceId = data.serviceId;
    if (data.description !== undefined)
      updateData.description = data.description;

    if (data.basePrice !== undefined) updateData.basePrice = data.basePrice;
    if (data.hourlyPrice !== undefined)
      updateData.hourlyPrice = data.hourlyPrice;
    if (data.dailyPrice !== undefined) updateData.dailyPrice = data.dailyPrice;
    if (data.isAvailable !== undefined)
      updateData.isAvailable = data.isAvailable;

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
  // TOGGLE STATUS & FEATURED
  // ════════════════════════════════════════════════════════════════════════

  // toggle listing available/unavailable status (seller - owner only)
  async toggleListingStatus(id: string, userId: string) {
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      throw new ApiError(404, "Listing not found");
    }

    if (listing.userId !== userId) {
      throw new ApiError(403, "You can only toggle the status of your own listings");
    }

    const updated = await prisma.listing.update({
      where: { id },
      data: { isAvailable: !listing.isAvailable },
    });

    return {
      message: `Listing is now ${updated.isAvailable ? "available" : "unavailable"}`,
      isAvailable: updated.isAvailable,
    };
  }

  // toggle listing featured status (seller - owner only, subscription check)
  async toggleListingFeatured(id: string, userId: string) {
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      throw new ApiError(404, "Listing not found");
    }

    if (listing.userId !== userId) {
      throw new ApiError(403, "You can only toggle the featured status of your own listings");
    }

    // If trying to feature, check subscription has the feature and slot available
    if (!listing.isFeatured) {
      const hasFeature = await subscriptionService.hasFeature(userId, "featured_listing");
      if (!hasFeature) {
        throw new ApiError(
          403,
          "Your subscription plan does not include featured listings. " +
          "Upgrade your plan to enable this feature."
        );
      }

      // Check featured listing limit
      const featureCheck = await subscriptionService.canFeatureListing(userId);
      if (!featureCheck.allowed) {
        throw new ApiError(
          403,
          `Featured listing limit reached. Your plan allows a maximum of ${featureCheck.maxAllowed} featured listing(s). ` +
          `You currently have ${featureCheck.currentCount}. Unfeature another listing or upgrade your plan.`
        );
      }
    }

    const updated = await prisma.listing.update({
      where: { id },
      data: { isFeatured: !listing.isFeatured },
    });

    return {
      message: `Listing is now ${updated.isFeatured ? "featured" : "unfeatured"}`,
      isFeatured: updated.isFeatured,
    };
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
