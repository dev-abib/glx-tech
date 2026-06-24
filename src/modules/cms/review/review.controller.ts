import { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/async-handler.js";
import { ApiResponse } from "../../../utils/api-response.js";
import { ReviewService } from "./review.service.js";
import type {
  CreateReviewSectionInput,
  UpdateReviewSectionInput,
  CreateReviewInput,
  UpdateReviewInput,
} from "./review.validation.js";

const reviewService = new ReviewService();

// ═══════════════════════════════════════════════════════════════════════════
// REVIEW SECTION
// ═══════════════════════════════════════════════════════════════════════════

export const getReviewSection: RequestHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const section = await reviewService.getReviewSection();

    if (!section) {
      return res
        .status(200)
        .json(new ApiResponse(200, "No review section found", null));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, "Review section fetched successfully", section));
  }
);

export const createReviewSection: RequestHandler<
  {},
  ApiResponse<unknown>,
  CreateReviewSectionInput
> = asyncHandler(async (req: Request, res: Response) => {
  const section = await reviewService.createReviewSection(req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, "Review section created successfully", section));
});

export const updateReviewSection: RequestHandler<
  { id: string },
  ApiResponse<unknown>,
  UpdateReviewSectionInput
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const section = await reviewService.updateReviewSection(id, req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, "Review section updated successfully", section));
});

export const deleteReviewSection: RequestHandler<
  { id: string },
  ApiResponse<null>
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await reviewService.deleteReviewSection(id);
  return res
    .status(200)
    .json(new ApiResponse(200, result.message));
});

// ═══════════════════════════════════════════════════════════════════════════
// REVIEWS
// ═══════════════════════════════════════════════════════════════════════════

export const getReviews: RequestHandler<
  { sectionId: string },
  ApiResponse<unknown>
> = asyncHandler(async (req: Request, res: Response) => {
  const sectionId = req.params.sectionId as string;
  const reviews = await reviewService.getReviews(sectionId);
  return res
    .status(200)
    .json(new ApiResponse(200, "Reviews fetched successfully", reviews));
});

export const getReview: RequestHandler<
  { reviewId: string },
  ApiResponse<unknown>
> = asyncHandler(async (req: Request, res: Response) => {
  const reviewId = req.params.reviewId as string;
  const review = await reviewService.getReviewById(reviewId);
  return res
    .status(200)
    .json(new ApiResponse(200, "Review fetched successfully", review));
});

export const createReview: RequestHandler<
  { sectionId: string },
  ApiResponse<unknown>,
  CreateReviewInput
> = asyncHandler(async (req: Request, res: Response) => {
  const sectionId = req.params.sectionId as string;
  const file = req.file;
  const pictureBuffer = file ? file.buffer : undefined;
  const review = await reviewService.createReview(sectionId, req.body, pictureBuffer);
  return res
    .status(201)
    .json(new ApiResponse(201, "Review created successfully", review));
});

export const updateReview: RequestHandler<
  { reviewId: string },
  ApiResponse<unknown>,
  UpdateReviewInput
> = asyncHandler(async (req: Request, res: Response) => {
  const reviewId = req.params.reviewId as string;
  const file = req.file;
  const pictureBuffer = file ? file.buffer : undefined;
  const review = await reviewService.updateReview(reviewId, req.body, pictureBuffer);
  return res
    .status(200)
    .json(new ApiResponse(200, "Review updated successfully", review));
});

export const deleteReview: RequestHandler<
  { reviewId: string },
  ApiResponse<null>
> = asyncHandler(async (req: Request, res: Response) => {
  const reviewId = req.params.reviewId as string;
  const result = await reviewService.deleteReview(reviewId);
  return res
    .status(200)
    .json(new ApiResponse(200, result.message));
});
