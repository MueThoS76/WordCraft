import { blockDocumentSchema } from "@presscraft/blocks";
import { z } from "zod";

export const createContentItemSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
});
export type CreateContentItemDto = z.infer<typeof createContentItemSchema>;

export const updateContentItemSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  // Strukturell validiert (ADR 0014) — nicht beliebiges JSON. Verhindert
  // u. a., dass ein ungültiger blockBody den Renderer crashen lässt.
  blockBody: blockDocumentSchema.optional(),
  fieldValues: z.record(z.unknown()).optional(),
});
export type UpdateContentItemDto = z.infer<typeof updateContentItemSchema>;

export const setCategoriesSchema = z.object({
  categoryIds: z.array(z.string().uuid()).max(100),
});
