import { z } from "zod";

export const PACKAGE_NAME = "@presscraft/theme-sdk";

/**
 * Theme = reine Design-Konfiguration (ADR 0007): keine Code-Ausführung, nur
 * validierte Werte. Weil jeder Wert streng eingegrenzt ist (Hex-Farben,
 * Schrift aus fester Liste, Zahlen in Bereichen), lässt sich das Theme ohne
 * Sicherheitsrisiko als CSS ausgeben — es gibt keinen Weg, beliebiges CSS
 * oder HTML einzuschleusen.
 */

export const FONT_STACKS = {
  system: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  humanist: "'Trebuchet MS', 'Segoe UI', Tahoma, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
} as const;

export type FontFamilyId = keyof typeof FONT_STACKS;

export const FONT_LABELS: Record<FontFamilyId, string> = {
  system: "System (neutral)",
  serif: "Serif (klassisch)",
  humanist: "Humanistisch",
  mono: "Monospace (technisch)",
};

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Farbe muss das Format #rrggbb haben.");

export const themeConfigSchema = z.object({
  colors: z.object({
    background: hexColor,
    text: hexColor,
    mutedText: hexColor,
    primary: hexColor,
    surface: hexColor,
    border: hexColor,
  }),
  typography: z.object({
    fontFamily: z.enum(Object.keys(FONT_STACKS) as [FontFamilyId, ...FontFamilyId[]]),
    baseFontSize: z.number().min(14).max(22),
    lineHeight: z.number().min(1.2).max(2),
  }),
  layout: z.object({
    contentWidth: z.number().int().min(480).max(1200),
    radius: z.number().int().min(0).max(24),
    headerStyle: z.enum(["left", "centered"]),
  }),
});

export type ThemeConfig = z.infer<typeof themeConfigSchema>;

export const defaultTheme: ThemeConfig = {
  colors: {
    background: "#ffffff",
    text: "#1a1a1a",
    mutedText: "#666666",
    primary: "#4f46e5",
    surface: "#eef2ff",
    border: "#e5e5e5",
  },
  typography: { fontFamily: "system", baseFontSize: 16, lineHeight: 1.6 },
  layout: { contentWidth: 720, radius: 6, headerStyle: "left" },
};

export const themePresets: Record<string, { label: string; theme: ThemeConfig }> = {
  hell: { label: "Hell (Standard)", theme: defaultTheme },
  dunkel: {
    label: "Dunkel",
    theme: {
      colors: {
        background: "#0f172a",
        text: "#e2e8f0",
        mutedText: "#94a3b8",
        primary: "#818cf8",
        surface: "#1e293b",
        border: "#334155",
      },
      typography: { fontFamily: "system", baseFontSize: 16, lineHeight: 1.7 },
      layout: { contentWidth: 720, radius: 8, headerStyle: "left" },
    },
  },
  buch: {
    label: "Buch (warm, Serif)",
    theme: {
      colors: {
        background: "#fbf7f0",
        text: "#2b2118",
        mutedText: "#7a6a58",
        primary: "#9a3412",
        surface: "#f3e9d8",
        border: "#e4d6bf",
      },
      typography: { fontFamily: "serif", baseFontSize: 18, lineHeight: 1.75 },
      layout: { contentWidth: 680, radius: 4, headerStyle: "centered" },
    },
  },
};

/**
 * Liest ein (möglicherweise fehlendes oder ungültiges) Theme aus den
 * Einstellungen. Bei jedem Problem gilt das Standard-Theme, damit die
 * öffentliche Seite nie wegen einer kaputten Konfiguration ausfällt.
 */
export function parseTheme(input: unknown): ThemeConfig {
  const result = themeConfigSchema.safeParse(input);
  return result.success ? result.data : defaultTheme;
}

export function themeToCssVariables(theme: ThemeConfig): Record<string, string> {
  return {
    "--pc-bg": theme.colors.background,
    "--pc-text": theme.colors.text,
    "--pc-muted": theme.colors.mutedText,
    "--pc-primary": theme.colors.primary,
    "--pc-surface": theme.colors.surface,
    "--pc-border": theme.colors.border,
    "--pc-font": FONT_STACKS[theme.typography.fontFamily],
    "--pc-font-size": `${theme.typography.baseFontSize}px`,
    "--pc-line-height": String(theme.typography.lineHeight),
    "--pc-content-width": `${theme.layout.contentWidth}px`,
    "--pc-radius": `${theme.layout.radius}px`,
  };
}

/** CSS-Block für `:root`. Nur validierte Werte — siehe Hinweis oben. */
export function themeToCss(theme: ThemeConfig): string {
  const lines = Object.entries(themeToCssVariables(theme)).map(
    ([name, value]) => `${name}:${value};`,
  );
  return `:root{${lines.join("")}}`;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** WCAG-Kontrastverhältnis (1–21). Für Lesbarkeits-Hinweise im Design-Editor. */
export function contrastRatio(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  const [lighter, darker] = a > b ? [a, b] : [b, a];
  return (lighter + 0.05) / (darker + 0.05);
}
