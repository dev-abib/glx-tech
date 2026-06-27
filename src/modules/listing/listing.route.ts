import express from "express";
import { validate } from "../../middlewares/validation.middleware.js";
import {
  CreateListingSchema,
  UpdateListingSchema,
  CreateUserReviewSchema,
  UpdateUserReviewSchema,
} from "./listing.validation.js";
import {
  createListing,
  getAllListings,
  getListingBySlug,
  getMyListings,
  updateListing,
  deleteListing,
  createUserReview,
  getListingReviews,
  getRelatedListings,
  getUserReview,
  updateUserReview,
  deleteUserReview,
} from "./listing.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { uploadMultiple } from "../../middlewares/file-validation.middleware.js";

const router = express.Router();

// Get all listings (public)
router.route("/get-all-listings").get(getAllListings);

// Get listing by slug (public)
router.route("/listing/:slug").get(getListingBySlug);

// Get related listings by same service type (public)
router.route("/listing/:slug/related").get(getRelatedListings);


// Create listing (seller only)
router
  .route("/create-listing")
  .post(
    authenticate({ type: "seller" }),
    uploadMultiple("images", 10),
    validate(CreateListingSchema),
    createListing
  );

// Get my listings (seller only)
router
  .route("/my-listings")
  .get(authenticate({ type: "seller" }), getMyListings);

// Update listing (seller only - owner)
router
  .route("/update-listing/:id")
  .put(
    authenticate({ type: "seller" }),
    uploadMultiple("images", 10),
    validate(UpdateListingSchema),
    updateListing
  );

// Delete listing (seller only - owner)
router
  .route("/delete-listing/:id")
  .delete(authenticate({ type: "seller" }), deleteListing);

// ═══════════════════════════════════════════════════════════════════════════
// USER REVIEWS — Public
// ═══════════════════════════════════════════════════════════════════════════

// Get all reviews for a listing (public)
router.route("/listing/:listingId/reviews").get(getListingReviews);

// Get single review (public)
router.route("/review/:reviewId").get(getUserReview);

// ═══════════════════════════════════════════════════════════════════════════
// USER REVIEWS — Authenticated User
// ═══════════════════════════════════════════════════════════════════════════

// Create review for a listing (authenticated user)
router
  .route("/listing/:listingId/create-review")
  .post(
    authenticate({ type: "user" }),
    validate(CreateUserReviewSchema),
    createUserReview
  );

// Update review (authenticated user - owner only)
router
  .route("/update-review/:reviewId")
  .put(
    authenticate({ type: "user" }),
    validate(UpdateUserReviewSchema),
    updateUserReview
  );

// Delete review (authenticated user - owner only)
router
  .route("/delete-review/:reviewId")
  .delete(authenticate({ type: "user" }), deleteUserReview);

export default router;
