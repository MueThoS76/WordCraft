import { and, contentItems, count, desc, inArray, sql, type Database } from "@presscraft/database";

/**
 * Volltextsuche über veröffentlichte Seiten und Beiträge: Titel, Auszug und
 * Inhalt. Bewusst einfach (ILIKE) — für große Seiten wäre ein Postgres-
 * Volltextindex der nächste Schritt. Durchsucht ausschließlich den
 * veröffentlichten Stand, nie Entwürfe.
 */
export const SEARCHABLE_TYPES = ["page", "post"];
export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 100;

/** Maskiert LIKE-Platzhalter, damit "50%" oder "a_b" wörtlich gesucht werden. */
export function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/** Liest den lesbaren Text aus einem Block-Dokument (für Suchtreffer-Auszüge). */
export function extractPlainText(body: unknown): string {
  const blocks =
    body && typeof body === "object" && Array.isArray((body as { blocks?: unknown[] }).blocks)
      ? ((body as { blocks: { attributes?: Record<string, unknown> }[] }).blocks ?? [])
      : [];
  const parts: string[] = [];
  for (const block of blocks) {
    const attributes = block.attributes ?? {};
    for (const key of ["text", "label", "caption", "cite"]) {
      const value = attributes[key];
      if (typeof value === "string" && value.trim()) {
        parts.push(value.trim());
      }
    }
    if (Array.isArray(attributes.items)) {
      parts.push(...attributes.items.filter((item): item is string => typeof item === "string"));
    }
  }
  return parts.join(" ");
}

/** Schneidet rund um den ersten Treffer einen kurzen Textausschnitt aus. */
export function buildSnippet(text: string, query: string, length = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= length) {
    return flat;
  }
  const index = flat.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) {
    return `${flat.slice(0, length).trimEnd()}…`;
  }
  const start = Math.max(0, index - Math.floor(length / 3));
  const end = Math.min(flat.length, start + length);
  return `${start > 0 ? "…" : ""}${flat.slice(start, end).trim()}${end < flat.length ? "…" : ""}`;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  offset?: number;
}

export async function searchPublished(db: Database, options: SearchOptions) {
  const query = options.query.trim().slice(0, MAX_QUERY_LENGTH);
  if (query.length < MIN_QUERY_LENGTH) {
    return { items: [], total: 0 };
  }
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);
  const offset = Math.max(options.offset ?? 0, 0);
  const pattern = `%${escapeLikePattern(query)}%`;

  const titleMatch = sql`${contentItems.title} ILIKE ${pattern}`;
  const excerptMatch = sql`coalesce(${contentItems.fieldValues}->>'excerpt', '') ILIKE ${pattern}`;
  const bodyMatch = sql`coalesce(${contentItems.publishedBlockBody}::text, '') ILIKE ${pattern}`;

  const where = and(
    inArray(contentItems.contentTypeId, SEARCHABLE_TYPES),
    sql`${contentItems.status} = 'published'`,
    sql`(${titleMatch} OR ${excerptMatch} OR ${bodyMatch})`,
  );

  const [{ total }] = await db.select({ total: count() }).from(contentItems).where(where);
  const rows = await db
    .select({
      id: contentItems.id,
      contentTypeId: contentItems.contentTypeId,
      slug: contentItems.slug,
      title: contentItems.title,
      fieldValues: contentItems.fieldValues,
      publishedBlockBody: contentItems.publishedBlockBody,
      publishedAt: contentItems.publishedAt,
    })
    .from(contentItems)
    .where(where)
    // Titeltreffer zuerst, dann Auszug, dann Inhalt; innerhalb davon neueste zuerst.
    .orderBy(
      sql`case when ${titleMatch} then 0 when ${excerptMatch} then 1 else 2 end`,
      desc(contentItems.publishedAt),
    )
    .limit(limit)
    .offset(offset);

  return {
    total,
    items: rows.map((row) => {
      const excerpt = typeof row.fieldValues.excerpt === "string" ? row.fieldValues.excerpt : "";
      const text = extractPlainText(row.publishedBlockBody);
      return {
        id: row.id,
        contentTypeId: row.contentTypeId,
        slug: row.slug,
        title: row.title,
        publishedAt: row.publishedAt,
        snippet: buildSnippet(excerpt || text, query),
      };
    }),
  };
}
