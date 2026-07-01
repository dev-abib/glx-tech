import { Router } from "express";
import { subscribeUnsubscribeNewsletter } from "./newsletter.controller.js";
import { validate } from "../../../middlewares/validation.middleware.js";
import { newsLetterSchema } from "./newsletter.validation.js";

const router = Router();

router
  .route("/subscribe-unsubscribe-newsletter")
  .post(validate(newsLetterSchema), subscribeUnsubscribeNewsletter);

export default router;
