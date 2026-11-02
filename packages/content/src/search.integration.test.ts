import { contentItems, createDb, eq, users, type Database } from "@presscraft/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createContentItem, publishContentItem, saveContentItem } from "./content-items.js";
import { ensureContentType } from "./content-types.js";
import { buildSnippet, escapeLikePattern, extractPlainText, searchPublished } from "./search.js";

const TEST_USER_ID = "55555555-5555-5555-5555-555555555555";

function body(text: string) {
  return {
    schemaVersion: 1 as const,
    blocks: [
      { id: "123e4567-e89b-12d3-a456-426614174201", type: "core/paragraph", attributes: { text } },
    ],
  };
}

describe("search", () => {
  it("maskiert LIKE-Platzhalter und baut Textausschnitte", () => {
    expect(escapeLikePattern("50%_a\\b")).toBe("50\\%\\_a\\\\b");
    const text = "x".repeat(200) + " Treffer hier " + "y".repeat(200);
    const snippet = buildSnippet(text, "treffer");
    expect(snippet).toContain("Treffer hier");
    expect(snippet.startsWith("…")).toBe(true);
    expect(snippet.length).toBeLessThan(200);
    expect(
      extractPlainText({
        blocks: [
          { attributes: { text: "A" } },
          { attributes: { items: ["B", "C"] } },
          { attributes: { label: "D" } },
        ],
      }),
    ).toBe("A B C D");
  });

  describe("(integration)", () => {
    let db: Database;

    beforeAll(async () => {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error("DATABASE_URL muss für Integrationstests gesetzt sein.");
      }
      db = createDb(connectionString);
      await db.insert(users).values({
        id: TEST_USER_ID,
        email: "search-test@presscraft.local",
        passwordHash: "disabled",
      });
      await ensureContentType(db, { id: "page", label: "Seite" });
    });

    afterAll(async () => {
      await db.delete(contentItems).where(eq(contentItems.authorId, TEST_USER_ID));
      await db.delete(users).where(eq(users.id, TEST_USER_ID));
    });

    it("findet Titel, Auszug und Inhalt, rankt Titel zuerst und ignoriert Entwürfe", async () => {
      const make = async (slug: string, title: string, text: string, publish: boolean) => {
        const item = await createContentItem(db, {
          contentTypeId: "page",
          slug,
          title,
          authorId: TEST_USER_ID,
        });
        await saveContentItem(db, item.id, { blockBody: body(text) }, TEST_USER_ID);
        if (publish) {
          await publishContentItem(db, item.id, TEST_USER_ID);
        }
        return item;
      };
      await make("such-a", "Quasselstrippe im Titel", "irgendein Text", true);
      await make("such-b", "Anderer Titel", "Hier steht Quasselstrippe im Inhalt.", true);
      await make("such-c", "Quasselstrippe als Entwurf", "geheim", false);
      await make("such-d", "50% Rabatt", "Prozentzeichen wörtlich", true);

      const result = await searchPublished(db, { query: "quasselstrippe" });
      expect(result.total).toBe(2);
      expect(result.items.map((item) => item.slug)).toEqual(["such-a", "such-b"]);
      expect(result.items[1].snippet).toContain("Quasselstrippe");

      // Platzhalter werden nicht interpretiert: "%" findet nur das echte Prozentzeichen.
      const percent = await searchPublished(db, { query: "50%" });
      expect(percent.items.map((item) => item.slug)).toEqual(["such-d"]);
      // Als Platzhalter interpretiert würde "%_" fast alles treffen.
      expect((await searchPublished(db, { query: "%_" })).total).toBe(0);

      expect(await searchPublished(db, { query: "a" })).toEqual({ items: [], total: 0 });
      expect((await searchPublished(db, { query: "gibtesnicht" })).total).toBe(0);
    });
  });
});
