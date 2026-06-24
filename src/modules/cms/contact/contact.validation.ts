import z from "zod";

// ── Contact Inquiry Schemas ───────────────────────────────────────────────

export const createContactSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    email: z.string().trim().email("Valid email is required"),
    phone: z.string().trim().max(30).optional(),
    subject: z.string().trim().max(200).optional(),
    message: z.string().trim().min(1, "Message is required").max(5000),
  })
  .strict();

export type CreateContactInput = z.infer<typeof createContactSchema>;

export const replyContactSchema = z
  .object({
    replyMessage: z
      .string()
      .trim()
      .min(1, "Reply message is required")
      .max(5000),
  })
  .strict();

export type ReplyContactInput = z.infer<typeof replyContactSchema>;
