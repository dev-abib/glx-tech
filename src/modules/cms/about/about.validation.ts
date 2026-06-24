import z from "zod";

export const createAboutSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(300),
    description: z.string().trim().min(1, "Description is required").max(10000),
  })
  .strict();

export type CreateAboutInput = z.infer<typeof createAboutSchema>;

export const updateAboutSchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    description: z.string().trim().min(1).max(10000).optional(),
  })
  .strict();

export type UpdateAboutInput = z.infer<typeof updateAboutSchema>;
