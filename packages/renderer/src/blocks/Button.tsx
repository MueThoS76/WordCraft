import { isSafeUrl, type ButtonAttributes } from "@presscraft/blocks";

/**
 * Prüft die URL beim Rendern ein zweites Mal, falls ein Altbestand oder ein
 * anderer Schreibpfad die Validierung beim Speichern umgangen hat.
 */
export function Button({ label, url, style }: ButtonAttributes) {
  if (!url || !isSafeUrl(url)) {
    return null;
  }
  return (
    <p>
      <a className={`pc-button pc-button-${style ?? "primary"}`} href={url}>
        {label}
      </a>
    </p>
  );
}
