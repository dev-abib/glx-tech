import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]?\d|2[0-3]):[0-5]\d$/;

// Accept "YYYY-MM-DD" or a full ISO timestamp ("2026-07-15T00:00:00.000Z")
// and normalise to the date part — keeps compatibility with clients that send
// Date.toISOString() values.
const normalizeDate = (val: unknown): unknown => {
  if (typeof val !== "string") return val;
  const datePart = val.slice(0, 10);
  return dateRegex.test(datePart) ? datePart : val;
};

// Accept "HH:MM" or "H:MM" and normalise to zero-padded "HH:MM".
const normalizeTime = (val: unknown): unknown => {
  if (typeof val !== "string") return val;
  if (!timeRegex.test(val)) return val;
  const [h, m] = val.split(":");
  return `${h.padStart(2, "0")}:${m}`;
};

const bookingDateField = z.preprocess(
  normalizeDate,
  z.string().regex(dateRegex, "Booking date must be YYYY-MM-DD")
);
const bookingTimeField = z.preprocess(
  normalizeTime,
  z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Booking time must be HH:MM (24-hour)")
    .optional()
);

// Optional HH:MM field with the same normalization — used for blocked-slot
// start/end times so stored values are always zero-padded and the service's
// lexicographic range comparison stays correct.
const optionalTimeField = z.preprocess(
  normalizeTime,
  z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM (24-hour)")
    .optional()
);

export const CreateServiceAppointmentSchema = z.object({
  listingId: z.string().min(1, "Listing ID is required"),
  bookingDate: bookingDateField,
  bookingTime: bookingTimeField,
  appointmentType: z.literal("SERVICE"),
  // price may be 0 — free services are supported.
  price: z.number().min(0, "Service price cannot be negative"),
});

export type CreateServiceAppointmentInput = z.infer<typeof CreateServiceAppointmentSchema>;

export const CreateRentAppointmentSchema = z.object({
  listingId: z.string().min(1, "Listing ID is required"),
  bookingDate: bookingDateField,
  bookingTime: bookingTimeField,
  appointmentType: z.literal("RENT"),
  // Prices may be 0 — free rentals are supported.
  hourlyPrice: z.number().min(0, "Hourly price cannot be negative").optional(),
  dailyPrice: z.number().min(0, "Daily price cannot be negative").optional(),
  duration: z.number().positive("Duration must be positive"),
  durationUnit: z.enum(["hours", "days"]),
}).refine(
  (data) => data.hourlyPrice !== undefined || data.dailyPrice !== undefined,
  { message: "At least one of hourlyPrice or dailyPrice is required for rent" }
);

export type CreateRentAppointmentInput = z.infer<typeof CreateRentAppointmentSchema>;

export const CreateAppointmentSchema = z.discriminatedUnion("appointmentType", [
  CreateServiceAppointmentSchema,
  CreateRentAppointmentSchema,
]);

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;

export const UpdateAppointmentStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
});

export type UpdateAppointmentStatusInput = z.infer<typeof UpdateAppointmentStatusSchema>;

export const GetAppointmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  // Free-text search (admin) — matches appointment id, buyer/seller name or
  // email, listing title or slug.
  search: z.string().trim().max(200).optional(),
  // Status filter (admin) — pending / confirmed / completed / cancelled.
  status: z
    .enum(["pending", "confirmed", "completed", "cancelled"])
    .optional(),
});

export type GetAppointmentsQueryInput = z.infer<typeof GetAppointmentsQuerySchema>;

// ── Seller availability (blocked slots) ───────────────────────────────────

export const CreateUnavailableSlotSchema = z
  .object({
    date: z.string().regex(dateRegex, "Date must be YYYY-MM-DD"),
    startTime: optionalTimeField,
    endTime: optionalTimeField,
    reason: z.string().max(300, "Reason is too long").optional(),
  })
  .refine(
    (d) => (d.startTime === undefined) === (d.endTime === undefined),
    {
      message: "startTime and endTime must be provided together (or both omitted for a full-day block)",
      path: ["startTime"],
    }
  )
  .refine(
    (d) => {
      if (d.startTime !== undefined && d.endTime !== undefined) {
        return d.startTime < d.endTime;
      }
      return true;
    },
    { message: "endTime must be after startTime", path: ["endTime"] }
  );

export type CreateUnavailableSlotInput = z.infer<typeof CreateUnavailableSlotSchema>;

export const GetUnavailableSlotsQuerySchema = z.object({
  date: z
    .string()
    .regex(dateRegex, "Date must be YYYY-MM-DD")
    .optional(),
});

export type GetUnavailableSlotsQueryInput = z.infer<typeof GetUnavailableSlotsQuerySchema>;
