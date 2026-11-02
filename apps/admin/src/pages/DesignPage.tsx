import {
  FONT_LABELS,
  contrastRatio,
  defaultTheme,
  parseTheme,
  themePresets,
  themeToCssVariables,
  type FontFamilyId,
  type ThemeConfig,
} from "@presscraft/theme-sdk";
import { useEffect, useState, type CSSProperties } from "react";
import { api } from "../api/client";

const COLOR_FIELDS: { key: keyof ThemeConfig["colors"]; label: string }[] = [
  { key: "background", label: "Hintergrund" },
  { key: "text", label: "Text" },
  { key: "mutedText", label: "Dezenter Text" },
  { key: "primary", label: "Akzentfarbe" },
  { key: "surface", label: "Flächen (Zitate, Chips)" },
  { key: "border", label: "Linien" },
];

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      {label}: {value}
      {unit}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

/** Visueller Theme-Editor (ADR 0007): Design = reine, validierte Konfiguration. */
export function DesignPage() {
  const [theme, setTheme] = useState<ThemeConfig | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSettings().then((settings) => setTheme(parseTheme(settings.theme)));
  }, []);

  if (!theme) {
    return <p className="p-6">Lädt …</p>;
  }

  function change(next: ThemeConfig) {
    setTheme(next);
    setState("idle");
  }

  async function handleSave() {
    setState("saving");
    setError(null);
    try {
      await api.updateSettings({ theme });
      setState("saved");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Speichern fehlgeschlagen.");
      setState("idle");
    }
  }

  async function handleReset() {
    if (!window.confirm("Auf das Standard-Design zurücksetzen?")) {
      return;
    }
    await api.updateSettings({ theme: null });
    setTheme(defaultTheme);
    setState("saved");
  }

  const textContrast = contrastRatio(theme.colors.text, theme.colors.background);
  const accentContrast = contrastRatio(theme.colors.primary, theme.colors.background);

  const previewStyle = {
    ...themeToCssVariables(theme),
    background: "var(--pc-bg)",
    color: "var(--pc-text)",
    fontFamily: "var(--pc-font)",
    fontSize: "var(--pc-font-size)",
    lineHeight: "var(--pc-line-height)",
    border: "1px solid var(--pc-border)",
    borderRadius: "var(--pc-radius)",
  } as CSSProperties;

  return (
    <div className="p-6">
      <h1>Design</h1>
      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <form
          onSubmit={(event) => event.preventDefault()}
          className="rounded-lg border border-slate-200 bg-white p-4"
        >
          <label>
            Vorlage
            <select
              value=""
              onChange={(event) => {
                const preset = themePresets[event.target.value];
                if (preset) {
                  change(preset.theme);
                }
              }}
            >
              <option value="">Vorlage laden …</option>
              {Object.entries(themePresets).map(([id, preset]) => (
                <option key={id} value={id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <h2>Farben</h2>
          <div className="grid grid-cols-2 gap-x-3">
            {COLOR_FIELDS.map((field) => (
              <label key={field.key} className="text-sm">
                {field.label}
                <input
                  type="color"
                  className="h-9 p-1"
                  value={theme.colors[field.key]}
                  onChange={(event) =>
                    change({
                      ...theme,
                      colors: { ...theme.colors, [field.key]: event.target.value },
                    })
                  }
                />
              </label>
            ))}
          </div>
          {textContrast < 4.5 && (
            <p className="text-sm text-amber-700">
              Achtung: Text auf Hintergrund hat nur ein Kontrastverhältnis von{" "}
              {textContrast.toFixed(1)}:1 (empfohlen: mindestens 4,5:1).
            </p>
          )}
          {accentContrast < 3 && (
            <p className="text-sm text-amber-700">
              Die Akzentfarbe hebt sich kaum vom Hintergrund ab ({accentContrast.toFixed(1)}:1).
            </p>
          )}

          <h2>Schrift</h2>
          <label>
            Schriftart
            <select
              value={theme.typography.fontFamily}
              onChange={(event) =>
                change({
                  ...theme,
                  typography: {
                    ...theme.typography,
                    fontFamily: event.target.value as FontFamilyId,
                  },
                })
              }
            >
              {(Object.keys(FONT_LABELS) as FontFamilyId[]).map((id) => (
                <option key={id} value={id}>
                  {FONT_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
          <Slider
            label="Schriftgröße"
            value={theme.typography.baseFontSize}
            min={14}
            max={22}
            step={1}
            unit=" px"
            onChange={(value) =>
              change({ ...theme, typography: { ...theme.typography, baseFontSize: value } })
            }
          />
          <Slider
            label="Zeilenabstand"
            value={theme.typography.lineHeight}
            min={1.2}
            max={2}
            step={0.05}
            unit=""
            onChange={(value) =>
              change({
                ...theme,
                typography: { ...theme.typography, lineHeight: Math.round(value * 100) / 100 },
              })
            }
          />

          <h2>Layout</h2>
          <Slider
            label="Inhaltsbreite"
            value={theme.layout.contentWidth}
            min={480}
            max={1200}
            step={20}
            unit=" px"
            onChange={(value) =>
              change({ ...theme, layout: { ...theme.layout, contentWidth: value } })
            }
          />
          <Slider
            label="Eckenradius"
            value={theme.layout.radius}
            min={0}
            max={24}
            step={1}
            unit=" px"
            onChange={(value) => change({ ...theme, layout: { ...theme.layout, radius: value } })}
          />
          <label>
            Kopfzeile
            <select
              value={theme.layout.headerStyle}
              onChange={(event) =>
                change({
                  ...theme,
                  layout: {
                    ...theme.layout,
                    headerStyle: event.target.value as "left" | "centered",
                  },
                })
              }
            >
              <option value="left">Linksbündig</option>
              <option value="centered">Zentriert</option>
            </select>
          </label>

          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="mt-3 flex items-center gap-2">
            <button type="button" disabled={state === "saving"} onClick={() => void handleSave()}>
              Speichern
            </button>
            <button type="button" onClick={() => void handleReset()}>
              Zurücksetzen
            </button>
            {state === "saved" && <span className="text-sm text-green-700">Gespeichert</span>}
          </div>
        </form>

        <section aria-label="Vorschau" className="min-w-0">
          <div className="mb-2 text-sm text-slate-500">Vorschau (aktualisiert sich live)</div>
          <div style={previewStyle} className="overflow-hidden">
            <div
              style={{
                borderBottom: "1px solid var(--pc-border)",
                padding: "0.9rem 1.25rem",
                textAlign: theme.layout.headerStyle === "centered" ? "center" : "left",
                fontWeight: 600,
              }}
            >
              Meine Website &nbsp;·&nbsp; Start &nbsp;·&nbsp; Blog &nbsp;·&nbsp; Kontakt
            </div>
            <div
              style={{
                maxWidth: "var(--pc-content-width)",
                margin: "0 auto",
                padding: "1.25rem",
              }}
            >
              <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.8em" }}>Willkommen</h2>
              <p style={{ margin: "0 0 0.75rem", color: "var(--pc-muted)", fontSize: "0.9em" }}>
                2. November 2026{" "}
                <span
                  style={{
                    background: "var(--pc-surface)",
                    color: "var(--pc-primary)",
                    borderRadius: 999,
                    padding: "0 0.5rem",
                    fontSize: "0.85em",
                  }}
                >
                  Tipps
                </span>
              </p>
              <p>
                So sieht Fließtext mit den gewählten Farben, der Schrift und dem Zeilenabstand aus.
                <a
                  href="#"
                  style={{ color: "var(--pc-primary)" }}
                  onClick={(e) => e.preventDefault()}
                >
                  {" "}
                  Ein Link im Text.
                </a>
              </p>
              <blockquote
                style={{
                  margin: "1rem 0",
                  padding: "0.1rem 1rem",
                  borderLeft: "4px solid var(--pc-primary)",
                  background: "var(--pc-surface)",
                  borderRadius: "0 var(--pc-radius) var(--pc-radius) 0",
                }}
              >
                <p>Ein Zitat hebt sich auf einer Fläche vom Text ab.</p>
              </blockquote>
              <span
                style={{
                  display: "inline-block",
                  padding: "0.5rem 1.1rem",
                  borderRadius: "var(--pc-radius)",
                  border: "2px solid var(--pc-primary)",
                  background: "var(--pc-primary)",
                  color: "var(--pc-bg)",
                  fontWeight: 600,
                  marginRight: "0.5rem",
                }}
              >
                Button
              </span>
              <span
                style={{
                  display: "inline-block",
                  padding: "0.5rem 1.1rem",
                  borderRadius: "var(--pc-radius)",
                  border: "2px solid var(--pc-primary)",
                  color: "var(--pc-primary)",
                  fontWeight: 600,
                }}
              >
                Umrandet
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
