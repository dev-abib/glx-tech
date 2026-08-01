import { getPrismaClient } from "../../config/database.js";
import { CloudinaryService } from "../../helpers/cloudinary.service.js";
import { UserRepository } from "../user/user.repository.js";
import { ApiError } from "../../utils/api-error.js";
import {
  generateUniqueListingSlug,
  slugifyTitle,
} from "../../utils/slugify.js";
import { SubscriptionService } from "../plans/subscription.service.js";
import type {
  CreateListingInput,
  UpdateListingInput,
  GetListingsQueryInput,
  CreateUserReviewInput,
  UpdateUserReviewInput,
} from "./listing.validation.js";

const cloudinary = new CloudinaryService();
const prisma = getPrismaClient();
const userRepo = new UserRepository();
const subscriptionService = new SubscriptionService();

/**
 * Only surface a seller's external link on a listing once an admin has
 * approved it. Empty links and links awaiting approval / rejected links
 * are returned as null so public frontends never render a link icon for
 * them.
 */
const withApprovedSellerLink = <
  T extends {
    sellerInfo?: {
      socialLInk?: string | null;
      linkStatus?: string | null;
    } | null;
  } | null
>(
  user: T
): T => {
  if (!user?.sellerInfo) return user;
  const { socialLInk, linkStatus, ...publicInfo } = user.sellerInfo;
  const approved =
    linkStatus === "approved" &&
    typeof socialLInk === "string" &&
    socialLInk.trim().length > 0;
  // Expose the link only when approved, and never leak the moderation state
  // (linkStatus) to public listing payloads.
  return {
    ...user,
    sellerInfo: {
      ...publicInfo,
      socialLInk: approved ? socialLInk : null,
    },
  };
};

