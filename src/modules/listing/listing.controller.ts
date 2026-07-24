import { Request, RequestHandler, Response } from "express";
import { ApiResponse } from "../../utils/api-response.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { ListingService } from "./listing.service.js";
import type {
  CreateListingInput,
  UpdateListingInput,
  CreateUserReviewInput,
  UpdateUserReviewInput,
} from "./listing.validation.js";

const listingService = new ListingService();


// create listing
export const createListing: RequestHandler<
  {},
  ApiResponse<{ message: string; data: CreateListingInput } | null>,
  CreateListingInput
> = asyncHandler(async (req: Request, res: Response) => {
  const files =
    (req as Request & { files?: Express.Multer.File[] }).files ?? [];
  const imageBuffers = files.map((file) => file.buffer);

  const result = await listingService.createListing(
    req.body,
    req.user?.id as string,
    imageBuffers
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Listing created successfully", result));
});


// get all listing
export const getAllListings: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await listingService.getAllListings({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
      search: req.query.search as string | undefined,
      serviceId: req.query.serviceId as string | undefined,
      serviceName: req.query.serviceName as string | undefined,
      address: req.query.address as string | undefined,
      radius: req.query.radius ? Number(req.query.radius) : undefined,
      minRating: req.query.minRating
        ? Number(req.query.minRating)
        : undefined,
      isAvailable: req.query.isAvailable === "true"
        ? true
        : req.query.isAvailable === "false"
          ? false
          : undefined,
      isFeatured: req.query.isFeatured === "true"
        ? true
        : req.query.isFeatured === "false"
          ? false
          : undefined,
      sortBy: (req.query.sortBy as string) || "createdAt",
      sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
    });

    return res
      .status(200)
      .json(new ApiResponse(200, "Listings fetched successfully", result));
  }
);

// get listing by slug
export const getListingBySlug: RequestHandler<{ slug: string }> = asyncHandler(
  async (req: Request, res: Response) => {
    const slug = req.params.slug as string;
    const listing = await listingService.getListingBySlug(slug);

    return res
      .status(200)
      .json(new ApiResponse(200, "Listing fetched successfully", listing));
  }
);

// get my listings
export const getMyListings: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id as string;
    const result = await listingService.getMyListings(userId, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
      isAvailable: req.query.isAvailable === "true"
        ? true
        : req.query.isAvailable === "false"
          ? false
          : undefined,
      isFeatured: req.query.isFeatured === "true"
        ? true
        : req.query.isFeatured === "false"
          ? false
          : undefined,
      sortBy: (req.query.sortBy as string) || "createdAt",
      sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
    });

    return res
      .status(200)
      .json(new ApiResponse(200, "My listings fetched successfully", result));
  }
);

// update listing
export const updateListing: RequestHandler<
  { id: string },
  ApiResponse<unknown>,
  UpdateListingInput
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user?.id as string;
  const files =
    (req as Request & { files?: Express.Multer.File[] }).files ?? [];
  const imageBuffers = files.map((file) => file.buffer);

  const listing = await listingService.updateListing(
    id,
    userId,
    req.body,
    imageBuffers
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Listing updated successfully", listing));
});

// delete listing
export const deleteListing: RequestHandler<{ id: string }> = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = req.user?.id as string;
    const result = await listingService.deleteListing(id, userId);

    return res
      .status(200)
      .json(new ApiResponse(200, result.message));
  }
);


// toggle listing available/unavailable status
export const toggleListingStatus: RequestHandler<{ id: string }> = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = req.user?.id as string;
    const result = await listingService.toggleListingStatus(id, userId);

    return res
      .status(200)
      .json(new ApiResponse(200, result.message, { isAvailable: result.isAvailable }));
  }
);

// toggle listing featured status
export const toggleListingFeatured: RequestHandler<{ id: string }> = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = req.user?.id as string;
    const result = await listingService.toggleListingFeatured(id, userId);

    return res
      .status(200)
      .json(new ApiResponse(200, result.message, { isFeatured: result.isFeatured }));
  }
);


// add user review to listing
export const createUserReview: RequestHandler<
  { listingId: string },
  ApiResponse<unknown>,
  CreateUserReviewInput
> = asyncHandler(async (req: Request, res: Response) => {
  const listingId = req.params.listingId as string;
  const userId = req.user?.id as string;

  const review = await listingService.createUserReview(
    req.body,
    userId,
    listingId
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Review created successfully", review));
});

// get all reviews
export const getListingReviews: RequestHandler<{ listingId: string }> =
  asyncHandler(async (req: Request, res: Response) => {
    const listingId = req.params.listingId as string;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await listingService.getListingReviews(
      listingId,
      page,
      limit
    );

    return res
      .status(200)
      .json(new ApiResponse(200, "Reviews fetched successfully", result));
  });

// get related listings (by same service type)
export const getRelatedListings: RequestHandler<{ slug: string }> =
  asyncHandler(async (req: Request, res: Response) => {
    const slug = req.params.slug as string;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 6;

    const result = await listingService.getRelatedListings(slug, page, limit);

    return res
      .status(200)
      .json(new ApiResponse(200, "Related listings fetched successfully", result));
  });

// get user review
export const getUserReview: RequestHandler<{ reviewId: string }> =
  asyncHandler(async (req: Request, res: Response) => {
    const reviewId = req.params.reviewId as string;
    const review = await listingService.getUserReviewById(reviewId);

    return res
      .status(200)
      .json(new ApiResponse(200, "Review fetched successfully", review));
  });

  // update user review
export const updateUserReview: RequestHandler<
  { reviewId: string },
  ApiResponse<unknown>,
  UpdateUserReviewInput
> = asyncHandler(async (req: Request, res: Response) => {
  const reviewId = req.params.reviewId as string;
  const userId = req.user?.id as string;

  const review = await listingService.updateUserReview(
    reviewId,
    userId,
    req.body
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Review updated successfully", review));
});

// delete user review
export const deleteUserReview: RequestHandler<{ reviewId: string }> =
  asyncHandler(async (req: Request, res: Response) => {
    const reviewId = req.params.reviewId as string;
    const userId = req.user?.id as string;
    const result = await listingService.deleteUserReview(reviewId, userId);

    return res
      .status(200)
      .json(new ApiResponse(200, result.message));
  });
