import type { BlockDocument } from "@presscraft/blocks";
import { and, contentItems, contentRevisions, eq, type Database } from "@presscraft/database";

const EMPTY_BLOCK_DOCUMENT: BlockDocument = { schemaVersion: 1, blocks: [] };

/**
 * Framework-unabhängige Content-Item-Logik (ADR 0012: packages/content kennt
 * kein NestJS — die Controller in apps/server rufen diese Funktionen nur
 * auf). Siehe docs/decisions/0009-redaktions-workflow.md für den
 * Entwurf/Veröffentlicht-Workflow.
 */

export interface CreateContentItemInput {
  contentTypeId: string;
  slug: string;
  title: string;
  authorId: string;
  blockBody?: BlockDocument;
  fieldValues?: Record<string, unknown>;
}

export async function createContentItem(db: Database, input: CreateContentItemInput) {
  const [item] = await db
    .insert(contentItems)
    .values({
      contentTypeId: input.contentTypeId,
      slug: input.slug,
      title: input.title,
      authorId: input.authorId,
      blockBody: input.blockBody ?? EMPTY_BLOCK_DOCUMENT,
      fieldValues: input.fieldValues ?? {},
      status: "draft",
    })
    .returning();
  return item;
}

export async function getContentItem(db: Database, id: string) {
  const [item] = await db.select().from(contentItems).where(eq(contentItems.id, id));
  return item;
}

export async function listContentItems(db: Database, contentTypeId: string) {
  return await db.select().from(contentItems).where(eq(contentItems.contentTypeId, contentTypeId));
}

export interface UpdateContentItemInput {
  title?: string;
  slug?: string;
  blockBody?: BlockDocument;
  fieldValues?: Record<string, unknown>;
}

export async function updateContentItem(db: Database, id: string, input: UpdateContentItemInput) {
  const [item] = await db
    .update(contentItems)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(contentItems.id, id))
    .returning();
  return item;
}

export async function deleteContentItem(db: Database, id: string): Promise<void> {
  await db.delete(contentItems).where(eq(contentItems.id, id));
}

/**
 * Setzt den Draft-Block-Body als neuen veröffentlichten Stand, speichert
 * eine Revision (ADR 0009) und markiert den Status als "published".
 */
export async function publishContentItem(db: Database, id: string, publishedBy: string) {
  const item = await getContentItem(db, id);
  if (!item) {
    return undefined;
  }

  const now = new Date();
  const [published] = await db
    .update(contentItems)
    .set({
      status: "published",
      publishedBlockBody: item.blockBody,
      publishedAt: now,
      updatedAt: now,
    })
    .where(eq(contentItems.id, id))
    .returning();

  await db.insert(contentRevisions).values({
    contentItemId: id,
    blockBody: item.blockBody,
    fieldValues: item.fieldValues,
    statusAtSave: "published",
    createdBy: publishedBy,
  });

  return published;
}

export async function unpublishContentItem(db: Database, id: string) {
  const [item] = await db
    .update(contentItems)
    .set({ status: "draft", updatedAt: new Date() })
    .where(eq(contentItems.id, id))
    .returning();
  return item;
}

/**
 * Für die öffentliche API (ADR 0014): liefert ausschließlich den
 * veröffentlichten Stand, nie einen Entwurf — serverseitig erzwungen.
 */
export async function getPublishedContentItem(db: Database, contentTypeId: string, slug: string) {
  const [item] = await db
    .select()
    .from(contentItems)
    .where(
      and(
        eq(contentItems.contentTypeId, contentTypeId),
        eq(contentItems.slug, slug),
        eq(contentItems.status, "published"),
      ),
    );
  return item;
}
