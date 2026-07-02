import { Request, RequestHandler, Response } from "express";
import { ApiResponse } from "../../utils/api-response.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { AppointmentService } from "./appoinment.service.js";
import type {
  CreateAppointmentInput,
  UpdateAppointmentStatusInput,
} from "./appoinment.validation.js";

const appointmentService = new AppointmentService();

// Create appointment (buyer)
export const createAppointment: RequestHandler<
  {},
  ApiResponse<unknown>,
  CreateAppointmentInput
> = asyncHandler(async (req: Request, res: Response) => {
  const buyerId = req.user?.id as string;

  const appointment = await appointmentService.createAppointment(
    req.body,
    buyerId
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Appointment created successfully", appointment));
});

// Get my appointments as buyer
export const getMyBuyerAppointments: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const buyerId = req.user?.id as string;

    const result = await appointmentService.getMyBuyerAppointments(buyerId, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Buyer appointments fetched successfully",
          result
        )
      );
  }
);

// Get my appointments as seller
export const getMySellerAppointments: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = req.user?.id as string;

    const result = await appointmentService.getMySellerAppointments(sellerId, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Seller appointments fetched successfully",
          result
        )
      );
  }
);

// Get booked times for a listing
export const getBookedTimes: RequestHandler<{ listingId: string }> =
  asyncHandler(async (req: Request, res: Response) => {
    const listingId = req.params.listingId as string;
    const date = req.query.date as string | undefined;

    const bookedTimes = await appointmentService.getBookedTimes(listingId, date);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Booked times fetched successfully",
          bookedTimes
        )
      );
  });

// Update appointment status (confirm/cancel/complete)
export const updateAppointmentStatus: RequestHandler<
  { appointmentId: string },
  ApiResponse<unknown>,
  UpdateAppointmentStatusInput
> = asyncHandler(async (req: Request, res: Response) => {
  const appointmentId = req.params.appointmentId as string;
  const userId = req.user?.id as string;

  const appointment = await appointmentService.updateAppointmentStatus(
    appointmentId,
    userId,
    req.body
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Appointment status updated successfully",
        appointment
      )
    );
});
