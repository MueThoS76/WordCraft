import { createDb, eq, groups, userGroups, users, type Database } from "@presscraft/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { completeTwoFactorLogin, login } from "./login.js";
import { getValidSession } from "./session.js";
import { beginTotpEnrollment, confirmTotpEnrollment } from "./two-factor.js";
import { generateTotp } from "./totp.js";
import { addUserToGroup, createGroup } from "./groups.js";
import { createUser } from "./users.js";

/**
 * Integrationstest gegen eine echte, laufende Postgres-Instanz (ADR 0017,
 * Schritt 6). Voraussetzung: `pnpm db:up` und eine gesetzte DATABASE_URL.
 */
const TEST_EMAIL = "two-factor-login-integration-test@presscraft.local";
const TEST_PASSWORD = "ein-sicheres-passwort";
const REQUIRE_2FA_GROUP_NAME = "Integrationstest-2FA-Pflicht-Gruppe";

describe("two-step login with 2FA (integration)", () => {
  let db: Database;
  let userId: string;

  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL muss für Integrationstests gesetzt sein (siehe .env.example, pnpm db:up).",
      );
    }
    db = createDb(connectionString);

    const user = await createUser(db, { email: TEST_EMAIL, password: TEST_PASSWORD });
    userId = user.id;
  });

  afterAll(async () => {
    await db.delete(groups).where(eq(groups.name, REQUIRE_2FA_GROUP_NAME));
    await db.delete(users).where(eq(users.id, userId));
  });

  it("logs in without a second step while 2FA is not enabled", async () => {
    const result = await login(db, TEST_EMAIL, TEST_PASSWORD);
    expect(result?.requiresTwoFactor).toBe(false);

    const session = await getValidSession(db, result!.id);
    expect(session?.twoFactorVerified).toBe(true);
  });

  it("requires a second step once 2FA is enabled, and rejects a wrong code", async () => {
    const { secret } = await beginTotpEnrollment(db, userId, TEST_EMAIL);
    const enrollCode = generateTotp(secret);
    expect(await confirmTotpEnrollment(db, userId, enrollCode)).toBe(true);

    const result = await login(db, TEST_EMAIL, TEST_PASSWORD);
    expect(result?.requiresTwoFactor).toBe(true);

    const pendingSession = await getValidSession(db, result!.id);
    expect(pendingSession?.twoFactorVerified).toBe(false);

    // Falscher Code schließt den Login nicht ab.
    const wrongCode = generateTotp(secret) === "000000" ? "111111" : "000000";
    expect(await completeTwoFactorLogin(db, result!.id, wrongCode)).toBe(false);
    expect((await getValidSession(db, result!.id))?.twoFactorVerified).toBe(false);

    // Richtiger Code schließt den Login ab.
    const correctCode = generateTotp(secret);
    expect(await completeTwoFactorLogin(db, result!.id, correctCode)).toBe(true);
    expect((await getValidSession(db, result!.id))?.twoFactorVerified).toBe(true);
  });

  it("denies login entirely when a group requires 2FA but the user never enabled it", async () => {
    const otherUser = await createUser(db, {
      email: "two-factor-no-enrollment-integration-test@presscraft.local",
      password: TEST_PASSWORD,
    });
    const group = await createGroup(db, { name: REQUIRE_2FA_GROUP_NAME, require2fa: true });
    await addUserToGroup(db, otherUser.id, group.id);

    expect(
      await login(db, "two-factor-no-enrollment-integration-test@presscraft.local", TEST_PASSWORD),
    ).toBeUndefined();

    await db.delete(userGroups).where(eq(userGroups.userId, otherUser.id));
    await db.delete(users).where(eq(users.id, otherUser.id));
  });
});
