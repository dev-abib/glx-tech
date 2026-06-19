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

router.route("/gt-all-users").get(authenticate({ type: "super_admin" }), adminGetAllUsers);

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

router.route("/gt-all-admins").get(authenticate({ type: "super_admin" }), getAllAdmins);

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

export default router;
