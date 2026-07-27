import { z } from "zod";

export const CreateServiceAppointmentSchema = z.object({
  listingId: z.string().min(1, "Listing ID is required"),
  bookingDate: z.string().min(1, "Booking date is required"),
  bookingTime: z.string().optional(),
  appointmentType: z.literal("SERVICE"),
  price: z.number().positive("Service price must be positive"),
});

export type CreateServiceAppointmentInput = z.infer<typeof CreateServiceAppointmentSchema>;

export const CreateRentAppointmentSchema = z.object({
  listingId: z.string().min(1, "Listing ID is required"),
  bookingDate: z.string().min(1, "Booking date is required"),
  bookingTime: z.string().optional(),
  appointmentType: z.literal("RENT"),
  hourlyPrice: z.number().positive("Hourly price must be positive").optional(),
  dailyPrice: z.number().positive("Daily price must be positive").optional(),
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
});

export type GetAppointmentsQueryInput = z.infer<typeof GetAppointmentsQuerySchema>;
