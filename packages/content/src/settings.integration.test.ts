import { createDb, siteSettings, type Database } from "@presscraft/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  DEFAULT_SITE_SETTINGS,
  getSiteSettings,
  isSafeNavigationUrl,
  resetSiteSetting,
  SITE_SETTING_KEYS,
  updateSiteSettings,
  type SiteSettings,
} from "./settings.js";

describe("site settings (integration)", () => {
  let db: Database;
  let backup: Partial<SiteSettings>;

  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL muss für Integrationstests gesetzt sein.");
    }
    db = createDb(connectionString);
    // Vorhandene Werte sichern, damit der Test eine echte Installation nicht überschreibt.
    backup = {};
    const rows = await db.select().from(siteSettings);
    for (const row of rows) {
      (backup as Record<string, unknown>)[row.key] = row.value;
    }
  });

  afterAll(async () => {
    for (const key of SITE_SETTING_KEYS) {
      await resetSiteSetting(db, key);
    }
    await updateSiteSettings(db, backup);
  });

  it("liefert Defaults, speichert Teiländerungen und lässt den Rest unberührt", async () => {
    for (const key of SITE_SETTING_KEYS) {
      await resetSiteSetting(db, key);
    }
    expect(await getSiteSettings(db)).toEqual(DEFAULT_SITE_SETTINGS);

    const updated = await updateSiteSettings(db, { siteTitle: "Mein Blog", tagline: "Hallo" });
    expect(updated).toMatchObject({
      siteTitle: "Mein Blog",
      tagline: "Hallo",
      homepage: DEFAULT_SITE_SETTINGS.homepage,
      navigation: DEFAULT_SITE_SETTINGS.navigation,
    });

    const again = await updateSiteSettings(db, { homepage: "willkommen" });
    expect(again.siteTitle).toBe("Mein Blog");
    expect(again.homepage).toBe("willkommen");
  });

  it("speichert ein Theme und setzt es mit null auf den Standard zurück", async () => {
    await updateSiteSettings(db, { theme: { colors: { primary: "#112233" } } });
    expect((await getSiteSettings(db)).theme).toEqual({ colors: { primary: "#112233" } });
    await updateSiteSettings(db, { theme: null });
    expect((await getSiteSettings(db)).theme).toBeNull();
  });

  it("erlaubt nur sichere Link-Ziele", () => {
    expect(isSafeNavigationUrl("/blog")).toBe(true);
    expect(isSafeNavigationUrl("https://example.com/x")).toBe(true);
    expect(isSafeNavigationUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeNavigationUrl("//evil.example")).toBe(false);
    expect(isSafeNavigationUrl("data:text/html,x")).toBe(false);
    expect(isSafeNavigationUrl("")).toBe(false);
    expect(isSafeNavigationUrl("/mit leerzeichen")).toBe(false);
  });
});
