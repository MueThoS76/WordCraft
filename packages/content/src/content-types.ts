import { contentTypes, eq, type Database } from "@presscraft/database";

/**
 * Siehe docs/decisions/0008-content-typ-system.md. Für Meilenstein 1 gibt es
 * nur den Typ "page", aber die Registry ist generisch — weitere Typen
 * (Post, Custom-Types von Plugins) kommen später als Daten hinzu, nicht als
 * Schema-Umbau.
 */
export interface ContentTypeDefinition {
  id: string;
  label: string;
  providedBy?: string;
  fieldSchema?: Record<string, unknown>;
}

export const PAGE_CONTENT_TYPE: ContentTypeDefinition = {
  id: "page",
  label: "Seite",
  providedBy: "core",
  fieldSchema: {},
};

/** Idempotent: legt den Content-Typ an, falls er noch nicht existiert. */
export async function ensureContentType(db: Database, definition: ContentTypeDefinition) {
  const existing = await db.select().from(contentTypes).where(eq(contentTypes.id, definition.id));
  if (existing.length > 0) {
    return existing[0];
  }

  const [created] = await db
    .insert(contentTypes)
    .values({
      id: definition.id,
      label: definition.label,
      providedBy: definition.providedBy ?? "core",
      fieldSchema: definition.fieldSchema ?? {},
    })
    .returning();
  return created;
}

export function listContentTypes(db: Database) {
  return db.select().from(contentTypes);
}

export async function getContentType(db: Database, id: string) {
  const [type] = await db.select().from(contentTypes).where(eq(contentTypes.id, id));
  return type;
}
