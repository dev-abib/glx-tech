import z from "zod";

export const newsLetterSchema = z.object({
  email: z.string(),
});

export type NewsLetterInput = z.infer<typeof newsLetterSchema>;
