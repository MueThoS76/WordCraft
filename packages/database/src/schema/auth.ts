import { boolean, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Siehe docs/decisions/0013-minimales-datenmodell.md und
 * docs/decisions/0006-rechte-und-rollenmodell.md.
 */

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  totpSecret: text("totp_secret"),
  totpRecoveryCodes: jsonb("totp_recovery_codes").$type<string[]>(),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groups = pgTable("groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  // Erzwingt 2FA für Mitglieder dieser Gruppe (ADR 0006).
  require2fa: boolean("require_2fa").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userGroups = pgTable(
  "user_groups",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.groupId] })],
);

export const capabilities = pgTable("capabilities", {
  // z. B. "content.page.edit" — von Core oder einem Plugin deklariert (ADR 0006).
  id: text("id").primaryKey(),
  providedBy: text("provided_by").notNull().default("core"),
  description: text("description"),
});

export const groupCapabilities = pgTable(
  "group_capabilities",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    capabilityId: text("capability_id")
      .notNull()
      .references(() => capabilities.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.groupId, table.capabilityId] })],
);

export const sessions = pgTable("sessions", {
  // Opaker Session-Token, kein JWT (ADR 0013: sofortige Widerrufbarkeit).
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Prüft den pro-Gruppe erzwingbaren 2FA-Schritt im Login-Flow (ADR 0006).
  twoFactorVerified: boolean("two_factor_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
