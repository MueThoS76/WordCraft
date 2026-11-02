import { z } from "zod";
import type { BlockTypeDefinition } from "./registry.js";

/**
 * Basis-Block-Typen: Absatz, Überschrift, Bild (Meilenstein 1, ADR 0015,
 * Schritt 3) sowie Liste, Zitat, Trennlinie und Button. Weitere Block-Typen
 * (Container, Spalten, …) kommen später — siehe Brief Abschnitt 4.
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

/**
 * Erlaubt nur relative Pfade und http(s)-URLs. Alles andere (z. B.
 * "javascript:" oder "data:") wird abgelehnt, damit weder Bilder noch Links
 * Skripte einschleusen können.
 */
export function isSafeUrl(url: string): boolean {
  if (url.startsWith("//")) {
    return false;
  }
  return /^\/[^\s]*$/.test(url) || /^https?:\/\/[^\s]+$/i.test(url);
}

const safeUrlSchema = z.string().refine(isSafeUrl, "Ungültige oder unsichere URL.");

export const imageAttributesSchema = z.object({
  // Leer ist erlaubt: ein frisch eingefügter Bild-Block hat noch keine Quelle.
  src: z.union([z.literal(""), safeUrlSchema]),
  alt: z.string(),
  caption: z.string().optional(),
});
export type ImageAttributes = z.infer<typeof imageAttributesSchema>;

export const imageBlockType: BlockTypeDefinition<ImageAttributes> = {
  id: "core/image",
  label: "Bild",
  attributesSchema: imageAttributesSchema,
};

export const listAttributesSchema = z.object({
  ordered: z.boolean(),
  items: z.array(z.string()).max(200),
});
export type ListAttributes = z.infer<typeof listAttributesSchema>;

export const listBlockType: BlockTypeDefinition<ListAttributes> = {
  id: "core/list",
  label: "Liste",
  attributesSchema: listAttributesSchema,
};

export const quoteAttributesSchema = z.object({
  text: z.string(),
  cite: z.string().optional(),
});
export type QuoteAttributes = z.infer<typeof quoteAttributesSchema>;

export const quoteBlockType: BlockTypeDefinition<QuoteAttributes> = {
  id: "core/quote",
  label: "Zitat",
  attributesSchema: quoteAttributesSchema,
};

export const dividerAttributesSchema = z.object({});
export type DividerAttributes = z.infer<typeof dividerAttributesSchema>;

export const dividerBlockType: BlockTypeDefinition<DividerAttributes> = {
  id: "core/divider",
  label: "Trennlinie",
  attributesSchema: dividerAttributesSchema,
};

export const buttonAttributesSchema = z.object({
  label: z.string(),
  // Leer ist erlaubt (noch nicht ausgefüllt); der Renderer zeigt dann nichts an.
  url: z.union([z.literal(""), safeUrlSchema]),
  style: z.enum(["primary", "outline"]).optional(),
});
export type ButtonAttributes = z.infer<typeof buttonAttributesSchema>;

export const buttonBlockType: BlockTypeDefinition<ButtonAttributes> = {
  id: "core/button",
  label: "Button",
  attributesSchema: buttonAttributesSchema,
};

export const coreBlockTypes: BlockTypeDefinition[] = [
  paragraphBlockType,
  headingBlockType,
  imageBlockType,
  listBlockType,
  quoteBlockType,
  dividerBlockType,
  buttonBlockType,
];
