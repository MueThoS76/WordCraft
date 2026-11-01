import { z } from "zod";

/**
 * Das zentrale Datenformat für Seiteninhalte — siehe
 * docs/decisions/0014-api-vertraege.md.
 */

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

export interface BlockNode {
  id: string;
  type: string;
  attributes: Record<string, JsonValue>;
  children?: BlockNode[];
}

export const blockNodeSchema: z.ZodType<BlockNode> = z.lazy(() =>
  z.object({
    id: z.string().uuid(),
    type: z.string().min(1),
    attributes: z.record(jsonValueSchema),
    children: z.array(blockNodeSchema).optional(),
  }),
);

export interface BlockDocument {
  schemaVersion: number;
  blocks: BlockNode[];
}

export const blockDocumentSchema: z.ZodType<BlockDocument> = z.object({
  schemaVersion: z.number().int().positive(),
  blocks: z.array(blockNodeSchema),
});
