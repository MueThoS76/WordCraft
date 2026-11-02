import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createDb, eq, mediaItems, users, type Database } from "@presscraft/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  MediaValidationError,
  deleteMedia,
  getMedia,
  isValidStoredName,
  listMedia,
  updateMediaAltText,
  uploadMedia,
} from "./media-items.js";

/**
 * Integrationstest gegen eine echte Postgres-Instanz (wie packages/content).
 * Räumt seine Testdaten und das temporäre Speicherverzeichnis selbst auf.
 */

// Zufällig statt fest: Andere Testdateien laufen parallel (Turbo) gegen dieselbe
// Datenbank, feste IDs würden kollidieren.
const TEST_USER_ID = randomUUID();
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);

describe("media items (integration)", () => {
  let db: Database;
  let storageDir: string;

  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL muss für Integrationstests gesetzt sein.");
    }
    db = createDb(connectionString);
    storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "presscraft-media-"));
    await db.insert(users).values({
      id: TEST_USER_ID,
      email: `media-test-${TEST_USER_ID}@presscraft.local`,
      passwordHash: "disabled",
    });
  });

  afterAll(async () => {
    await db.delete(mediaItems).where(eq(mediaItems.uploadedBy, TEST_USER_ID));
    await db.delete(users).where(eq(users.id, TEST_USER_ID));
    await fs.rm(storageDir, { recursive: true, force: true });
  });

  it("speichert Datei und Metadaten, listet, aktualisiert und löscht", async () => {
    const item = await uploadMedia(db, {
      storageDir,
      originalName: "../../etc/Katze.png",
      data: PNG,
      uploadedBy: TEST_USER_ID,
    });

    expect(item.mimeType).toBe("image/png");
    expect(item.originalName).toBe("Katze.png");
    expect(isValidStoredName(item.storedName)).toBe(true);
    expect((await fs.readFile(path.join(storageDir, item.storedName))).equals(PNG)).toBe(true);

    expect((await listMedia(db)).some((entry) => entry.id === item.id)).toBe(true);

    const updated = await updateMediaAltText(db, item.id, "Eine Katze");
    expect(updated?.altText).toBe("Eine Katze");

    await deleteMedia(db, storageDir, item.id);
    expect(await getMedia(db, item.id)).toBeUndefined();
    await expect(fs.access(path.join(storageDir, item.storedName))).rejects.toThrow();
  });

  it("lehnt Nicht-Bilder und leere Dateien ab", async () => {
    await expect(
      uploadMedia(db, {
        storageDir,
        originalName: "x.png",
        data: Buffer.from("<svg></svg>"),
        uploadedBy: TEST_USER_ID,
      }),
    ).rejects.toBeInstanceOf(MediaValidationError);
    await expect(
      uploadMedia(db, {
        storageDir,
        originalName: "x.png",
        data: Buffer.alloc(0),
        uploadedBy: TEST_USER_ID,
      }),
    ).rejects.toBeInstanceOf(MediaValidationError);
  });

  it("akzeptiert nur selbst erzeugte Dateinamen (kein Path Traversal)", () => {
    expect(isValidStoredName("../secret.png")).toBe(false);
    expect(isValidStoredName("11111111-1111-1111-1111-111111111111.png")).toBe(true);
  });
});
