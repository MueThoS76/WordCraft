/** Maskiert Text für die Verwendung in XML (Feed, Sitemap). */
export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Öffentliche Basis-URL der Website. Hinter einem Reverse Proxy sollte
 * SITE_URL gesetzt sein, sonst wird der interne Host verwendet.
 */
export function siteOrigin(requestUrl: URL): string {
  const configured = process.env.SITE_URL;
  return (configured ? configured : requestUrl.origin).replace(/\/$/, "");
}