export class ListingService {
  // create listing service
  async createListing(
    data: CreateListingInput,
    userId: string,
    imageBuffers: Buffer[] = []
  ) {
    // checking if user exists
    await userRepo.findUser("id", userId, true);

    // Enforce membership + plan limits server-side before a listing can be created.
    const planCheck = await subscriptionService.canCreateListing(userId);
    if (!planCheck.allowed) {
      if (planCheck.reason === "membership_required") {
        throw new ApiError(
          403,
          "To add a listing, you must have a subscription plan. Please subscribe to a plan first."
        );
      }
      throw new ApiError(
        403,
        `Listing limit reached. Your plan allows a maximum of ${planCheck.maxAllowed} active listing(s). ` +
        `You currently have ${planCheck.currentCount}. Upgrade your plan to create more listings.`
      );
    }

    // One seller can only have one listing with a given title — keeps URLs
    // unique per shop and prevents duplicate-named listings ("Oil Change").
    // Matched case-insensitively so "Oil Change" and "oil change" count as
    // the same name. Checked BEFORE any Cloudinary uploads so a rejected
    // request never orphans images.
    const duplicateTitle = await prisma.listing.findFirst({
      where: { userId, title: { equals: data.title, mode: "insensitive" } },
      select: { id: true },
    });
    if (duplicateTitle) {
      throw new ApiError(
        409,
        `You already have a listing named "${data.title}". Each listing must have a unique name.`
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

    const uploadedImages = [] as Array<{ url: string; publicId: string }>;

    for (const imageBuffer of imageBuffers) {
      const uploadedImage = await cloudinary.uploadFile(
        imageBuffer,
        "listings"
      );
      uploadedImages.push(uploadedImage);
    }

    // Generate a unique slug server-side from the title so listings with the
    // same title never collide (the DB slug column is globally unique).
    const slug = await generateUniqueListingSlug(data.title);

    const listing = await prisma.listing.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        slug,
        serviceId: data.serviceId,
        addressId: data.addressId,
        basePrice: data.basePrice ?? null,
        hourlyPrice: data.hourlyPrice ?? null,
        dailyPrice: data.dailyPrice ?? null,
        isAvailable: data.isAvailable,
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
        slug: listing.slug,
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



  // get all listings (public)
  async getAllListings(query: GetListingsQueryInput) {
    const {
      page,
      limit,
      search,
      location,
      serviceId,
      serviceName,
      minPrice,
      maxPrice,
      minRating,
      isAvailable,
      isFeatured,
      sortBy,
      sortOrder,
      random,
    } = query;
    const skip = (page - 1) * limit;

    // Lapse policy — hide listings of sellers whose subscription grace
    // period ended (TTL-guarded sweep, runs at most once per minute).
    await subscriptionService.hideExpiredListings();

    // ── Build the Prisma where clause (DB-level filters) ────────────
    const where: Record<string, unknown> = {
      // Exclude listings of soft-deleted (anonymized) sellers.
      user: { isActive: true },
    };

    // Location search — matches the listing's address (street, city, state
    // or zip) so the frontend can filter by area.
    if (location) {
      where.AND = [
        {
          OR: [
            { address: { streetAddress: { contains: location, mode: "insensitive" } } },
            { address: { city: { contains: location, mode: "insensitive" } } },
            { address: { state: { contains: location, mode: "insensitive" } } },
            { address: { zipCode: { contains: location, mode: "insensitive" } } },
          ],
        },
      ];
    }

    // Text search — matches across all listing fields (title, slug,
    // description, seller name/email, service name, full address, price).
    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { userId: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { basePrice: { contains: search, mode: "insensitive" } },
        { hourlyPrice: { contains: search, mode: "insensitive" } },
        { dailyPrice: { contains: search, mode: "insensitive" } },
        {
          address: {
            streetAddress: { contains: search, mode: "insensitive" },
          },
        },
        {
          address: {
            city: { contains: search, mode: "insensitive" },
          },
        },
        {
          address: {
            state: { contains: search, mode: "insensitive" },
          },
        },
        {
          address: {
            zipCode: { contains: search, mode: "insensitive" },
          },
        },
        {
          user: {
            name: { contains: search, mode: "insensitive" },
          },
        },
        {
          user: {
            email: { contains: search, mode: "insensitive" },
          },
        },
        {
          service: {
            name: { contains: search, mode: "insensitive" },
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

    // Determine if we need to do any post-fetch (in-memory) filtering
    // Random ordering also requires in-memory shuffling
    const needsInMemoryFiltering =
      minRating !== undefined ||
      minPrice !== undefined ||
      maxPrice !== undefined ||
      random === true;

    /**
     * Fisher-Yates shuffle using Math.random for true random ordering.
     */
    const shuffleArray = <T>(arr: T[]): T[] => {
      const shuffled = [...arr];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // ── Common Prisma include (always includes ratings for avgRating) ──
    const includeWithRatings = {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          isVerifiedSeller: true,
          sellerInfo: {
            select: { socialLInk: true, linkStatus: true },
          },
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

      // Filter by price range (basePrice is stored as a string, e.g. "500")
      if (minPrice !== undefined || maxPrice !== undefined) {
        allListings = allListings.filter((listing) => {
          if (!listing.basePrice) return false;
          const price = parseFloat(listing.basePrice);
          if (isNaN(price)) return false;
          if (minPrice !== undefined && price < minPrice) return false;
          if (maxPrice !== undefined && price > maxPrice) return false;
          return true;
        });
      }

      // Shuffle randomly using Math.random (Fisher-Yates) — always
      allListings = shuffleArray(allListings);

      const total = allListings.length;
      const paginatedListings = allListings.slice(skip, skip + limit);

      const listings = paginatedListings.map(
        ({ userReview, ...rest }) => ({
          ...rest,
          user: withApprovedSellerLink(rest.user),
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
        user: withApprovedSellerLink(rest.user),
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
      user: { isActive: true },
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
              isVerifiedSeller: true,
              sellerInfo: {
                select: { socialLInk: true, linkStatus: true },
              },
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
        user: withApprovedSellerLink(rest.user),
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
    const listing = await prisma.listing.findFirst({
      where: { slug, user: { isActive: true } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            isVerifiedSeller: true,
            sellerInfo: {
              select: { socialLInk: true, linkStatus: true },
            },
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

    return {
      ...listing,
      user: withApprovedSellerLink(listing.user),
    };
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

    // Membership must remain active to manage an existing listing.
    if (!(await subscriptionService.hasActiveMembership(userId))) {
      throw new ApiError(
        403,
        "Your subscription is inactive. Please subscribe to a plan to manage your listings."
      );
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

    if (data.title !== undefined) {
      // One seller can only have one listing with a given title.
      const duplicateTitle = await prisma.listing.findFirst({
        where: {
          userId,
          title: { equals: data.title, mode: "insensitive" },
          id: { not: id },
        },
        select: { id: true },
      });
      if (duplicateTitle) {
        throw new ApiError(
          409,
          `You already have a listing named "${data.title}". Each listing must have a unique name.`
        );
      }

      updateData.title = data.title;
      // Regenerate the slug from the new title and keep it unique.
      updateData.slug = await generateUniqueListingSlug(data.title, id);
    } else if (data.slug !== undefined) {
      // No title change — keep the client slug only if it stays unique.
      const candidate = data.slug.trim() || slugifyTitle(listing.title);
      const existing = await prisma.listing.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (existing && existing.id !== id) {
        throw new ApiError(409, "A listing with this slug already exists");
      }
      updateData.slug = candidate;
    }
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

    // Membership must remain active to delete an existing listing.
    if (!(await subscriptionService.hasActiveMembership(userId))) {
      throw new ApiError(
        403,
        "Your subscription is inactive. Please subscribe to a plan to delete your listings."
      );
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

    // Membership must remain active to re-enable a lapsed/hidden listing.
    if (!(await subscriptionService.hasActiveMembership(userId))) {
      throw new ApiError(
        403,
        "Your subscription is inactive. Please subscribe to a plan to change listing availability."
      );
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

    // Membership must remain active to manage the featured flag.
    if (!(await subscriptionService.hasActiveMembership(userId))) {
      throw new ApiError(
        403,
        "Your subscription is inactive. Please subscribe to a plan to change featured status."
      );
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
      // Free-text search (admin) — matches review ID, listing ID, reviewer
      // user ID, review text or reviewer name (case-insensitive).
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { listingId: { contains: search, mode: "insensitive" } },
        { userId: { contains: search, mode: "insensitive" } },
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
