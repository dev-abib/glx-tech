import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { uploadSingle, uploadFields } from "../../middlewares/file-validation.middleware.js";
import {
  // Hero
  getHero,
  createHero,
  updateHero,
  // Services
  createService,
  updateService,
  deleteService,
  getServices,
  // Contact
  submitInquiry,
  getAllInquiries,
  getInquiry,
  markInquiryAsRead,
  replyToInquiry,
  deleteInquiry,
  getInquiryStats,
  // About
  getAbout,
  createAbout,
  updateAbout,
  deleteAboutImage,
} from "./cms.controller.js";
import {
  // Hero
  createHeroSchema,
  updateHeroSchema,
  // Services
  createServiceSchema,
  updateServiceSchema,
  // Contact
  createContactSchema,
  replyContactSchema,
  // About
  createAboutSchema,
  updateAboutSchema,
} from "./cms.validation.js";

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// HERO — Public
// ═══════════════════════════════════════════════════════════════════════════

router.route("/hero").get(getHero);

// ═══════════════════════════════════════════════════════════════════════════
// HERO — Admin
// ═══════════════════════════════════════════════════════════════════════════

router
  .route("/create-hero")
  .post(authenticate({ type: "admin" }), validate(createHeroSchema), createHero);

router
  .route("/update-hero/:id")
  .put(authenticate({ type: "admin" }), validate(updateHeroSchema), updateHero);

// ═══════════════════════════════════════════════════════════════════════════
// SERVICES — Public
// ═══════════════════════════════════════════════════════════════════════════

router.route("/hero/:heroId/services").get(getServices);

// ═══════════════════════════════════════════════════════════════════════════
// SERVICES — Admin
// ═══════════════════════════════════════════════════════════════════════════

router
  .route("/hero/:heroId/create-service")
  .post(
    authenticate({ type: "admin" }),
    uploadSingle("icon"),
    (req, _res, next) => {
      delete req.body.icon;
      next();
    },
    validate(createServiceSchema),
    createService
  );

router
  .route("/update-service/:serviceId")
  .put(
    authenticate({ type: "admin" }),
    uploadSingle("icon"),
    (req, _res, next) => {
      delete req.body.icon;
      next();
    },
    validate(updateServiceSchema),
    updateService
  );

router
  .route("/delete-service/:serviceId")
  .delete(authenticate({ type: "admin" }), deleteService);

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT — Public
// ═══════════════════════════════════════════════════════════════════════════

router.route("/submit-inquiry").post(validate(createContactSchema), submitInquiry);

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT — Admin
// ═══════════════════════════════════════════════════════════════════════════

router
  .route("/gt-all-inquiries")
  .get(authenticate({ type: "admin" }), getAllInquiries);

router
  .route("/get-inquiry-stats")
  .get(authenticate({ type: "admin" }), getInquiryStats);

router
  .route("/get-inquiry/:id")
  .get(authenticate({ type: "admin" }), getInquiry);

router
  .route("/mark-inquiry-read/:id")
  .patch(authenticate({ type: "admin" }), markInquiryAsRead);

router
  .route("/reply-inquiry/:id")
  .post(authenticate({ type: "admin" }), validate(replyContactSchema), replyToInquiry);

router
  .route("/delete-inquiry/:id")
  .delete(authenticate({ type: "admin" }), deleteInquiry);

// ═══════════════════════════════════════════════════════════════════════════
// ABOUT US — Public
// ═══════════════════════════════════════════════════════════════════════════

router.route("/get-about").get(getAbout);

// ═══════════════════════════════════════════════════════════════════════════
// ABOUT US — Admin
// ═══════════════════════════════════════════════════════════════════════════

router
  .route("/create-about")
  .post(
    authenticate({ type: "admin" }),
    uploadFields([
      { name: "image1", maxCount: 1 },
      { name: "image2", maxCount: 1 },
    ]),
    validate(createAboutSchema),
    createAbout
  );

router
  .route("/update-about/:id")
  .put(
    authenticate({ type: "admin" }),
    uploadFields([
      { name: "image1", maxCount: 1 },
      { name: "image2", maxCount: 1 },
    ]),
    validate(updateAboutSchema),
    updateAbout
  );

router
  .route("/delete-about-image/:id")
  .delete(authenticate({ type: "admin" }), deleteAboutImage);

export default router;
