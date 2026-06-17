import { Router } from "express";
import {
  changePassword,
  createUser,
  forgotPassword,
  loginUserAccount,
  refreshToken,
  resendOtp,
  resetPassword,
  verifyResetOtp,
  verifyUserAccount,
} from "./user.controller.js";
const router = Router();

// create user route
router.route("/create-user").post(createUser);

// verify user route
router.route("/verify-user").post(verifyUserAccount);

// login user router
router.route("/login-user").post(loginUserAccount);

// resend otp route
router.route("/resend-otp").post(resendOtp);

// forgot password route
router.route("/forgot-password").post(forgotPassword);

// verify reset pass otp route
router.route("/verify-reset-otp").post(verifyResetOtp);

// reset pass route
router.route("/reset-pass").post(resetPassword);

// change password route
router.route("/change-password").post(changePassword);

// refresh token route
router.route("/refresh-token").post(refreshToken);

export default router;
