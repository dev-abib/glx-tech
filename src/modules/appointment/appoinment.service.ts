import { getPrismaClient } from "../../config/database.js";
import { ApiError } from "../../utils/api-error.js";
import type {
  CreateAppointmentInput,
  CreateUnavailableSlotInput,
  GetAppointmentsQueryInput,
  GetUnavailableSlotsQueryInput,
  UpdateAppointmentStatusInput,
} from "./appoinment.validation.js";
import type { STATUS } from "@prisma/client";

// Compare two HH:mm strings as times (works because zero-padded 24h format
// sorts lexicographically the same as chronologically).
function isTimeInRange(
  time: string | null | undefined,
  start: string | null | undefined,
  end: string | null | undefined
): boolean {
  if (!time) return false;
  if (!start || !end) return false;
  return time >= start && time < end;
}

// Does the requested booking conflict with a seller's blocked slot?
function isBlocked(
  bookingDate: string,
  bookingTime: string | null | undefined,
  slot: { date: string; startTime: string | null; endTime: string | null }
): boolean {
  if (slot.date !== bookingDate) return false;
  // Whole-day block (no time range) — any booking on that date is blocked.
  if (!slot.startTime && !slot.endTime) return true;
  // Time-range block — only conflicts when the buyer picked a time inside it.
  if (bookingTime) return isTimeInRange(bookingTime, slot.startTime, slot.endTime);
  // Buyer booked a date without a specific time against a time-range block —
  // assume a full-day SERVICE booking conflicts with any time block.
  return true;
}

const prisma = getPrismaClient();

// Reusable include to enrich appointment responses with buyer + listing details
const appointmentInclude = {
  listing: {
    select: {
      id: true,
      title: true,
      slug: true,
      media: true,
    },
  },
  buyer: {
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      phone: true,
    },
  },
} as const;

// Helper to compute revenue from an appointment
function computeRevenue(appointment: {
  appointmentType: string;
  price: number | null;
  hourlyPrice: number | null;
  dailyPrice: number | null;
  duration: number | null;
  durationUnit: string | null;
}): number | null {
  if (appointment.appointmentType === "SERVICE") {
    return appointment.price ?? null;
  }
  // RENT type
  if (
    appointment.hourlyPrice !== null &&
    appointment.hourlyPrice !== undefined &&
    appointment.duration !== null &&
    appointment.duration !== undefined &&
    appointment.durationUnit === "hours"
  ) {
    return appointment.hourlyPrice * appointment.duration;
  }
  if (
    appointment.dailyPrice !== null &&
    appointment.dailyPrice !== undefined &&
    appointment.duration !== null &&
    appointment.duration !== undefined &&
    appointment.durationUnit === "days"
  ) {
    return appointment.dailyPrice * appointment.duration;
  }
  return null;
}

// Valid status transitions map
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],       // Terminal state — no further transitions
  cancelled: [],       // Terminal state — no further transitions
};

