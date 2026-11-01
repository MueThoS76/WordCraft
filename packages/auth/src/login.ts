import type { Database } from "@presscraft/database";
import { createSession } from "./session.js";
import { getUserByEmail } from "./users.js";
import { verifyPassword } from "./password.js";

/**
 * Meilenstein 1: nur "eingeloggt oder nicht" — Gruppen, Capabilities und
 * erzwingbares 2FA (ADR 0006) kommen erst mit dem vollen Rechtemodell,
 * nicht in diesem Schritt (ADR 0015, Schritt 7).
 */
export async function login(db: Database, email: string, password: string) {
  const user = await getUserByEmail(db, email);
  if (!user) {
    return undefined;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return undefined;
  }

  return createSession(db, user.id);
}
