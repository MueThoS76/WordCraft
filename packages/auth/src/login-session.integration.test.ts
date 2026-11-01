import { createDb, eq, users, type Database } from "@presscraft/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { login } from "./login.js";
import { deleteSession, getValidSession } from "./session.js";
import { createUser } from "./users.js";

/**
 * Integrationstest gegen eine echte, laufende Postgres-Instanz (ADR 0015,
 * Schritt 7). Voraussetzung: `pnpm db:up` und eine gesetzte DATABASE_URL.
 */
const TEST_EMAIL = "auth-integration-test@presscraft.local";

describe("login and session (integration)", () => {
  let db: Database;

  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL muss für Integrationstests gesetzt sein (siehe .env.example, pnpm db:up).",
      );
    }
    db = createDb(connectionString);
    await createUser(db, { email: TEST_EMAIL, password: "richtiges-passwort" });
  });

  afterAll(async () => {
    // sessions.user_id hat ON DELETE CASCADE — eine evtl. verbliebene
    // Session wird mit dem User automatisch entfernt.
    await db.delete(users).where(eq(users.email, TEST_EMAIL));
  });

  it("creates a valid, retrievable session on correct credentials", async () => {
    const session = await login(db, TEST_EMAIL, "richtiges-passwort");
    expect(session).toBeDefined();

    const valid = await getValidSession(db, session!.id);
    expect(valid).toBeDefined();

    await deleteSession(db, session!.id);
    expect(await getValidSession(db, session!.id)).toBeUndefined();
  });

  it("returns undefined on a wrong password", async () => {
    expect(await login(db, TEST_EMAIL, "falsches-passwort")).toBeUndefined();
  });

  it("returns undefined for an unknown email", async () => {
    expect(await login(db, "nobody@example.com", "irrelevant")).toBeUndefined();
  });
});
