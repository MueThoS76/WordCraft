import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { count, desc, eq, mediaItems, sql, type Database } from "@presscraft/database";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, detectImageType } from "./validate-image.js";

/**
 * Framework-unabhängige Medienlogik (ADR 0012: packages/media kennt kein
 * NestJS). Dateien liegen im Dateisystem unter `storageDir`, die Metadaten
 * in der Tabelle `media_items`.
 */

export class MediaValidationError extends Error {}

const STORED_NAME_PATTERN = /^[0-9a-f-]{36}\.(png|jpg|gif|webp)$/;

export function isValidStoredName(name: string): boolean {
  return STORED_NAME_PATTERN.test(name);
}

export function resolveStoredPath(storageDir: string, storedName: string): string {
  if (!isValidStoredName(storedName)) {
    throw new MediaValidationError("Ungültiger Dateiname.");
  }
  return path.join(storageDir, storedName);
}

export interface UploadMediaInput {
  storageDir: string;
  originalName: string;
  data: Buffer;
  uploadedBy: string;
}

export async function uploadMedia(db: Database, input: UploadMediaInput) {
  if (input.data.length === 0) {
    throw new MediaValidationError("Die Datei ist leer.");
  }
  if (input.data.length > MAX_UPLOAD_BYTES) {
    throw new MediaValidationError(
      `Die Datei ist zu groß (maximal ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).`,
    );
  }
  const mimeType = detectImageType(input.data);
  if (!mimeType) {
    throw new MediaValidationError("Nur PNG, JPEG, GIF und WebP werden unterstützt.");
  }

  const storedName = `${randomUUID()}.${ALLOWED_IMAGE_TYPES[mimeType]}`;
  await fs.mkdir(input.storageDir, { recursive: true });
  await fs.writeFile(resolveStoredPath(input.storageDir, storedName), input.data);

  try {
    const [item] = await db
      .insert(mediaItems)
      .values({
        storedName,
        // Nur der Dateiname ohne Pfadanteile, auf sinnvolle Länge begrenzt.
        originalName: path.basename(input.originalName).slice(0, 200) || "unbenannt",
        mimeType,
        sizeBytes: input.data.length,
        uploadedBy: input.uploadedBy,
      })
      .returning();
    return item;
  } catch (error) {
    // Datei nicht verwaist liegen lassen, wenn der DB-Eintrag scheitert.
    await fs.rm(resolveStoredPath(input.storageDir, storedName), { force: true });
    throw error;
  }
}

export async function listMedia(db: Database) {
  return await db.select().from(mediaItems).orderBy(desc(mediaItems.createdAt));
}

export async function getMedia(db: Database, id: string) {
  const [item] = await db.select().from(mediaItems).where(eq(mediaItems.id, id));
  return item;
}

export async function getMediaByStoredName(db: Database, storedName: string) {
  const [item] = await db.select().from(mediaItems).where(eq(mediaItems.storedName, storedName));
  return item;
}

export async function updateMediaAltText(db: Database, id: string, altText: string) {
  const [item] = await db
    .update(mediaItems)
    .set({ altText })
    .where(eq(mediaItems.id, id))
    .returning();
  return item;
}

export async function deleteMedia(db: Database, storageDir: string, id: string) {
  const [item] = await db.delete(mediaItems).where(eq(mediaItems.id, id)).returning();
  if (item) {
    await fs.rm(resolveStoredPath(storageDir, item.storedName), { force: true });
  }
  return item;
}

/** Kennzahlen für das Admin-Dashboard. */
export async function getMediaStats(db: Database) {
  const [row] = await db
    .select({
      total: count(),
      totalBytes: sql<number>`coalesce(sum(${mediaItems.sizeBytes}), 0)::int`,
    })
    .from(mediaItems);
  return { count: row.total, totalBytes: row.totalBytes };
}
