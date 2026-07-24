import { Router } from "express";
import {
  changePassword,
  createSellerAddress,
  createUser,
  deleteSellerAddress,
  deleteUser,
  forgotPassword,
  getAllUsers,
  getMe,
  getSellerAddresses,
  loginUserAccount,
  logout,
  refreshToken,
  resendOtp,
  resetPassword,
  switchRole,
  updateSellerAddress,
  updateSellerDetails,
  updateUser,
  updateAsSeller,
  verifyResetOtp,
  verifyUserAccount,
} from "./user.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import {
  changePasswordSchema,
  createSellerAddressSchema,
  createUserSchema,
  forgotPasswordSchema,
  loginUserSchema,
  refreshTokenSchema,
  resendOtpSchema,
  resetPasswordSchema,
  switchRoleSchema,
  updateSellerAddressSchema,
  updateSellerDetailsSchema,
  updateUserAsSellerSchema,
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

// update user to seller
router.route("/update-as-seller").post(authenticate({ type: 'user' }), validate(updateUserAsSellerSchema), updateAsSeller)

// update seller details (requires seller role)
router.route("/update-seller-details").put(authenticate({ type: "seller" }), validate(updateSellerDetailsSchema), updateSellerDetails)

// ── Seller Address CRUD routes (all require seller role) ─────────────────

// get all seller addresses
router.route("/addresses").get(authenticate({ type: "seller" }), getSellerAddresses);

// create a new seller address
router.route("/addresses").post(authenticate({ type: "seller" }), validate(createSellerAddressSchema), createSellerAddress);

// update an existing seller address
router.route("/addresses/:addressId").put(authenticate({ type: "seller" }), validate(updateSellerAddressSchema), updateSellerAddress);

// delete seller address (by addressId)
router.route("/delete-address/:addressId").delete(authenticate({ type: "seller" }), deleteSellerAddress)

export default router;
