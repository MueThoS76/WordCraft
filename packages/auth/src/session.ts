import { randomBytes } from "node:crypto";
import { and, eq, gt, sessions, type Database } from "@presscraft/database";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 Tage

export interface CreateSessionOptions {
  /**
   * false, solange ein zweiter 2FA-Schritt noch aussteht (ADR 0006/0017
   * Schritt 6). Default true — die meisten Logins brauchen kein 2FA.
   */
  twoFactorVerified?: boolean;
}

/**
 * Opake Session-Tokens statt JWT (ADR 0013): sofort serverseitig widerrufbar,
 * keine eigene Signatur-/Ablauf-Logik im Client nötig.
 */
export async function createSession(
  db: Database,
  userId: string,
  options: CreateSessionOptions = {},
): Promise<{ id: string; expiresAt: Date }> {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({
    id,
    userId,
    expiresAt,
    twoFactorVerified: options.twoFactorVerified ?? true,
  });
  return { id, expiresAt };
}

export async function getValidSession(db: Database, sessionId: string) {
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())));
  return session;
}

/** Schließt den zweiten 2FA-Schritt einer Session ab (ADR 0017, Schritt 6). */
export async function markSessionTwoFactorVerified(db: Database, sessionId: string): Promise<void> {
  await db.update(sessions).set({ twoFactorVerified: true }).where(eq(sessions.id, sessionId));
}

export async function deleteSession(db: Database, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}
