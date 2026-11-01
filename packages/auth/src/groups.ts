import {
  and,
  eq,
  groupCapabilities,
  groups,
  userGroups,
  users,
  type Database,
} from "@presscraft/database";

/**
 * Gruppen-/Mitgliedschaftsverwaltung (ADR 0006, ADR 0017 Schritt 4).
 * Zuweisung läuft ausschließlich über Gruppen — es gibt bewusst keine
 * Funktion, die einem User direkt eine Capability gibt.
 */

export interface CreateGroupInput {
  name: string;
  require2fa?: boolean;
}

export interface UpdateGroupInput {
  name?: string;
  require2fa?: boolean;
}

export function listGroups(db: Database) {
  return db.select().from(groups);
}

export async function getGroupById(db: Database, id: string) {
  const [group] = await db.select().from(groups).where(eq(groups.id, id));
  return group;
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

export async function updateGroup(db: Database, id: string, input: UpdateGroupInput) {
  const [group] = await db
    .update(groups)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(groups.id, id))
    .returning();
  return group;
}

/** Löscht die Gruppe — Mitgliedschaften und Capability-Grants hängen per
 * ON DELETE CASCADE daran und werden automatisch mit entfernt. */
export async function deleteGroup(db: Database, id: string): Promise<void> {
  await db.delete(groups).where(eq(groups.id, id));
}

export async function addUserToGroup(db: Database, userId: string, groupId: string): Promise<void> {
  await db.insert(userGroups).values({ userId, groupId }).onConflictDoNothing();
}

export async function removeUserFromGroup(
  db: Database,
  userId: string,
  groupId: string,
): Promise<void> {
  await db
    .delete(userGroups)
    .where(and(eq(userGroups.userId, userId), eq(userGroups.groupId, groupId)));
}

export function listGroupMembers(db: Database, groupId: string) {
  return db
    .select({ id: users.id, email: users.email })
    .from(userGroups)
    .innerJoin(users, eq(users.id, userGroups.userId))
    .where(eq(userGroups.groupId, groupId));
}

export async function grantCapabilityToGroup(
  db: Database,
  groupId: string,
  capabilityId: string,
): Promise<void> {
  await db.insert(groupCapabilities).values({ groupId, capabilityId }).onConflictDoNothing();
}

export async function revokeCapabilityFromGroup(
  db: Database,
  groupId: string,
  capabilityId: string,
): Promise<void> {
  await db
    .delete(groupCapabilities)
    .where(
      and(eq(groupCapabilities.groupId, groupId), eq(groupCapabilities.capabilityId, capabilityId)),
    );
}

export function listGroupCapabilities(db: Database, groupId: string) {
  return db
    .select({ capabilityId: groupCapabilities.capabilityId })
    .from(groupCapabilities)
    .where(eq(groupCapabilities.groupId, groupId));
}
