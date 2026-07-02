import express from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import {
  CreateAppointmentSchema,
  UpdateAppointmentStatusSchema,
} from "./appoinment.validation.js";
import {
  createAppointment,
  getMyBuyerAppointments,
  getMySellerAppointments,
  getBookedTimes,
  updateAppointmentStatus,
} from "./appoinment.controller.js";

const router = express.Router();

// Create appointment (authenticated user as buyer)
router
  .route("/create-appointment")
  .post(
    authenticate({ type: "user" }),
    validate(CreateAppointmentSchema),
    createAppointment
  );

// Get my appointments as buyer
router
  .route("/my-bookings")
  .get(authenticate({ type: "user" }), getMyBuyerAppointments);

// Get my appointments as seller
router
  .route("/seller/my-appointments")
  .get(authenticate({ type: "seller" }), getMySellerAppointments);

// Get booked times for a listing (public - no auth needed)
router.route("/booked-times/:listingId").get(getBookedTimes);

// Update appointment status (confirm/cancel/complete)
router
  .route("/update-status/:appointmentId")
  .patch(
    authenticate({ type: "user" }),
    validate(UpdateAppointmentStatusSchema),
    updateAppointmentStatus
  );

export default router;
