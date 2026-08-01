import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { uploadSingle } from "../../middlewares/file-validation.middleware.js";
import {
  adminLogin,
  createAdmin,
  getAdminMe,
  getAllAdmins,
  adminChangePassword,
  adminDeleteUser,
  adminGetAllUsers,
  adminUpdateSelf,
  adminDeleteAdmin,
  adminUpdateAdmin,
  adminGetUserById,
  adminRefreshToken,
  adminGetAllListings,
  adminGetListingBySlug,
  adminGetListingReviews,
  adminGetAllReviews,
  adminDeleteListing,
  adminDeleteReview,
  adminGetDashboardTrends,
  adminGetAllAppointments,
  adminSetSellerVerification,
} from "./admin.controller.js";
import {
  adminLoginSchema,
  createAdminSchema,
  adminChangePasswordSchema,
  adminUpdateSelfSchema,
  adminUpdateUserSchema,
  adminSetSellerVerificationSchema,
} from "./admin.validation.js";

const router = Router();

// ── Public Routes ─────────────────────────────────────────────────────────

router.route("/login").post(validate(adminLoginSchema), adminLogin);
router.route("/refresh-token").post(adminRefreshToken);

// ── Super Admin Only ──────────────────────────────────────────────────────

router
  .route("/create-admin")
  .post(
    authenticate({ type: "super_admin" }),
    validate(createAdminSchema),
    createAdmin
  );

router.route("/gt-all-users").get(authenticate({ type: "admin" }), adminGetAllUsers);

router
  .route("/delete-admin/:id")
  .delete(authenticate({ type: "super_admin" }), adminDeleteAdmin);

router
  .route("/update-admin/:id")
  .put(
    authenticate({ type: "super_admin" }),
    validate(adminUpdateUserSchema),
    adminUpdateAdmin
  );

// ── Authenticated Admin Routes ────────────────────────────────────────────

router.route("/get-me").get(authenticate({ type: "admin" }), getAdminMe);

router
  .route("/update-me")
  .put(
    authenticate({ type: "admin" }),
    uploadSingle("avatar"),
    (req, _res, next) => {
      delete req.body.avatar;
      next();
    },
    validate(adminUpdateSelfSchema),
    adminUpdateSelf
  );

// Read-only listing of admin accounts — available to all admins (create,
// update and delete remain super_admin-only above).
router.route("/gt-all-admins").get(authenticate({ type: "admin" }), getAllAdmins);

router
  .route("/change-password")
  .post(
    authenticate({ type: "admin" }),
    validate(adminChangePasswordSchema),
    adminChangePassword
  );

router
  .route("/get-user/:id")
  .get(authenticate({ type: "admin" }), adminGetUserById);

router
  .route("/delete-user/:id")
  .delete(authenticate({ type: "admin" }), adminDeleteUser);

router
  .route("/verify-seller/:id")
  .patch(
    authenticate({ type: "admin" }),
    validate(adminSetSellerVerificationSchema),
    adminSetSellerVerification
  );

// ═══════════════════════════════════════════════════════════════════════════
// LISTING & REVIEW VIEWS (admin read-only)
// ═══════════════════════════════════════════════════════════════════════════

router
  .route("/listings")
  .get(authenticate({ type: "admin" }), adminGetAllListings);

router
  .route("/listings/listing/:slug")
  .get(authenticate({ type: "admin" }), adminGetListingBySlug);

router
  .route("/listings/:listingId/reviews")
  .get(authenticate({ type: "admin" }), adminGetListingReviews);

// Admin removes a listing — guarded in the service (rejects listings that
// still have bookings so appointment history is never orphaned).
router
  .route("/listings/:id")
  .delete(authenticate({ type: "admin" }), adminDeleteListing);

router
  .route("/reviews")
  .get(authenticate({ type: "admin" }), adminGetAllReviews);

// Admin removes a user review directly from the panel.
router
  .route("/reviews/:id")
  .delete(authenticate({ type: "admin" }), adminDeleteReview);

// ── Dashboard Trends ──────────────────────────────────────────────────────

router
  .route("/dashboard-trends")
  .get(authenticate({ type: "admin" }), adminGetDashboardTrends);

// ═══════════════════════════════════════════════════════════════════════════
// APPOINTMENT VIEWS (admin read-only)
// ═══════════════════════════════════════════════════════════════════════════

router
  .route("/appointments")
  .get(authenticate({ type: "admin" }), adminGetAllAppointments);

export default router;
