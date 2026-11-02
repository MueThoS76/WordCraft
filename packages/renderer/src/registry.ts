import type { ComponentType } from "react";
import { Button } from "./blocks/Button.js";
import { Divider } from "./blocks/Divider.js";
import { Heading } from "./blocks/Heading.js";
import { Image } from "./blocks/Image.js";
import { List } from "./blocks/List.js";
import { Paragraph } from "./blocks/Paragraph.js";
import { Quote } from "./blocks/Quote.js";

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
  "core/list": List as BlockRenderer,
  "core/quote": Quote as BlockRenderer,
  "core/divider": Divider as BlockRenderer,
  "core/button": Button as BlockRenderer,
};
