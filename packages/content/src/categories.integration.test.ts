import { randomUUID } from "node:crypto";
import {
  categories,
  contentItems,
  contentTypes,
  createDb,
  eq,
  users,
  type Database,
} from "@presscraft/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createCategory,
  deleteCategory,
  getCategoriesForItems,
  listCategoriesWithCounts,
  listPublishedItems,
  setItemCategories,
  updateCategory,
} from "./categories.js";
import { createContentItem, publishContentItem } from "./content-items.js";
import { ensureContentType } from "./content-types.js";

// Zufällig statt fest: Andere Testdateien laufen parallel (Turbo) gegen dieselbe
// Datenbank, feste IDs würden kollidieren.
const TEST_USER_ID = randomUUID();
const TEST_TYPE_ID = "test-post";

describe("categories (integration)", () => {
  let db: Database;
  const categoryIds: string[] = [];

  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL muss für Integrationstests gesetzt sein.");
    }
    db = createDb(connectionString);
    await db.insert(users).values({
      id: TEST_USER_ID,
      email: `categories-test-${TEST_USER_ID}@presscraft.local`,
      passwordHash: "disabled",
    });
    await ensureContentType(db, { id: TEST_TYPE_ID, label: "Test-Beitrag" });
  });

  afterAll(async () => {
    await db.delete(contentItems).where(eq(contentItems.authorId, TEST_USER_ID));
    for (const id of categoryIds) {
      await db.delete(categories).where(eq(categories.id, id));
    }
    await db.delete(contentTypes).where(eq(contentTypes.id, TEST_TYPE_ID));
    await db.delete(users).where(eq(users.id, TEST_USER_ID));
  });

  it("legt Kategorien an (Slug aus Name), benennt um und löscht", async () => {
    const category = await createCategory(db, { name: "Größe & Übung" });
    categoryIds.push(category.id);
    expect(category.slug).toBe("groesse-uebung");

    const renamed = await updateCategory(db, category.id, { name: "Neu" });
    expect(renamed?.name).toBe("Neu");
    expect(renamed?.slug).toBe("groesse-uebung");

    const temporary = await createCategory(db, { name: "Temporär" });
    await deleteCategory(db, temporary.id);
    const all = await listCategoriesWithCounts(db);
    expect(all.some((entry) => entry.id === temporary.id)).toBe(false);
  });

  it("ordnet Items Kategorien zu und filtert die öffentliche Liste", async () => {
    const news = await createCategory(db, { name: "Test News" });
    const tips = await createCategory(db, { name: "Test Tipps" });
    categoryIds.push(news.id, tips.id);

    const first = await createContentItem(db, {
      contentTypeId: TEST_TYPE_ID,
      slug: "erster",
      title: "Erster",
      authorId: TEST_USER_ID,
      fieldValues: { excerpt: "Kurztext eins" },
    });
    const second = await createContentItem(db, {
      contentTypeId: TEST_TYPE_ID,
      slug: "zweiter",
      title: "Zweiter",
      authorId: TEST_USER_ID,
    });
    const draft = await createContentItem(db, {
      contentTypeId: TEST_TYPE_ID,
      slug: "entwurf",
      title: "Entwurf",
      authorId: TEST_USER_ID,
    });

    await setItemCategories(db, first.id, [
      news.id,
      tips.id,
      "00000000-0000-0000-0000-000000000000",
    ]);
    await setItemCategories(db, second.id, [tips.id]);
    await setItemCategories(db, draft.id, [news.id]);
    await publishContentItem(db, first.id, TEST_USER_ID);
    await publishContentItem(db, second.id, TEST_USER_ID);

    const map = await getCategoriesForItems(db, [first.id, second.id]);
    expect(
      map
        .get(first.id)
        ?.map((c) => c.slug)
        .sort(),
    ).toEqual(["test-news", "test-tipps"]);

    const all = await listPublishedItems(db, { contentTypeId: TEST_TYPE_ID });
    expect(all.total).toBe(2);
    expect(all.items[0].title).toBe("Zweiter"); // neuester zuerst
    expect(all.items.find((item) => item.id === first.id)?.excerpt).toBe("Kurztext eins");

    const onlyNews = await listPublishedItems(db, {
      contentTypeId: TEST_TYPE_ID,
      categorySlug: "test-news",
    });
    // Der Entwurf in "Test News" darf nicht auftauchen.
    expect(onlyNews.items.map((item) => item.title)).toEqual(["Erster"]);

    const unknown = await listPublishedItems(db, {
      contentTypeId: TEST_TYPE_ID,
      categorySlug: "gibt-es-nicht",
    });
    expect(unknown).toEqual({ items: [], total: 0 });

    // Zuordnung ersetzen statt ergänzen.
    await setItemCategories(db, first.id, []);
    expect((await getCategoriesForItems(db, [first.id])).get(first.id)).toBeUndefined();
  });
});
