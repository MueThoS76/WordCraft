import { z } from "zod";
import type { BlockTypeDefinition } from "./registry.js";

/**
 * Die drei Basis-Block-Typen für Meilenstein 1 (ADR 0015, Schritt 3):
 * Absatz, Überschrift, Bild. Weitere Block-Typen (Container, Spalten, …)
 * kommen später — siehe Brief Abschnitt 4.
 */

export const paragraphAttributesSchema = z.object({
  text: z.string(),
});
export type ParagraphAttributes = z.infer<typeof paragraphAttributesSchema>;

export const paragraphBlockType: BlockTypeDefinition<ParagraphAttributes> = {
  id: "core/paragraph",
  label: "Absatz",
  attributesSchema: paragraphAttributesSchema,
};

export const headingAttributesSchema = z.object({
  text: z.string(),
  level: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
});
export type HeadingAttributes = z.infer<typeof headingAttributesSchema>;

export const headingBlockType: BlockTypeDefinition<HeadingAttributes> = {
  id: "core/heading",
  label: "Überschrift",
  attributesSchema: headingAttributesSchema,
};

export const imageAttributesSchema = z.object({
  src: z.string().url(),
  alt: z.string(),
  caption: z.string().optional(),
});
export type ImageAttributes = z.infer<typeof imageAttributesSchema>;

export const imageBlockType: BlockTypeDefinition<ImageAttributes> = {
  id: "core/image",
  label: "Bild",
  attributesSchema: imageAttributesSchema,
};

export const coreBlockTypes: BlockTypeDefinition[] = [
  paragraphBlockType,
  headingBlockType,
  imageBlockType,
];
