import { and, eq, groups, userGroups, type Database } from "@presscraft/database";
import { verifyPassword } from "./password.js";
import { createSession, getValidSession, markSessionTwoFactorVerified } from "./session.js";
import { verifyTotp } from "./totp.js";
import { getFullUserById, getUserByEmail } from "./users.js";

export interface LoginResult {
  id: string;
  expiresAt: Date;
  /** true, solange der zweite 2FA-Schritt noch aussteht (ADR 0017, Schritt 6). */
  requiresTwoFactor: boolean;
}

async function groupRequiresTwoFactor(db: Database, userId: string): Promise<boolean> {
  const rows = await db
    .select({ require2fa: groups.require2fa })
    .from(userGroups)
    .innerJoin(groups, eq(groups.id, userGroups.groupId))
    .where(and(eq(userGroups.userId, userId), eq(groups.require2fa, true)));
  return rows.length > 0;
}

/**
 * ADR 0006: Gruppen- und Capability-Rechte sind ab Schritt 1–5 von ADR 0017
 * verdrahtet. 2FA (dieser Schritt): wenn der User 2FA aktiviert hat, bleibt
 * die Session bis zum zweiten Schritt (completeTwoFactorLogin) unvollständig
 * (twoFactorVerified = false) — SessionGuard lehnt sie bis dahin ab.
 *
 * Erfordert eine Gruppe 2FA (`require2fa`), aber der User hat es nie
 * aktiviert, scheitert der Login komplett — kein Bug, sondern die in ADR
 * 0006 festgelegte Konsequenz ("Mitglieder dieser Gruppe können sich ohne
 * aktiviertes 2FA gar nicht einloggen").
 */
export async function login(
  db: Database,
  email: string,
  password: string,
): Promise<LoginResult | undefined> {
  const user = await getUserByEmail(db, email);
  if (!user) {
    return undefined;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return undefined;
  }

  if (!user.totpEnabled && (await groupRequiresTwoFactor(db, user.id))) {
    return undefined;
  }

  const session = await createSession(db, user.id, { twoFactorVerified: !user.totpEnabled });
  return { ...session, requiresTwoFactor: user.totpEnabled };
}

/** Schließt den zweiten Login-Schritt ab, indem der TOTP-Code gegen die Session geprüft wird. */
export async function completeTwoFactorLogin(
  db: Database,
  sessionId: string,
  code: string,
): Promise<boolean> {
  const session = await getValidSession(db, sessionId);
  if (!session) {
    return false;
  }
  if (session.twoFactorVerified) {
    return true;
  }

  const user = await getFullUserById(db, session.userId);
  if (!user?.totpSecret || !verifyTotp(user.totpSecret, code)) {
    return false;
  }

  await markSessionTwoFactorVerified(db, sessionId);
  return true;
}
