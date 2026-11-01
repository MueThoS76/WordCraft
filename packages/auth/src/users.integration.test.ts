import { createDb, eq, users, type Database } from "@presscraft/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { login } from "./login.js";
import { createUser, deleteUser, getUserById, listUsers, updateUser } from "./users.js";

/**
 * Integrationstest gegen eine echte, laufende Postgres-Instanz (ADR 0017,
 * Schritt 5). Voraussetzung: `pnpm db:up` und eine gesetzte DATABASE_URL.
 */
const TEST_EMAIL = "users-crud-integration-test@presscraft.local";
const RENAMED_EMAIL = "users-crud-integration-test-renamed@presscraft.local";

describe("user management (integration)", () => {
  let db: Database;

  beforeAll(() => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL muss für Integrationstests gesetzt sein (siehe .env.example, pnpm db:up).",
      );
    }
    db = createDb(connectionString);
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, TEST_EMAIL));
    await db.delete(users).where(eq(users.email, RENAMED_EMAIL));
  });

  it("creates a user that can log in afterwards, without ever exposing the password hash", async () => {
    const created = await createUser(db, { email: TEST_EMAIL, password: "ein-sicheres-passwort" });
    expect(created).not.toHaveProperty("passwordHash");
    expect(created.email).toBe(TEST_EMAIL);

    const session = await login(db, TEST_EMAIL, "ein-sicheres-passwort");
    expect(session).toBeDefined();

    expect((await listUsers(db)).some((u) => u.id === created.id)).toBe(true);
    expect((await getUserById(db, created.id))?.email).toBe(TEST_EMAIL);
  });

  it("supports updating email and password, and deleting", async () => {
    const created = await createUser(db, {
      email: "users-crud-integration-test-2@presscraft.local",
      password: "altes-passwort",
    });

    const renamed = await updateUser(db, created.id, {
      email: RENAMED_EMAIL,
      password: "neues-passwort",
    });
    expect(renamed?.email).toBe(RENAMED_EMAIL);

    // Altes Passwort funktioniert nicht mehr, neues schon.
    expect(await login(db, RENAMED_EMAIL, "altes-passwort")).toBeUndefined();
    expect(await login(db, RENAMED_EMAIL, "neues-passwort")).toBeDefined();

    await deleteUser(db, created.id);
    expect(await getUserById(db, created.id)).toBeUndefined();
  });
});
