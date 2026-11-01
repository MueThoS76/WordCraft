import type { ComponentType } from "react";
import { Heading } from "./blocks/Heading.js";
import { Image } from "./blocks/Image.js";
import { Paragraph } from "./blocks/Paragraph.js";

/**
 * Gemeinsamer Rendering-Vertrag (ADR 0003, ADR 0012, ADR 0014): dieselben
 * Komponenten rendert `apps/web` als Astro-Island und `apps/admin` als
 * Live-Vorschau im Editor. Plugins registrieren hier künftig ihre eigenen
 * Block-Typen.
 */
export type BlockRenderer = ComponentType<Record<string, unknown>>;

export const blockRenderers: Record<string, BlockRenderer> = {
  "core/paragraph": Paragraph as BlockRenderer,
  "core/heading": Heading as BlockRenderer,
  "core/image": Image as BlockRenderer,
};
