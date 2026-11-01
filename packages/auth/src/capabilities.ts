import {
  and,
  capabilities,
  eq,
  groupCapabilities,
  userGroups,
  type Database,
} from "@presscraft/database";

/**
 * Siehe docs/decisions/0006-rechte-und-rollenmodell.md und
 * docs/decisions/0017-implementierungsplan-userverwaltung.md (Schritt 1).
 * Zuweisung läuft ausschließlich über Gruppen — keine Einzelrechte am
 * User vorbei.
 */
export interface CapabilityDefinition {
  id: string;
  description?: string;
  providedBy?: string;
}

/** Idempotent: deklariert eine Capability, falls sie noch nicht existiert. */
export async function ensureCapability(db: Database, definition: CapabilityDefinition) {
  const existing = await db.select().from(capabilities).where(eq(capabilities.id, definition.id));
  if (existing.length > 0) {
    return existing[0];
  }

  const [created] = await db
    .insert(capabilities)
    .values({
      id: definition.id,
      providedBy: definition.providedBy ?? "core",
      description: definition.description,
    })
    .returning();
  return created;
}

/** Prüft, ob der User über eine seiner Gruppen die gegebene Capability hat. */
export async function userHasCapability(
  db: Database,
  userId: string,
  capabilityId: string,
): Promise<boolean> {
  const rows = await db
    .select({ capabilityId: groupCapabilities.capabilityId })
    .from(userGroups)
    .innerJoin(groupCapabilities, eq(groupCapabilities.groupId, userGroups.groupId))
    .where(and(eq(userGroups.userId, userId), eq(groupCapabilities.capabilityId, capabilityId)));
  return rows.length > 0;
}
