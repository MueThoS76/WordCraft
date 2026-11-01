import {
  capabilities,
  createDb,
  eq,
  groupCapabilities,
  userGroups,
  users,
  type Database,
} from "@presscraft/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureCapability, listCapabilities } from "./capabilities.js";
import {
  addUserToGroup,
  createGroup,
  deleteGroup,
  getGroupById,
  grantCapabilityToGroup,
  listGroupCapabilities,
  listGroupMembers,
  listGroups,
  removeUserFromGroup,
  revokeCapabilityFromGroup,
  updateGroup,
} from "./groups.js";

/**
 * Integrationstest gegen eine echte, laufende Postgres-Instanz (ADR 0017,
 * Schritt 4). Voraussetzung: `pnpm db:up` und eine gesetzte DATABASE_URL.
 */
const TEST_USER_ID = "77777777-7777-7777-7777-777777777777";
const TEST_CAPABILITY_ID = "test.capability.groups-crud";

describe("group CRUD and membership management (integration)", () => {
  let db: Database;

  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL muss für Integrationstests gesetzt sein (siehe .env.example, pnpm db:up).",
      );
    }
    db = createDb(connectionString);

    await db.insert(users).values({
      id: TEST_USER_ID,
      email: "groups-crud-integration-test@presscraft.local",
      passwordHash: "disabled",
    });
    await ensureCapability(db, { id: TEST_CAPABILITY_ID, description: "Nur für Tests." });
  });

  afterAll(async () => {
    await db.delete(capabilities).where(eq(capabilities.id, TEST_CAPABILITY_ID));
    await db.delete(users).where(eq(users.id, TEST_USER_ID));
  });

  it("supports the full lifecycle: create, assign, list, revoke, delete", async () => {
    const group = await createGroup(db, { name: "Integrationstest-CRUD-Gruppe" });

    // Liste enthält die neue Gruppe.
    const allGroups = await listGroups(db);
    expect(allGroups.some((g) => g.id === group.id)).toBe(true);

    // Capability und Mitglied zuweisen.
    await grantCapabilityToGroup(db, group.id, TEST_CAPABILITY_ID);
    await addUserToGroup(db, TEST_USER_ID, group.id);

    expect(await listGroupCapabilities(db, group.id)).toEqual([
      { capabilityId: TEST_CAPABILITY_ID },
    ]);
    expect(await listGroupMembers(db, group.id)).toEqual([
      { id: TEST_USER_ID, email: "groups-crud-integration-test@presscraft.local" },
    ]);
    expect((await listCapabilities(db)).some((c) => c.id === TEST_CAPABILITY_ID)).toBe(true);

    // Umbenennen.
    const renamed = await updateGroup(db, group.id, { name: "Umbenannt", require2fa: true });
    expect(renamed.name).toBe("Umbenannt");
    expect(renamed.require2fa).toBe(true);
    expect((await getGroupById(db, group.id))?.name).toBe("Umbenannt");

    // Capability entziehen, Mitglied entfernen.
    await revokeCapabilityFromGroup(db, group.id, TEST_CAPABILITY_ID);
    await removeUserFromGroup(db, TEST_USER_ID, group.id);
    expect(await listGroupCapabilities(db, group.id)).toEqual([]);
    expect(await listGroupMembers(db, group.id)).toEqual([]);

    // Löschen.
    await deleteGroup(db, group.id);
    expect(await getGroupById(db, group.id)).toBeUndefined();
  });

  it("cascades membership and capability grants when a group is deleted", async () => {
    const group = await createGroup(db, { name: "Integrationstest-Cascade-Gruppe" });
    await grantCapabilityToGroup(db, group.id, TEST_CAPABILITY_ID);
    await addUserToGroup(db, TEST_USER_ID, group.id);

    await deleteGroup(db, group.id);

    const remainingMemberships = await db
      .select()
      .from(userGroups)
      .where(eq(userGroups.groupId, group.id));
    const remainingGrants = await db
      .select()
      .from(groupCapabilities)
      .where(eq(groupCapabilities.groupId, group.id));
    expect(remainingMemberships).toEqual([]);
    expect(remainingGrants).toEqual([]);
  });
});
