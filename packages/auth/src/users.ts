import { eq, users, type Database } from "@presscraft/database";
import { hashPassword } from "./password.js";

export interface CreateUserInput {
  email: string;
  password: string;
}

export interface UpdateUserInput {
  email?: string;
  password?: string;
}

/**
 * Niemals `passwordHash`/`totpSecret`/`totpRecoveryCodes` nach außen geben
 * (ADR 0017, Schritt 5) — alle User-CRUD-Funktionen projizieren darauf,
 * außer wo Login/Session den vollen Datensatz brauchen (siehe login.ts,
 * das weiterhin direkt die users-Tabelle abfragt).
 */
export interface SafeUser {
  id: string;
  email: string;
  totpEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toSafeUser(user: typeof users.$inferSelect): SafeUser {
  return {
    id: user.id,
    email: user.email,
    totpEnabled: user.totpEnabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function createUser(db: Database, input: CreateUserInput): Promise<SafeUser> {
  const passwordHash = await hashPassword(input.password);
  const [user] = await db.insert(users).values({ email: input.email, passwordHash }).returning();
  return toSafeUser(user);
}

/** Liefert den vollen Datensatz (inkl. passwordHash) — nur für Login/Session gedacht. */
export async function getUserByEmail(db: Database, email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user;
}

export function listUsers(db: Database) {
  return db
    .select()
    .from(users)
    .then((rows) => rows.map(toSafeUser));
}

export async function getUserById(db: Database, id: string): Promise<SafeUser | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ? toSafeUser(user) : undefined;
}

export async function updateUser(
  db: Database,
  id: string,
  input: UpdateUserInput,
): Promise<SafeUser | undefined> {
  const values: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (input.email !== undefined) {
    values.email = input.email;
  }
  if (input.password !== undefined) {
    values.passwordHash = await hashPassword(input.password);
  }

  const [user] = await db.update(users).set(values).where(eq(users.id, id)).returning();
  return user ? toSafeUser(user) : undefined;
}

export async function deleteUser(db: Database, id: string): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}
