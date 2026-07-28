import express from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import {
  CreateAppointmentSchema,
  UpdateAppointmentStatusSchema,
} from "./appoinment.validation.js";
import {
  cancelMyBooking,
  createAppointment,
  getMyBuyerAppointments,
  getMySellerAppointments,
  getMyRecentAppointments,
  getMyUpcomingAppointments,
  getSellerDashboardStats,
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

// Get recent appointments for seller (all statuses: pending, confirmed, completed, cancelled)
router
  .route("/seller/recent")
  .get(authenticate({ type: "seller" }), getMyRecentAppointments);

// Get upcoming appointments for seller (pending/confirmed)
router
  .route("/seller/upcoming")
  .get(authenticate({ type: "seller" }), getMyUpcomingAppointments);

// Get seller dashboard stats (avg rating, response rate, weekly completed)
router
  .route("/seller/dashboard-stats")
  .get(authenticate({ type: "seller" }), getSellerDashboardStats);

// Get booked times for a listing (public - no auth needed)
router.route("/booked-times/:listingId").get(getBookedTimes);// Cancel my own booking (buyer only)
router
  .route("/my-bookings/:appointmentId/cancel")
  .patch(authenticate({ type: "user" }), cancelMyBooking);

// Update appointment status (confirm/cancel/complete)
  router
    .route("/update-status/:appointmentId")
    .patch(
      authenticate({ type: "user" }),
      validate(UpdateAppointmentStatusSchema),
      updateAppointmentStatus
    );

export default router;
