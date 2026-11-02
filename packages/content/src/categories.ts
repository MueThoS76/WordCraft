import {
  and,
  categories,
  contentItemCategories,
  contentItems,
  count,
  desc,
  eq,
  inArray,
  type Database,
} from "@presscraft/database";
import { slugify } from "./slug.js";

/**
 * Kategorien und ihre Zuordnung zu Content-Items. Framework-unabhängig
 * (ADR 0012) — die Controller in apps/server rufen nur diese Funktionen auf.
 */

export interface CategoryInput {
  name: string;
  slug?: string;
  description?: string;
}

export interface CategorySummary {
  id: string;
  slug: string;
  name: string;
}

export async function createCategory(db: Database, input: CategoryInput) {
  const slug = slugify(input.slug?.trim() || input.name);
  if (!slug) {
    throw new Error("Aus Name/Slug lässt sich kein gültiger Slug bilden.");
  }
  const [category] = await db
    .insert(categories)
    .values({ name: input.name.trim(), slug, description: input.description ?? "" })
    .returning();
  return category;
}

export async function updateCategory(db: Database, id: string, input: Partial<CategoryInput>) {
  const values: Partial<typeof categories.$inferInsert> = {};
  if (input.name !== undefined) {
    values.name = input.name.trim();
  }
  if (input.slug !== undefined) {
    values.slug = slugify(input.slug);
  }
  if (input.description !== undefined) {
    values.description = input.description;
  }
  if (Object.keys(values).length === 0) {
    const [existing] = await db.select().from(categories).where(eq(categories.id, id));
    return existing;
  }
  const [category] = await db
    .update(categories)
    .set(values)
    .where(eq(categories.id, id))
    .returning();
  return category;
}

export async function deleteCategory(db: Database, id: string): Promise<void> {
  await db.delete(categories).where(eq(categories.id, id));
}

export async function getCategoryBySlug(db: Database, slug: string) {
  const [category] = await db.select().from(categories).where(eq(categories.slug, slug));
  return category;
}

/** Alle Kategorien mit der Zahl der ihnen zugeordneten Items. */
export async function listCategoriesWithCounts(db: Database) {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      itemCount: count(contentItemCategories.contentItemId),
    })
    .from(categories)
    .leftJoin(contentItemCategories, eq(contentItemCategories.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(categories.name);
  return rows;
}

/** Ersetzt die Kategorien eines Items vollständig. Unbekannte IDs werden ignoriert. */
export async function setItemCategories(
  db: Database,
  contentItemId: string,
  categoryIds: string[],
): Promise<CategorySummary[]> {
  const unique = [...new Set(categoryIds)];
  const existing =
    unique.length > 0
      ? await db
          .select({ id: categories.id, slug: categories.slug, name: categories.name })
          .from(categories)
          .where(inArray(categories.id, unique))
      : [];

  await db.transaction(async (tx) => {
    await tx
      .delete(contentItemCategories)
      .where(eq(contentItemCategories.contentItemId, contentItemId));
    if (existing.length > 0) {
      await tx
        .insert(contentItemCategories)
        .values(existing.map((category) => ({ contentItemId, categoryId: category.id })));
    }
  });
  return existing;
}

/** Kategorien für mehrere Items auf einmal (vermeidet N+1-Abfragen). */
export async function getCategoriesForItems(
  db: Database,
  itemIds: string[],
): Promise<Map<string, CategorySummary[]>> {
  const result = new Map<string, CategorySummary[]>();
  if (itemIds.length === 0) {
    return result;
  }
  const rows = await db
    .select({
      itemId: contentItemCategories.contentItemId,
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
    })
    .from(contentItemCategories)
    .innerJoin(categories, eq(categories.id, contentItemCategories.categoryId))
    .where(inArray(contentItemCategories.contentItemId, itemIds))
    .orderBy(categories.name);

  for (const row of rows) {
    const list = result.get(row.itemId) ?? [];
    list.push({ id: row.id, slug: row.slug, name: row.name });
    result.set(row.itemId, list);
  }
  return result;
}

export interface PublishedListOptions {
  contentTypeId: string;
  categorySlug?: string;
  limit?: number;
  offset?: number;
}

/**
 * Für die öffentliche Beitragsübersicht: nur veröffentlichte Items, neueste
 * zuerst, optional gefiltert nach Kategorie. Liefert bewusst keinen Block-
 * Body, nur das, was eine Übersichtsseite braucht.
 */
export async function listPublishedItems(db: Database, options: PublishedListOptions) {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);

  const conditions = [
    eq(contentItems.contentTypeId, options.contentTypeId),
    eq(contentItems.status, "published"),
  ];

  let categoryFilterIds: string[] | undefined;
  if (options.categorySlug) {
    const category = await getCategoryBySlug(db, options.categorySlug);
    if (!category) {
      return { items: [], total: 0 };
    }
    const assigned = await db
      .select({ id: contentItemCategories.contentItemId })
      .from(contentItemCategories)
      .where(eq(contentItemCategories.categoryId, category.id));
    categoryFilterIds = assigned.map((row) => row.id);
    if (categoryFilterIds.length === 0) {
      return { items: [], total: 0 };
    }
    conditions.push(inArray(contentItems.id, categoryFilterIds));
  }

  const where = and(...conditions);
  const [{ total }] = await db.select({ total: count() }).from(contentItems).where(where);
  const rows = await db
    .select({
      id: contentItems.id,
      slug: contentItems.slug,
      title: contentItems.title,
      fieldValues: contentItems.fieldValues,
      publishedAt: contentItems.publishedAt,
    })
    .from(contentItems)
    .where(where)
    .orderBy(desc(contentItems.publishedAt))
    .limit(limit)
    .offset(offset);

  const categoriesByItem = await getCategoriesForItems(
    db,
    rows.map((row) => row.id),
  );
  return {
    total,
    items: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: typeof row.fieldValues.excerpt === "string" ? row.fieldValues.excerpt : "",
      publishedAt: row.publishedAt,
      categories: categoriesByItem.get(row.id) ?? [],
    })),
  };
}

/**
 * Öffentliche Kategorieliste: zählt nur veröffentlichte Items des Typs und
 * lässt leere Kategorien weg, damit Besucher nicht in leere Archive laufen.
 */
export async function listPublicCategories(db: Database, contentTypeId: string) {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      itemCount: count(contentItems.id),
    })
    .from(categories)
    .innerJoin(contentItemCategories, eq(contentItemCategories.categoryId, categories.id))
    .innerJoin(
      contentItems,
      and(
        eq(contentItems.id, contentItemCategories.contentItemId),
        eq(contentItems.contentTypeId, contentTypeId),
        eq(contentItems.status, "published"),
      ),
    )
    .groupBy(categories.id)
    .orderBy(categories.name);
  return rows;
}
