import { Router } from "express";
import rateLimit from "express-rate-limit";
import { subscribe, unsubscribe, unsubscribePage } from "./newsletter.controller.js";
import { validate } from "../../../middlewares/validation.middleware.js";
import { subscribeSchema } from "./campaign.validation.js";

const router = Router();

// Rate limit: max 5 subscribe requests per IP per hour (anti-spam)
const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    success: false,
    message: "Too many subscribe attempts. Please try again later.",
  },
});

// POST /newsletter/subscribe — subscribe to newsletter
router
  .route("/subscribe")
  .post(subscribeLimiter, validate(subscribeSchema), subscribe);

// GET /newsletter/unsubscribe?token=xxx — unsubscribe (returns HTML page)
router
  .route("/unsubscribe")
  .get(unsubscribePage);

// Also accept POST for programmatic unsubscribe
router
  .route("/unsubscribe")
  .post(unsubscribe);

export default router;
