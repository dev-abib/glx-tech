import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
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
} from "./admin.controller.js";
import {
  adminLoginSchema,
  createAdminSchema,
  adminChangePasswordSchema,
  adminUpdateSelfSchema,
  adminUpdateUserSchema,
} from "./admin.validation.js";

const router = Router();

// ── Public Routes ─────────────────────────────────────────────────────────

// Admin login (separate from user login — relaxed password validation)
router.route("/login").post(validate(adminLoginSchema), adminLogin);

// Admin refresh token
router.route("/refresh-token").post(adminRefreshToken);

// ── Super Admin Only ──────────────────────────────────────────────────────

// Create new admin / super_admin user
router
  .route("/create")
  .post(
    authenticate({ type: "super_admin" }),
    validate(createAdminSchema),
    createAdmin
  );

// Get all users (all roles — super_admin only)
router.route("/all-users").get(authenticate({ type: "super_admin" }), adminGetAllUsers);

// Delete an admin/super_admin by ID (super_admin only)
router
  .route("/delete/:id")
  .delete(authenticate({ type: "super_admin" }), adminDeleteAdmin);

// Update an admin/super_admin by ID (super_admin only)
router
  .route("/update/:id")
  .put(
    authenticate({ type: "super_admin" }),
    validate(adminUpdateUserSchema),
    adminUpdateAdmin
  );

// ── Authenticated Admin Routes ────────────────────────────────────────────

// Get current admin profile
router.route("/me").get(authenticate({ type: "admin" }), getAdminMe);

// Update own admin profile (name, email, phone)
router
  .route("/update-me")
  .put(
    authenticate({ type: "admin" }),
    validate(adminUpdateSelfSchema),
    adminUpdateSelf
  );

// Get all admins (super_admin only)
router.route("/all").get(authenticate({ type: "super_admin" }), getAllAdmins);

// Change admin password
router
  .route("/change-password")
  .post(
    authenticate({ type: "admin" }),
    validate(adminChangePasswordSchema),
    adminChangePassword
  );

// Get a single user/admin by ID (admin/super_admin)
router
  .route("/users/:id")
  .get(authenticate({ type: "admin" }), adminGetUserById)
  .delete(authenticate({ type: "admin" }), adminDeleteUser);

export default router;
