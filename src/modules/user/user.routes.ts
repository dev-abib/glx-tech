import { Router } from "express";
import { createUser, resendOtp, verifyUserAccount } from "./user.controller.js";
const router = Router();

// create user route
router.route("/create-user").post(createUser);

// verify user route
router.route("/verify-user").post(verifyUserAccount);

// resend otp route
router.route("/resend-otp").post(resendOtp);

export default router;
