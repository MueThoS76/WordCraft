import { pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { contentItems } from "./content.js";

/**
 * Kategorien für Beiträge (und jeden anderen Content-Typ, der sie nutzen
 * will). Die Zuordnung ist n:m über `content_item_categories`.
 */
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contentItemCategories = pgTable(
  "content_item_categories",
  {
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.contentItemId, table.categoryId] })],
);
