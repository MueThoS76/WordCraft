import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Registry für installierte Plugins/Themes (ADR 0013). In Meilenstein 1
 * angelegt, aber ungenutzt — siehe docs/decisions/0015-implementierungsplan-meilenstein-1.md.
 */

export const plugins = pgTable("plugins", {
  id: text("id").primaryKey(),
  version: text("version").notNull(),
  // Deklarierte Capabilities/Content-Typen/Blocks (ADR 0005, ADR 0012).
  manifest: jsonb("manifest").$type<Record<string, unknown>>().notNull().default({}),
  enabled: boolean("enabled").notNull().default(false),
  installedAt: timestamp("installed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const themes = pgTable("themes", {
  id: text("id").primaryKey(),
  version: text("version").notNull(),
  // Design-Tokens, Layout-Slot-Zuweisungen — reine Konfiguration (ADR 0007).
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  active: boolean("active").notNull().default(false),
  installedAt: timestamp("installed_at", { withTimezone: true }).notNull().defaultNow(),
});
