import { Router } from "express";
import { authenticate } from "../../../middlewares/auth.middleware.js";
import { validate } from "../../../middlewares/validation.middleware.js";
import {
  createCampaign,
  listCampaigns,
  sendCampaign,
  getSubscriberCount,
} from "./newsletter.controller.js";
import { createCampaignSchema } from "./campaign.validation.js";

const router = Router();

// All campaign routes require admin authentication
router.use(authenticate({ type: "admin" }));

// POST /admin/campaigns — create a new campaign draft
router
  .route("/")
  .post(validate(createCampaignSchema), createCampaign);

// GET /admin/campaigns — list all campaigns
router
  .route("/")
  .get(listCampaigns);

// POST /admin/campaigns/:id/send — send a campaign
router
  .route("/:id/send")
  .post(sendCampaign);

// GET /admin/campaigns/subscriber-count — get subscriber count
router
  .route("/subscriber-count")
  .get(getSubscriberCount);

export default router;
