import { getPrismaClient } from "../../config/database.js";
import { ApiError } from "../../utils/api-error.js";
import type {
  CreateAppointmentInput,
  GetAppointmentsQueryInput,
  UpdateAppointmentStatusInput,
} from "./appoinment.validation.js";

const prisma = getPrismaClient();

export class AppointmentService {
  /**
   * Create a new appointment.
   * Supports SERVICE and RENT appointment types.
   * For SERVICE: requires price, bookingDate, bookingTime.
   * For RENT: requires hourlyPrice/dailyPrice, duration, durationUnit, bookingDate.
   */
  async createAppointment(data: CreateAppointmentInput, buyerId: string) {
    const listing = await prisma.listing.findUnique({
      where: { id: data.listingId },
      select: {
        id: true,
        userId: true,
        isAvailable: true,
      },
    });

    if (!listing) {
      throw new ApiError(404, "Listing not found");
    }

    if (!listing.isAvailable) {
      throw new ApiError(400, "Listing is not available for bookings");
    }

    // Prevent self-booking (buyer cannot be the same as seller/owner)
    if (listing.userId === buyerId) {
      throw new ApiError(400, "You cannot book your own listing");
    }

    if (data.appointmentType === "SERVICE") {
      // Lock: check if this time slot on this date is already booked for this listing
      const existingAppointment = await prisma.appointment.findFirst({
        where: {
          listingId: data.listingId,
          bookingDate: data.bookingDate,
          bookingTime: data.bookingTime,
          status: { not: "cancelled" },
          appointmentType: "SERVICE",
        },
      });

      if (existingAppointment) {
        throw new ApiError(
          409,
          `The time slot "${data.bookingTime}" on ${data.bookingDate} is already booked for this listing`
        );
      }

      const appointment = await prisma.appointment.create({
        data: {
          listingId: data.listingId,
          buyerId,
          sellerId: listing.userId,
          bookingDate: data.bookingDate,
          bookingTime: data.bookingTime,
          appointmentType: "SERVICE",
          price: data.price,
          status: "pending",
        },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      });

      return appointment;
    }

    // RENT type
    // Check for overlapping rent bookings on the same date
    const existingRent = await prisma.appointment.findFirst({
      where: {
        listingId: data.listingId,
        bookingDate: data.bookingDate,
        status: { not: "cancelled" },
        appointmentType: "RENT",
      },
    });

    if (existingRent) {
      throw new ApiError(
        409,
        `The date ${data.bookingDate} is already booked for rent on this listing`
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        listingId: data.listingId,
        buyerId,
        sellerId: listing.userId,
        bookingDate: data.bookingDate,
        bookingTime: data.bookingTime ?? null,
        appointmentType: "RENT",
        hourlyPrice: data.hourlyPrice ?? null,
        dailyPrice: data.dailyPrice ?? null,
        duration: data.duration,
        durationUnit: data.durationUnit,
        status: "pending",
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    return appointment;
  }

  /**
   * Get appointments for the current user as a buyer.
   */
  async getMyBuyerAppointments(
    buyerId: string,
    query: GetAppointmentsQueryInput
  ) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const where = { buyerId };

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: "desc" },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
            media: true,
          },
        },
      },
      }),
      prisma.appointment.count({ where }),
    ]);

    return {
      appointments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get appointments for the current user as a seller (listing owner).
   */
  async getMySellerAppointments(
    sellerId: string,
    query: GetAppointmentsQueryInput
  ) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const where = { sellerId };

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: "desc" },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
            media: true,
          },
        },
      },
      }),
      prisma.appointment.count({ where }),
    ]);

    return {
      appointments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all booked (non-cancelled) times for a listing on a specific date.
   * Useful for the frontend to show which time slots are already taken.
   * If no date is provided, returns all booked slots grouped by date.
   */
  async getBookedTimes(listingId: string, date?: string) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });

    if (!listing) {
      throw new ApiError(404, "Listing not found");
    }

    const where: Record<string, unknown> = {
      listingId,
      status: { not: "cancelled" },
    };

    if (date) {
      where.bookingDate = date;
    }

    const bookedAppointments = await prisma.appointment.findMany({
      where,
      select: {
        bookingDate: true,
        bookingTime: true,
      },
      orderBy: [{ bookingDate: "asc" }, { bookingTime: "asc" }],
    });

    return bookedAppointments;
  }

  /**
   * Update appointment status (confirm, cancel, complete).
   * Only the seller can confirm/complete; either party can cancel.
   */
  async updateAppointmentStatus(
    appointmentId: string,
    userId: string,
    data: UpdateAppointmentStatusInput
  ) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new ApiError(404, "Appointment not found");
    }

    // Validate permissions
    if (data.status === "confirmed") {
      // Only the seller can confirm
      if (appointment.sellerId !== userId) {
        throw new ApiError(403, "Only the seller can confirm appointments");
      }
    } else if (data.status === "completed") {
      // Only the seller can mark as completed
      if (appointment.sellerId !== userId) {
        throw new ApiError(403, "Only the seller can complete appointments");
      }
    } else if (data.status === "cancelled") {
      // Either buyer or seller can cancel
      if (appointment.buyerId !== userId && appointment.sellerId !== userId) {
        throw new ApiError(
          403,
          "You are not authorized to cancel this appointment"
        );
      }
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: data.status },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    return updated;
  }
}
