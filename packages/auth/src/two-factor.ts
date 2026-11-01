import { eq, users, type Database } from "@presscraft/database";
import { generateTotpSecret, verifyTotp } from "./totp.js";

/**
 * Enroll-/Confirm-/Disable-Lebenszyklus für 2FA (ADR 0006, ADR 0017
 * Schritt 6). Bewusst **keine** Recovery-Codes in diesem Durchgang — das
 * ist eine spätere, unabhängige Erweiterung (totp_recovery_codes bleibt
 * im Schema vorbereitet, aber ungenutzt).
 */

export interface BeginTotpEnrollmentResult {
  secret: string;
  otpauthUri: string;
}

/**
 * Legt ein neues, noch inaktives Secret an. Erst confirmTotpEnrollment()
 * schaltet 2FA scharf — ein abgebrochener Enroll-Versuch sperrt niemanden
 * aus, weil totpEnabled erst danach auf true gesetzt wird.
 */
export async function beginTotpEnrollment(
  db: Database,
  userId: string,
  accountLabel: string,
): Promise<BeginTotpEnrollmentResult> {
  const secret = generateTotpSecret();
  await db
    .update(users)
    .set({ totpSecret: secret, totpEnabled: false })
    .where(eq(users.id, userId));

  // Für Apps, die auch eine getippte otpauth-URI statt nur des reinen
  // Secrets akzeptieren — kein QR-Code in diesem Durchgang (ADR 0017).
  const otpauthUri = `otpauth://totp/PressCraft:${encodeURIComponent(accountLabel)}?secret=${secret}&issuer=PressCraft`;
  return { secret, otpauthUri };
}

export async function confirmTotpEnrollment(
  db: Database,
  userId: string,
  code: string,
): Promise<boolean> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user?.totpSecret || !verifyTotp(user.totpSecret, code)) {
    return false;
  }

  await db.update(users).set({ totpEnabled: true }).where(eq(users.id, userId));
  return true;
}

export async function disableTotp(db: Database, userId: string, code: string): Promise<boolean> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user?.totpEnabled || !user.totpSecret || !verifyTotp(user.totpSecret, code)) {
    return false;
  }

  await db
    .update(users)
    .set({ totpEnabled: false, totpSecret: null, totpRecoveryCodes: null })
    .where(eq(users.id, userId));
  return true;
}
