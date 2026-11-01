import type { BlockDocument } from "@presscraft/blocks";
import { jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth.js";

const EMPTY_BLOCK_DOCUMENT: BlockDocument = { schemaVersion: 1, blocks: [] };

/**
 * Siehe docs/decisions/0013-minimales-datenmodell.md,
 * docs/decisions/0008-content-typ-system.md und
 * docs/decisions/0009-redaktions-workflow.md.
 */

export const contentStatusEnum = pgEnum("content_status", ["draft", "published"]);

export const contentTypes = pgTable("content_types", {
  // z. B. "page" — generisches, erweiterbares Typ-System (ADR 0008).
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  providedBy: text("provided_by").notNull().default("core"),
  // Definition der typisierten Felder dieses Typs (ADR 0008).
  // TODO: sobald packages/blocks existiert (Implementierungsschritt 3), auf ein
  // konkretes Feld-Schema-Typ statt Record<string, unknown> umstellen.
  fieldSchema: jsonb("field_schema").$type<Record<string, unknown>>().notNull().default({}),
});

export const contentItems = pgTable(
  "content_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentTypeId: text("content_type_id")
      .notNull()
      .references(() => contentTypes.id),
    slug: text("slug").notNull(),
    status: contentStatusEnum("status").notNull().default("draft"),
    title: text("title").notNull(),
    // Aktueller Entwurf. Default ist ein gültiges, leeres BlockDocument, nie
    // "{}" — sonst crasht der Renderer beim ersten Rendern (siehe Bugfix).
    blockBody: jsonb("block_body").$type<BlockDocument>().notNull().default(EMPTY_BLOCK_DOCUMENT),
    // Letzter veröffentlichter Stand — null, solange nie veröffentlicht (ADR 0009).
    publishedBlockBody: jsonb("published_block_body").$type<BlockDocument | null>(),
    // Werte passend zum field_schema des Content-Typs (ADR 0008).
    fieldValues: jsonb("field_values").$type<Record<string, unknown>>().notNull().default({}),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("content_items_type_slug_idx").on(table.contentTypeId, table.slug)],
);

export const contentRevisions = pgTable("content_revisions", {
  // Noch ohne Browsing-UI in Meilenstein 1, aber Struktur ist bereits
  // revisionsfähig angelegt (ADR 0009).
  id: uuid("id").defaultRandom().primaryKey(),
  contentItemId: uuid("content_item_id")
    .notNull()
    .references(() => contentItems.id, { onDelete: "cascade" }),
  blockBody: jsonb("block_body").$type<BlockDocument>().notNull(),
  fieldValues: jsonb("field_values").$type<Record<string, unknown>>().notNull(),
  statusAtSave: contentStatusEnum("status_at_save").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
