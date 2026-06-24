import { Router } from "express";
import {
  changePassword,
  createUser,
  deleteUser,
  forgotPassword,
  getAllUsers,
  getMe,
  loginUserAccount,
  logout,
  refreshToken,
  resendOtp,
  resetPassword,
  switchRole,
  updateUser,
  verifyResetOtp,
  verifyUserAccount,
} from "./user.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import {
  changePasswordSchema,
  createUserSchema,
  forgotPasswordSchema,
  loginUserSchema,
  refreshTokenSchema,
  resendOtpSchema,
  resetPasswordSchema,
  switchRoleSchema,
  updateUserSchema,
  verifyUserAccountSchema,
} from "./user.validation.js";
import { uploadSingle } from "../../middlewares/file-validation.middleware.js";
const router = Router();

// Public routes
router.route("/create-user").post(validate(createUserSchema), createUser);
router.route("/verify-user").post(validate(verifyUserAccountSchema), verifyUserAccount);
router.route("/login-user").post(validate(loginUserSchema), loginUserAccount);
router.route("/resend-otp").post(validate(resendOtpSchema), resendOtp);
router.route("/forgot-password").post(validate(forgotPasswordSchema), forgotPassword);
router.route("/verify-reset-otp").post(validate(verifyUserAccountSchema), verifyResetOtp);
router.route("/reset-pass").post(authenticate({ type: "reset" }), validate(resetPasswordSchema), resetPassword);

// Authenticated user routes
router.route("/change-password").post(authenticate(), validate(changePasswordSchema), changePassword);
router.route("/refresh-token").post(validate(refreshTokenSchema), refreshToken);

// ── Profile & User management ───────────────────────────────────────────

// Get current user profile
router.route("/get-me").get(authenticate(), getMe);

// Update user profile (with optional avatar upload)
router.route("/update-me").put(
  authenticate(),
  uploadSingle("avatar"),
  validate(updateUserSchema),
  updateUser
);

// Delete user account
router.route("/delete-me").delete(authenticate(), deleteUser);

// Logout user
router.route("/logout").post(authenticate(), logout);

// Switch user/seller role
router.route("/switch-role").post(authenticate(), validate(switchRoleSchema), switchRole);

// Admin routes
router.route("/gt-all-users").get(authenticate({ type: "admin" }), getAllUsers);

export default router;
