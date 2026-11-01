import { z } from "zod";

export const createContentItemSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
});
export type CreateContentItemDto = z.infer<typeof createContentItemSchema>;

export const updateContentItemSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  blockBody: z.record(z.unknown()).optional(),
  fieldValues: z.record(z.unknown()).optional(),
});
export type UpdateContentItemDto = z.infer<typeof updateContentItemSchema>;
