import {
  capabilities,
  createDb,
  eq,
  groupCapabilities,
  groups,
  userGroups,
  users,
  type Database,
} from "@presscraft/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addUserToGroup, createGroup, grantCapabilityToGroup } from "./groups.js";
import { ensureCapability, userHasCapability } from "./capabilities.js";

/**
 * Integrationstest gegen eine echte, laufende Postgres-Instanz (ADR 0017,
 * Schritt 1). Voraussetzung: `pnpm db:up` und eine gesetzte DATABASE_URL.
 */
const TEST_USER_ID = "88888888-8888-8888-8888-888888888888";
const TEST_CAPABILITY_ID = "test.capability.integration";
const TEST_GROUP_NAME = "Integrationstest-Gruppe";

describe("capabilities and groups (integration)", () => {
  let db: Database;
  let groupId: string;

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
      email: "capabilities-integration-test@presscraft.local",
      passwordHash: "disabled",
    });

    await ensureCapability(db, { id: TEST_CAPABILITY_ID, description: "Nur für Tests." });
    const group = await createGroup(db, { name: TEST_GROUP_NAME });
    groupId = group.id;
  });

  afterAll(async () => {
    await db.delete(groups).where(eq(groups.id, groupId));
    await db.delete(capabilities).where(eq(capabilities.id, TEST_CAPABILITY_ID));
    await db.delete(users).where(eq(users.id, TEST_USER_ID));
  });

  it("denies the capability before any group assignment", async () => {
    expect(await userHasCapability(db, TEST_USER_ID, TEST_CAPABILITY_ID)).toBe(false);
  });

  it("grants the capability once the user's group has it", async () => {
    await grantCapabilityToGroup(db, groupId, TEST_CAPABILITY_ID);
    await addUserToGroup(db, TEST_USER_ID, groupId);

    expect(await userHasCapability(db, TEST_USER_ID, TEST_CAPABILITY_ID)).toBe(true);

    // DB-Zustand direkt prüfen, nicht nur den Rückgabewert der Funktion.
    const [membership] = await db
      .select()
      .from(userGroups)
      .where(eq(userGroups.userId, TEST_USER_ID));
    expect(membership.groupId).toBe(groupId);

    const [grant] = await db
      .select()
      .from(groupCapabilities)
      .where(eq(groupCapabilities.groupId, groupId));
    expect(grant.capabilityId).toBe(TEST_CAPABILITY_ID);
  });

  it("ensureCapability is idempotent", async () => {
    await expect(
      ensureCapability(db, { id: TEST_CAPABILITY_ID, description: "Erneut deklariert." }),
    ).resolves.toBeDefined();
  });
});
