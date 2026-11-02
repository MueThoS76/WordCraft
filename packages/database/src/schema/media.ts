import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth.js";

/**
 * Metadaten der Medienbibliothek. Die Datei selbst liegt im Dateisystem
 * (siehe packages/media), die Datenbank hält nur Verweis und Beschreibung.
 */
export const mediaItems = pgTable("media_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Name der gespeicherten Datei (UUID + Endung), nie der Originalname —
  // so gibt es keine Namenskollisionen und keine Pfad-Tricks.
  storedName: text("stored_name").notNull().unique(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  altText: text("alt_text").notNull().default(""),
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