export class AppointmentService {
  /**
   * Create a new appointment.
   * Supports SERVICE and RENT appointment types.
   * For SERVICE: requires price and bookingDate (no time slot needed).
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

    // ── Seller availability check ─────────────────────────────────────
    // Reject the booking if the seller has blocked out this date/time.
    const blockedSlots = await prisma.unavailableSlot.findMany({
      where: { sellerId: listing.userId, date: data.bookingDate },
    });
    const conflicting = blockedSlots.find((slot) =>
      isBlocked(data.bookingDate, data.bookingTime, slot)
    );
    if (conflicting) {
      const when = conflicting.startTime
        ? `${conflicting.startTime}–${conflicting.endTime}`
        : "all day";
      throw new ApiError(
        409,
        `The seller is unavailable on ${data.bookingDate}${when !== "all day" ? ` (${when})` : " (all day)"}. Please pick another slot.`
      );
    }

    if (data.appointmentType === "SERVICE") {
      // Lock: check if this listing already has a non-cancelled SERVICE booking on this date
      const existingAppointment = await prisma.appointment.findFirst({
        where: {
          listingId: data.listingId,
          bookingDate: data.bookingDate,
          status: { not: "cancelled" },
          appointmentType: "SERVICE",
        },
      });

      if (existingAppointment) {
        throw new ApiError(
          409,
          `This listing already has a service booking on ${data.bookingDate}`
        );
      }

      const appointment = await prisma.appointment.create({
        data: {
          listingId: data.listingId,
          buyerId,
          sellerId: listing.userId,
          bookingDate: data.bookingDate,
          bookingTime: data.bookingTime ?? null,
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
   * Helper: enrich appointments with computed revenue and buyer info,
   * then return paginated result.
   */
  private async enrichAndPaginate(
    where: Record<string, unknown>,
    query: GetAppointmentsQueryInput,
    orderBy?: Record<string, string> | Record<string, string>[]
  ) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const defaultOrderBy: Record<string, string> = { id: "desc" };

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderBy ?? defaultOrderBy,
        include: appointmentInclude,
      }),
      prisma.appointment.count({ where }),
    ]);

    const enriched = appointments.map((appt) => ({
      ...appt,
      revenue: computeRevenue(appt),
    }));

    return {
      appointments: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get appointments for the current user as a buyer.
   */
  async getMyBuyerAppointments(
    buyerId: string,
    query: GetAppointmentsQueryInput
  ) {
    return this.enrichAndPaginate({ buyerId }, query);
  }

  /**
   * Get appointments for the current user as a seller (listing owner).
   */
  async getMySellerAppointments(
    sellerId: string,
    query: GetAppointmentsQueryInput
  ) {
    return this.enrichAndPaginate({ sellerId }, query);
  }

  /**
   * Get recent appointments for the current user as a seller (listing owner).
   * Returns ALL appointments regardless of status (pending, confirmed, completed, cancelled).
   */
  async getMyRecentAppointments(
    sellerId: string,
    query: GetAppointmentsQueryInput
  ) {
    return this.enrichAndPaginate({ sellerId }, query);
  }

  /**
   * Get upcoming appointments for the seller (status: pending or confirmed).
   * Ordered by bookingDate ascending (nearest first).
   */
  async getMyUpcomingAppointments(
    sellerId: string,
    query: GetAppointmentsQueryInput
  ) {
    const upcomingStatuses: STATUS[] = ["pending", "confirmed"];
    const orderBy: Record<string, string>[] = [
      { bookingDate: "asc" },
      { bookingTime: "asc" },
    ];
    return this.enrichAndPaginate(
      { sellerId, status: { in: upcomingStatuses } },
      query,
      orderBy
    );
  }

  /**
   * Get seller dashboard statistics:
   * - averageRating from listing reviews
   * - responseRate (confirmed / total non-cancelled)
   * - currentWeekCompleted (jobs completed this week)
   */
  async getSellerDashboardStats(sellerId: string) {
    // 1. Average rating from all the seller's listing reviews
    const listingIds = await prisma.listing.findMany({
      where: { userId: sellerId },
      select: { id: true },
    });

    let averageRating = 0;
    if (listingIds.length > 0) {
      const reviewAgg = await prisma.userReview.aggregate({
        where: { listingId: { in: listingIds.map((l) => l.id) } },
        _avg: { rating: true },
      });
      averageRating = reviewAgg._avg.rating
        ? parseFloat(reviewAgg._avg.rating.toFixed(1))
        : 0;
    }

    // 2. Response rate = confirmed / (total non-cancelled)
    const totalNonCancelled = await prisma.appointment.count({
      where: { sellerId, status: { not: "cancelled" } },
    });
    const confirmedCount = await prisma.appointment.count({
      where: { sellerId, status: "confirmed" },
    });
    const responseRate = totalNonCancelled > 0
      ? parseFloat(((confirmedCount / totalNonCancelled) * 100).toFixed(1))
      : 0;

    // 3. Current week completed jobs — filter by bookingDate within this week
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

    const startStr = startOfWeek.toISOString().slice(0, 10); // YYYY-MM-DD
    const endStr = endOfWeek.toISOString().slice(0, 10);

    const currentWeekCompleted = await prisma.appointment.count({
      where: {
        sellerId,
        status: "completed",
        bookingDate: { gte: startStr, lte: endStr },
      },
    });

    return {
      averageRating,
      responseRate,
      currentWeekCompleted,
      totalListings: listingIds.length,
      totalAppointments: totalNonCancelled,
    };
  }

  /**
   * Cancel a buyer's own booking.
   * Only the buyer (who created the appointment) can cancel their own booking.
   */
  async cancelMyBooking(appointmentId: string, buyerId: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new ApiError(404, "Appointment not found");
    }

    // Only the buyer who owns this booking can cancel
    if (appointment.buyerId !== buyerId) {
      throw new ApiError(
        403,
        "You are not authorized to cancel this booking"
      );
    }

    // Cannot cancel already completed or already cancelled appointments
    if (appointment.status === "completed") {
      throw new ApiError(400, "Cannot cancel a completed appointment");
    }
    if (appointment.status === "cancelled") {
      throw new ApiError(400, "This appointment is already cancelled");
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "cancelled" },
      include: appointmentInclude,
    });

    return {
      ...updated,
      revenue: computeRevenue(updated),
    };
  }

  /**
   * Get all appointments across the platform (admin only).
   * Includes buyer, seller, and listing details.
   * Supports optional ?search= (id, buyer/seller name/email, listing
   * title/slug) and ?status= filters.
   */
  async getAllAppointments(query: GetAppointmentsQueryInput) {
    const { page, limit, search, status } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        {
          buyer: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        {
          seller: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        {
          listing: {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: "desc" },
        include: {
          ...appointmentInclude,
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    const enriched = appointments.map((appt) => ({
      ...appt,
      revenue: computeRevenue(appt),
    }));

    return {
      appointments: enriched,
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
      select: { id: true, userId: true },
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

    // Also surface the listing owner's blocked slots for this date so the
    // booking UI can grey them out alongside already-booked times.
    const blockedSlots = await prisma.unavailableSlot.findMany({
      where: {
        sellerId: listing.userId,
        ...(date ? { date } : {}),
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        reason: true,
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return {
      booked: bookedAppointments,
      blocked: blockedSlots,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // SELLER AVAILABILITY (blocked-out slots)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * List the authenticated seller's blocked slots, optionally filtered by date.
   */
  async getSellerAvailability(
    sellerId: string,
    query: GetUnavailableSlotsQueryInput
  ) {
    const slots = await prisma.unavailableSlot.findMany({
      where: {
        sellerId,
        ...(query.date ? { date: query.date } : {}),
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });
    return slots;
  }

  /**
   * Add a blocked-out slot for the authenticated seller.
   */
  async addUnavailableSlot(
    sellerId: string,
    data: CreateUnavailableSlotInput
  ) {
    const slot = await prisma.unavailableSlot.create({
      data: {
        sellerId,
        date: data.date,
        startTime: data.startTime ?? null,
        endTime: data.endTime ?? null,
        reason: data.reason ?? null,
      },
    });
    return slot;
  }

  /**
   * Delete a blocked-out slot (seller may only delete their own).
   */
  async deleteUnavailableSlot(sellerId: string, slotId: string) {
    const slot = await prisma.unavailableSlot.findUnique({
      where: { id: slotId },
    });
    if (!slot) {
      throw new ApiError(404, "Blocked slot not found");
    }
    if (slot.sellerId !== sellerId) {
      throw new ApiError(
        403,
        "You can only remove your own blocked slots"
      );
    }
    await prisma.unavailableSlot.delete({ where: { id: slotId } });
    return { message: "Blocked slot removed successfully" };
  }

  /**
   * Update appointment status (confirm, cancel, complete).
   * Only the seller can confirm/complete; either party can cancel.
   * Enforces valid status transitions:
   *   pending → confirmed | cancelled
   *   confirmed → completed | cancelled
   *   completed → (none)
   *   cancelled → (none)
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

    // ── Validate permissions ────────────────────────────────────────
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
    } else if (data.status === "pending") {
      // No one should be able to set back to pending
      throw new ApiError(400, "Cannot revert appointment back to pending");
    }

    // ── Validate status transition ──────────────────────────────────
    const allowedNextStates = VALID_TRANSITIONS[appointment.status];
    if (!allowedNextStates || !allowedNextStates.includes(data.status)) {
      throw new ApiError(
        400,
        `Invalid status transition: cannot change from "${appointment.status}" to "${data.status}". ` +
        `Allowed transitions from "${appointment.status}": ${(allowedNextStates ?? []).join(", ") || "none"}.`
      );
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: data.status },
      include: appointmentInclude,
    });

    return {
      ...updated,
      revenue: computeRevenue(updated),
    };
  }
}
