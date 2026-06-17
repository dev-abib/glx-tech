import { Router } from "express";
import {
  createUser,
  forgotPassword,
  loginUserAccount,
  resendOtp,
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

export default router;
