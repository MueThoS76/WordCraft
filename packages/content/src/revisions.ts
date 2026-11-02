import type { BlockDocument } from "@presscraft/blocks";
import {
  contentItems,
  contentRevisions,
  desc,
  eq,
  and,
  inArray,
  users,
  type Database,
} from "@presscraft/database";

/**
 * Revisionsverlauf (ADR 0009). Veröffentlichungen schreiben immer eine
 * Revision (siehe publishContentItem). Zwischenstände beim Bearbeiten werden
 * zusammengefasst, damit das Autosave nicht pro Tastendruck eine Revision
 * erzeugt: Innerhalb von DRAFT_REVISION_WINDOW_MS wird die letzte
 * Entwurfs-Revision desselben Nutzers fortgeschrieben, danach beginnt eine
 * neue. Pro Item bleiben höchstens MAX_REVISIONS_PER_ITEM erhalten.
 */
export const DRAFT_REVISION_WINDOW_MS = 5 * 60 * 1000;
export const MAX_REVISIONS_PER_ITEM = 50;

type ItemState = {
  id: string;
  blockBody: BlockDocument;
  fieldValues: Record<string, unknown>;
};

function sameContent(
  a: { blockBody: unknown; fieldValues: unknown },
  b: { blockBody: unknown; fieldValues: unknown },
): boolean {
  return (
    JSON.stringify(a.blockBody) === JSON.stringify(b.blockBody) &&
    JSON.stringify(a.fieldValues) === JSON.stringify(b.fieldValues)
  );
}

async function pruneRevisions(db: Database, itemId: string): Promise<void> {
  const rows = await db
    .select({ id: contentRevisions.id })
    .from(contentRevisions)
    .where(eq(contentRevisions.contentItemId, itemId))
    .orderBy(desc(contentRevisions.createdAt));
  const obsolete = rows.slice(MAX_REVISIONS_PER_ITEM).map((row) => row.id);
  if (obsolete.length > 0) {
    await db.delete(contentRevisions).where(inArray(contentRevisions.id, obsolete));
  }
}

/**
 * Hält den aktuellen Entwurfsstand im Verlauf fest.
 * `forceNew` überspringt das Zusammenfassen (z. B. vor einer Wiederherstellung,
 * damit der bisherige Stand sicher erhalten bleibt).
 */
export async function recordDraftRevision(
  db: Database,
  item: ItemState,
  userId: string,
  options: { forceNew?: boolean; now?: Date } = {},
): Promise<void> {
  const now = options.now ?? new Date();
  const [latest] = await db
    .select()
    .from(contentRevisions)
    .where(eq(contentRevisions.contentItemId, item.id))
    .orderBy(desc(contentRevisions.createdAt))
    .limit(1);

  if (latest && sameContent(latest, item)) {
    return;
  }

  const canCoalesce =
    !options.forceNew &&
    latest &&
    latest.statusAtSave === "draft" &&
    latest.createdBy === userId &&
    now.getTime() - latest.createdAt.getTime() < DRAFT_REVISION_WINDOW_MS;

  if (canCoalesce) {
    await db
      .update(contentRevisions)
      .set({ blockBody: item.blockBody, fieldValues: item.fieldValues })
      .where(eq(contentRevisions.id, latest.id));
    return;
  }

  await db.insert(contentRevisions).values({
    contentItemId: item.id,
    blockBody: item.blockBody,
    fieldValues: item.fieldValues,
    statusAtSave: "draft",
    createdBy: userId,
    createdAt: now,
  });
  await pruneRevisions(db, item.id);
}

/** Kurzvorschau für die Verlaufsliste: Blockzahl und erster Text. */
export function summarizeBlockBody(body: unknown): { blockCount: number; snippet: string } {
  const blocks =
    body && typeof body === "object" && Array.isArray((body as BlockDocument).blocks)
      ? (body as BlockDocument).blocks
      : [];
  let snippet = "";
  for (const block of blocks) {
    const text = (block.attributes as Record<string, unknown>)?.text;
    if (typeof text === "string" && text.trim()) {
      snippet = text.trim().slice(0, 80);
      break;
    }
  }
  return { blockCount: blocks.length, snippet };
}

export async function listRevisions(db: Database, itemId: string) {
  const rows = await db
    .select({
      id: contentRevisions.id,
      statusAtSave: contentRevisions.statusAtSave,
      createdAt: contentRevisions.createdAt,
      createdByEmail: users.email,
      blockBody: contentRevisions.blockBody,
    })
    .from(contentRevisions)
    .leftJoin(users, eq(users.id, contentRevisions.createdBy))
    .where(eq(contentRevisions.contentItemId, itemId))
    .orderBy(desc(contentRevisions.createdAt));

  return rows.map(({ blockBody, ...rest }) => ({ ...rest, ...summarizeBlockBody(blockBody) }));
}

export async function getRevision(db: Database, itemId: string, revisionId: string) {
  const [revision] = await db
    .select()
    .from(contentRevisions)
    .where(and(eq(contentRevisions.id, revisionId), eq(contentRevisions.contentItemId, itemId)));
  return revision;
}

/**
 * Stellt den Inhalt einer Revision als neuen Entwurf wieder her. Der bisherige
 * Entwurf wird vorher als eigene Revision gesichert, die Wiederherstellung
 * ist also selbst umkehrbar. Der veröffentlichte Stand bleibt unberührt.
 */
export async function restoreRevision(
  db: Database,
  itemId: string,
  revisionId: string,
  userId: string,
) {
  const revision = await getRevision(db, itemId, revisionId);
  if (!revision) {
    return undefined;
  }
  const [current] = await db.select().from(contentItems).where(eq(contentItems.id, itemId));
  if (!current) {
    return undefined;
  }

  await recordDraftRevision(db, current, userId, { forceNew: true });

  const [restored] = await db
    .update(contentItems)
    .set({
      blockBody: revision.blockBody,
      fieldValues: revision.fieldValues,
      updatedAt: new Date(),
    })
    .where(eq(contentItems.id, itemId))
    .returning();
  return restored;
}
