import { randomBytes } from "node:crypto";
import { and, eq, gt, sessions, type Database } from "@presscraft/database";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 Tage

/**
 * Opake Session-Tokens statt JWT (ADR 0013): sofort serverseitig widerrufbar,
 * keine eigene Signatur-/Ablauf-Logik im Client nötig.
 */
export async function createSession(
  db: Database,
  userId: string,
): Promise<{ id: string; expiresAt: Date }> {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id, userId, expiresAt });
  return { id, expiresAt };
}

export async function getValidSession(db: Database, sessionId: string) {
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())));
  return session;
}

export async function deleteSession(db: Database, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}
