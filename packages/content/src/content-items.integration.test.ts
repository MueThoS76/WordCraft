import {
  contentItems,
  contentRevisions,
  contentTypes,
  createDb,
  eq,
  users,
  type Database,
} from "@presscraft/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createContentItem,
  deleteContentItem,
  getContentItem,
  getPublishedContentItem,
  publishContentItem,
  unpublishContentItem,
} from "./content-items.js";
import { ensureContentType } from "./content-types.js";

/**
 * Integrationstest gegen eine echte, laufende Postgres-Instanz (ADR 0015,
 * Schritt 5). Voraussetzung: `pnpm db:up` und eine gesetzte DATABASE_URL.
 * Räumt seine eigenen Testdaten in afterAll wieder auf, statt eine separate
 * Testdatenbank zu verwenden — für Meilenstein 1 bewusst einfach gehalten.
 */

const TEST_USER_ID = "99999999-9999-9999-9999-999999999999";
const TEST_CONTENT_TYPE_ID = "test-page";

describe("content items (integration)", () => {
  let db: Database;

  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL muss für Integrationstests gesetzt sein (siehe .env.example, pnpm db:up).",
      );
    }
    db = createDb(connectionString);

    await db.insert(users).values({
      id: TEST_USER_ID,
      email: "integration-test@presscraft.local",
      passwordHash: "disabled",
    });

    await ensureContentType(db, { id: TEST_CONTENT_TYPE_ID, label: "Test-Seite" });
  });

  afterAll(async () => {
    await db.delete(contentItems).where(eq(contentItems.contentTypeId, TEST_CONTENT_TYPE_ID));
    await db.delete(contentTypes).where(eq(contentTypes.id, TEST_CONTENT_TYPE_ID));
    await db.delete(users).where(eq(users.id, TEST_USER_ID));
  });

  it("creates, reads, and publishes a page, reflecting the change in the DB", async () => {
    const created = await createContentItem(db, {
      contentTypeId: TEST_CONTENT_TYPE_ID,
      slug: "integration-test-seite",
      title: "Integrationstest-Seite",
      authorId: TEST_USER_ID,
      blockBody: { schemaVersion: 1, blocks: [] },
    });
    expect(created.status).toBe("draft");
    expect(created.publishedAt).toBeNull();

    const fetched = await getContentItem(db, created.id);
    expect(fetched?.title).toBe("Integrationstest-Seite");

    // Vor der Veröffentlichung ist die Seite öffentlich noch nicht sichtbar.
    expect(
      await getPublishedContentItem(db, TEST_CONTENT_TYPE_ID, "integration-test-seite"),
    ).toBeUndefined();

    const published = await publishContentItem(db, created.id, TEST_USER_ID);
    expect(published?.status).toBe("published");
    expect(published?.publishedAt).not.toBeNull();

    // DB-Zustand direkt prüfen, nicht nur den Rückgabewert der Funktion.
    const [row] = await db.select().from(contentItems).where(eq(contentItems.id, created.id));
    expect(row.status).toBe("published");
    expect(row.publishedBlockBody).toEqual({ schemaVersion: 1, blocks: [] });

    const revisions = await db
      .select()
      .from(contentRevisions)
      .where(eq(contentRevisions.contentItemId, created.id));
    expect(revisions).toHaveLength(1);
    expect(revisions[0].statusAtSave).toBe("published");

    // Jetzt ist die Seite über die öffentliche Abfrage sichtbar.
    const publicItem = await getPublishedContentItem(
      db,
      TEST_CONTENT_TYPE_ID,
      "integration-test-seite",
    );
    expect(publicItem?.id).toBe(created.id);

    await deleteContentItem(db, created.id);
    expect(await getContentItem(db, created.id)).toBeUndefined();
  });

  it("hides a page from the public query again after unpublishing", async () => {
    const created = await createContentItem(db, {
      contentTypeId: TEST_CONTENT_TYPE_ID,
      slug: "integration-test-unpublish",
      title: "Wird wieder zum Entwurf",
      authorId: TEST_USER_ID,
    });

    await publishContentItem(db, created.id, TEST_USER_ID);
    expect(
      await getPublishedContentItem(db, TEST_CONTENT_TYPE_ID, "integration-test-unpublish"),
    ).toBeDefined();

    await unpublishContentItem(db, created.id);
    expect(
      await getPublishedContentItem(db, TEST_CONTENT_TYPE_ID, "integration-test-unpublish"),
    ).toBeUndefined();

    await deleteContentItem(db, created.id);
  });
});
