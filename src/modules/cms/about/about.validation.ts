import z from "zod";

// Helper to parse JSON strings from FormData into arrays
const jsonParseOptional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    },
    schema
  );

const serviceItemSchema = z.object({
  icon: z.string().trim().max(2000).optional(),
  iconPublicId: z.string().trim().max(500).optional(),
  description: z.string().trim().min(1, "Description is required").max(5000),
});

export const createAboutSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(300),
    description: z.string().trim().min(1, "Description is required").max(10000),
    highlightText: z.string().trim().max(500).optional(),
    services: jsonParseOptional(z.array(serviceItemSchema).optional()),
  })
  .strict();

export type CreateAboutInput = z.infer<typeof createAboutSchema>;

export const updateAboutSchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    description: z.string().trim().min(1).max(10000).optional(),
    highlightText: z.string().trim().max(500).optional(),
    services: jsonParseOptional(z.array(serviceItemSchema).optional()),
  })
  .strict();

export type UpdateAboutInput = z.infer<typeof updateAboutSchema>;
