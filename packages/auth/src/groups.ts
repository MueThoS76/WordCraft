import { eq, groupCapabilities, groups, userGroups, type Database } from "@presscraft/database";

/**
 * Minimale Gruppen-Bausteine, die Schritt 1 (Capability-Framework) und
 * Schritt 2 (Bootstrap der Administratoren-Gruppe) brauchen. Die volle
 * Gruppenverwaltungs-API (CRUD, Entzug) folgt in Implementierungsschritt 4
 * von docs/decisions/0017-implementierungsplan-userverwaltung.md.
 */

export interface CreateGroupInput {
  name: string;
  require2fa?: boolean;
}

export async function getGroupByName(db: Database, name: string) {
  const [group] = await db.select().from(groups).where(eq(groups.name, name));
  return group;
}

export async function createGroup(db: Database, input: CreateGroupInput) {
  const [group] = await db
    .insert(groups)
    .values({ name: input.name, require2fa: input.require2fa ?? false })
    .returning();
  return group;
}

export async function addUserToGroup(db: Database, userId: string, groupId: string): Promise<void> {
  await db.insert(userGroups).values({ userId, groupId }).onConflictDoNothing();
}

export async function grantCapabilityToGroup(
  db: Database,
  groupId: string,
  capabilityId: string,
): Promise<void> {
  await db.insert(groupCapabilities).values({ groupId, capabilityId }).onConflictDoNothing();
}
