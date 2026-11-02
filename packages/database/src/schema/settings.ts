import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Website-weite Einstellungen als Schlüssel/Wert-Paare (jsonb). Ein Eintrag
 * pro Schlüssel, damit Plugins später eigene Schlüssel ergänzen können, ohne
 * dass sich das Schema ändert.
 */
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
