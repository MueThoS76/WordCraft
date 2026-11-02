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
import { createContentItem, publishContentItem, saveContentItem } from "./content-items.js";
import { ensureContentType } from "./content-types.js";
import {
  DRAFT_REVISION_WINDOW_MS,
  MAX_REVISIONS_PER_ITEM,
  listRevisions,
  recordDraftRevision,
  restoreRevision,
} from "./revisions.js";

const TEST_USER_ID = "66666666-6666-6666-6666-666666666666";
const TEST_TYPE_ID = "test-revisions";

function body(text: string) {
  return {
    schemaVersion: 1 as const,
    blocks: [
      {
        id: "123e4567-e89b-12d3-a456-426614174001",
        type: "core/paragraph",
        attributes: { text },
      },
    ],
  };
}

describe("revisions (integration)", () => {
  let db: Database;

  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL muss für Integrationstests gesetzt sein.");
    }
    db = createDb(connectionString);
    await db.insert(users).values({
      id: TEST_USER_ID,
      email: "revisions-test@presscraft.local",
      passwordHash: "disabled",
    });
    await ensureContentType(db, { id: TEST_TYPE_ID, label: "Test-Revisionen" });
  });

  afterAll(async () => {
    await db.delete(contentItems).where(eq(contentItems.authorId, TEST_USER_ID));
    await db.delete(contentTypes).where(eq(contentTypes.id, TEST_TYPE_ID));
    await db.delete(users).where(eq(users.id, TEST_USER_ID));
  });

  async function newItem(slug: string) {
    return createContentItem(db, {
      contentTypeId: TEST_TYPE_ID,
      slug,
      title: slug,
      authorId: TEST_USER_ID,
    });
  }

  it("fasst schnelle Autosaves zu einer Revision zusammen und ignoriert unveränderte Stände", async () => {
    const item = await newItem("coalesce");
    await saveContentItem(db, item.id, { blockBody: body("a") }, TEST_USER_ID);
    await saveContentItem(db, item.id, { blockBody: body("ab") }, TEST_USER_ID);
    await saveContentItem(db, item.id, { blockBody: body("abc") }, TEST_USER_ID);
    await saveContentItem(db, item.id, { blockBody: body("abc") }, TEST_USER_ID);
    // Reiner Titelwechsel erzeugt keine Revision.
    await saveContentItem(db, item.id, { title: "neuer Titel" }, TEST_USER_ID);

    const revisions = await listRevisions(db, item.id);
    expect(revisions).toHaveLength(1);
    expect(revisions[0]).toMatchObject({ statusAtSave: "draft", snippet: "abc", blockCount: 1 });
  });

  it("beginnt nach dem Zeitfenster und nach einer Veröffentlichung eine neue Revision", async () => {
    const item = await newItem("window");
    const longAgo = new Date(Date.now() - DRAFT_REVISION_WINDOW_MS - 1000);
    await recordDraftRevision(db, { ...item, blockBody: body("alt") }, TEST_USER_ID, {
      now: longAgo,
    });
    await saveContentItem(db, item.id, { blockBody: body("neu") }, TEST_USER_ID);
    expect(await listRevisions(db, item.id)).toHaveLength(2);

    await publishContentItem(db, item.id, TEST_USER_ID);
    await saveContentItem(db, item.id, { blockBody: body("nach Veröffentlichung") }, TEST_USER_ID);
    const revisions = await listRevisions(db, item.id);
    expect(revisions.map((revision) => revision.statusAtSave)).toEqual([
      "draft",
      "published",
      "draft",
      "draft",
    ]);
  });

  it("stellt wieder her, sichert vorher den aktuellen Stand und lässt Veröffentlichtes unberührt", async () => {
    const item = await newItem("restore");
    await saveContentItem(db, item.id, { blockBody: body("Version 1") }, TEST_USER_ID);
    await publishContentItem(db, item.id, TEST_USER_ID);
    await saveContentItem(db, item.id, { blockBody: body("Version 2") }, TEST_USER_ID);

    const before = await listRevisions(db, item.id);
    const published = before.find((revision) => revision.statusAtSave === "published")!;

    const restored = await restoreRevision(db, item.id, published.id, TEST_USER_ID);
    expect(restored?.blockBody).toEqual(body("Version 1"));
    // Veröffentlichter Stand bleibt wie er war.
    expect(restored?.publishedBlockBody).toEqual(body("Version 1"));

    const after = await listRevisions(db, item.id);
    // "Version 2" war schon als Revision gesichert, es kommt keine Dublette dazu.
    expect(after).toHaveLength(before.length);
    // "Version 2" ist weiterhin im Verlauf auffindbar.
    expect(after.some((revision) => revision.snippet === "Version 2")).toBe(true);

    expect(
      await restoreRevision(db, item.id, "00000000-0000-0000-0000-000000000000", TEST_USER_ID),
    ).toBeUndefined();
  });

  it("begrenzt den Verlauf pro Item", async () => {
    const item = await newItem("prune");
    for (let index = 0; index < MAX_REVISIONS_PER_ITEM + 5; index += 1) {
      await recordDraftRevision(db, { ...item, blockBody: body(`v${index}`) }, TEST_USER_ID, {
        forceNew: true,
      });
    }
    const rows = await db
      .select()
      .from(contentRevisions)
      .where(eq(contentRevisions.contentItemId, item.id));
    expect(rows).toHaveLength(MAX_REVISIONS_PER_ITEM);
  });
});
