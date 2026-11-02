import type { BlockDocument } from "@presscraft/blocks";
import { BlockDocumentRenderer } from "@presscraft/renderer";
import { parseTheme, themeToCssVariables, type ThemeConfig } from "@presscraft/theme-sdk";
import { useEffect, useState, type CSSProperties } from "react";
import { api } from "../api/client";

/**
 * Vorschau eines Inhalts mit demselben Renderer wie die öffentliche Website
 * (ADR 0003/0012) und dem aktuell gespeicherten Theme. Darf ein User die
 * Einstellungen nicht lesen (fehlende Capability), gilt das Standard-Theme.
 */
export function PagePreview({
  title,
  blockDocument,
  meta,
}: {
  title: string;
  blockDocument: BlockDocument;
  /** Zusatzzeile unter dem Titel, z. B. Kategorien bei Beiträgen. */
  meta?: string;
}) {
  const [theme, setTheme] = useState<ThemeConfig>(() => parseTheme(null));

  useEffect(() => {
    api
      .getSettings()
      .then((settings) => setTheme(parseTheme(settings.theme)))
      .catch(() => setTheme(parseTheme(null)));
  }, []);

  return (
    <div
      className="pc-preview"
      style={themeToCssVariables(theme) as CSSProperties}
      aria-label="Vorschau"
    >
      <div className="pc-preview-page">
        <h1>{title || "Ohne Titel"}</h1>
        {meta && <p className="pc-preview-meta">{meta}</p>}
        <BlockDocumentRenderer document={blockDocument} />
        {blockDocument.blocks.length === 0 && (
          <p className="pc-preview-meta">Noch keine Inhalte — füge im Editor Blöcke hinzu.</p>
        )}
      </div>
    </div>
  );
}
