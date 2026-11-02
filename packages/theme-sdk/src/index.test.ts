import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  defaultTheme,
  parseTheme,
  themeConfigSchema,
  themePresets,
  themeToCss,
} from "./index.js";

describe("theme-sdk", () => {
  it("akzeptiert Standard-Theme und alle Presets", () => {
    for (const preset of Object.values(themePresets)) {
      expect(themeConfigSchema.safeParse(preset.theme).success).toBe(true);
    }
  });

  it("fällt bei ungültigen Daten auf das Standard-Theme zurück", () => {
    expect(parseTheme(null)).toEqual(defaultTheme);
    expect(parseTheme({ colors: { background: "red" } })).toEqual(defaultTheme);
  });

  it("lehnt CSS-Injection über Farben und Schriften ab", () => {
    const evilColor = {
      ...defaultTheme,
      colors: { ...defaultTheme.colors, primary: "red;} body{display:none" },
    };
    expect(themeConfigSchema.safeParse(evilColor).success).toBe(false);
    const evilFont = {
      ...defaultTheme,
      typography: { ...defaultTheme.typography, fontFamily: "x;} *{display:none" },
    };
    expect(themeConfigSchema.safeParse(evilFont).success).toBe(false);
  });

  it("begrenzt Zahlenwerte", () => {
    const wide = { ...defaultTheme, layout: { ...defaultTheme.layout, contentWidth: 99999 } };
    expect(themeConfigSchema.safeParse(wide).success).toBe(false);
  });

  it("erzeugt CSS-Variablen für :root", () => {
    const css = themeToCss(defaultTheme);
    expect(css.startsWith(":root{")).toBe(true);
    expect(css).toContain("--pc-primary:#4f46e5;");
    expect(css).toContain("--pc-content-width:720px;");
  });

  it("berechnet WCAG-Kontraste", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#888888")).toBeLessThan(2);
    expect(contrastRatio(defaultTheme.colors.text, defaultTheme.colors.background)).toBeGreaterThan(
      7,
    );
  });
});
