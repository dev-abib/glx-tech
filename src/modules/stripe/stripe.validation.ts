import { z } from "zod";

export const CreateDonationSchema = z.object({
  amount: z.number().positive("Amount must be positive").optional(),
  customerEmail: z.string().email("Invalid email").optional(),
  customerName: z.string().min(1, "Name is required").max(100).optional(),
  message: z.string().max(500, "Message too long").optional(),
  successUrl: z.string().url("Invalid success URL").optional(),
  cancelUrl: z.string().url("Invalid cancel URL").optional(),
});

export type CreateDonationInput = z.infer<typeof CreateDonationSchema>;

export const DonationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export type DonationQueryInput = z.infer<typeof DonationQuerySchema>;
