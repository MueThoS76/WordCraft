import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { ContentItem, SiteSettings } from "../api/types";

export function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [pages, setPages] = useState<ContentItem[]>([]);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSettings().then(setSettings);
    api.listContent("page").then(setPages);
  }, []);

  if (!settings) {
    return <p className="p-6">Lädt …</p>;
  }

  function update<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setSettings((previous) => (previous ? { ...previous, [key]: value } : previous));
    setState("idle");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!settings) {
      return;
    }
    setState("saving");
    setError(null);
    try {
      const saved = await api.updateSettings({
        siteTitle: settings.siteTitle,
        tagline: settings.tagline,
        homepage: settings.homepage,
        footerText: settings.footerText,
      });
      setSettings(saved);
      setState("saved");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Speichern fehlgeschlagen.");
      setState("idle");
    }
  }

  const publishedPages = pages.filter((page) => page.status === "published");
  const homepageMissing =
    settings.homepage !== "blog" && !publishedPages.some((page) => page.slug === settings.homepage);

  return (
    <main>
      <h1>Einstellungen</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Titel der Website
          <input
            value={settings.siteTitle}
            onChange={(event) => update("siteTitle", event.target.value)}
          />
        </label>
        <label>
          Untertitel
          <input
            value={settings.tagline}
            onChange={(event) => update("tagline", event.target.value)}
          />
        </label>
        <label>
          Startseite
          <select
            value={settings.homepage}
            onChange={(event) => update("homepage", event.target.value)}
          >
            <option value="blog">Beitragsübersicht (Blog)</option>
            {publishedPages.map((page) => (
              <option key={page.id} value={page.slug}>
                Seite: {page.title}
              </option>
            ))}
            {homepageMissing && (
              <option value={settings.homepage}>{settings.homepage} (nicht veröffentlicht)</option>
            )}
          </select>
        </label>
        {homepageMissing && (
          <p className="text-sm text-amber-700">
            Die gewählte Seite ist nicht veröffentlicht — die Startseite zeigt bis dahin einen
            Hinweis.
          </p>
        )}
        <label>
          Text in der Fußzeile
          <input
            value={settings.footerText}
            onChange={(event) => update("footerText", event.target.value)}
          />
        </label>

        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={state === "saving"}>
            Speichern
          </button>
          {state === "saved" && <span className="text-sm text-green-700">Gespeichert</span>}
        </div>
      </form>
    </main>
  );
}
