import { eq, siteSettings, type Database } from "@presscraft/database";

/**
 * Website-weite Einstellungen. Unbekannte oder fehlende Schlüssel fallen auf
 * die Defaults zurück, sodass eine frische Installation sofort funktioniert.
 */
export interface NavigationItem {
  label: string;
  /** Relativer Pfad ("/blog") oder absolute http(s)-URL. */
  url: string;
}

export interface SiteSettings {
  siteTitle: string;
  tagline: string;
  /** "blog" = Beitragsübersicht, sonst der Slug einer veröffentlichten Seite. */
  homepage: string;
  navigation: NavigationItem[];
  footerText: string;
  /**
   * Design-Konfiguration (Schema in @presscraft/theme-sdk). Hier bewusst nur
   * opak gespeichert, weil das content-Paket nicht vom theme-sdk abhängen
   * darf (ADR 0012); validiert wird beim Schreiben im Server, beim Lesen im
   * Frontend. null = Standard-Theme.
   */
  theme: Record<string, unknown> | null;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteTitle: "PressCraft",
  tagline: "",
  homepage: "blog",
  navigation: [
    { label: "Start", url: "/" },
    { label: "Blog", url: "/blog" },
  ],
  footerText: "",
  theme: null,
};

export const SITE_SETTING_KEYS = Object.keys(DEFAULT_SITE_SETTINGS) as (keyof SiteSettings)[];

/**
 * Nur relative Pfade und http(s)-URLs sind als Link-Ziel erlaubt — alles
 * andere (z. B. "javascript:") würde im Menü ein XSS-Risiko öffnen.
 */
export function isSafeNavigationUrl(url: string): boolean {
  if (url.startsWith("//")) {
    return false;
  }
  return /^\/[^\s]*$/.test(url) || /^https?:\/\/[^\s]+$/i.test(url);
}

export async function getSiteSettings(db: Database): Promise<SiteSettings> {
  const rows = await db.select().from(siteSettings);
  const stored = new Map(rows.map((row) => [row.key, row.value]));
  const settings = { ...DEFAULT_SITE_SETTINGS } as Record<string, unknown>;
  for (const key of SITE_SETTING_KEYS) {
    if (stored.has(key)) {
      settings[key] = stored.get(key);
    }
  }
  return settings as unknown as SiteSettings;
}

export async function updateSiteSettings(
  db: Database,
  changes: Partial<SiteSettings>,
): Promise<SiteSettings> {
  const now = new Date();
  for (const key of SITE_SETTING_KEYS) {
    const value = changes[key];
    if (value === undefined) {
      continue;
    }
    if (value === null) {
      // null bedeutet "Standard": gespeicherten Wert entfernen.
      await resetSiteSetting(db, key);
      continue;
    }
    await db
      .insert(siteSettings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: now } });
  }
  return getSiteSettings(db);
}

/** Für Tests und "Zurücksetzen": entfernt gespeicherte Werte eines Schlüssels. */
export async function resetSiteSetting(db: Database, key: keyof SiteSettings): Promise<void> {
  await db.delete(siteSettings).where(eq(siteSettings.key, key));
}
