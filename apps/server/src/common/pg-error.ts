/**
 * Prüft, ob ein Fehler ein bestimmter Postgres-Fehlercode ist (z. B. "23505"
 * = unique_violation, "23503" = foreign_key_violation). drizzle-orm wrappt
 * den eigentlichen Treiber-Fehler in einen DrizzleQueryError mit `.cause`
 * — ein reines `error.code`-Check greift deshalb ins Leere.
 */
export function hasPgErrorCode(error: unknown, code: string): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  if ("code" in error && error.code === code) {
    return true;
  }
  if ("cause" in error) {
    return hasPgErrorCode((error as { cause?: unknown }).cause, code);
  }
  return false;
}
