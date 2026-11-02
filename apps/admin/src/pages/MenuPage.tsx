import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { ContentItem, NavigationItem } from "../api/types";

/** Editor für das Navigationsmenü der öffentlichen Website. */
export function MenuPage() {
  const [items, setItems] = useState<NavigationItem[] | null>(null);
  const [pages, setPages] = useState<ContentItem[]>([]);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSettings().then((settings) => setItems(settings.navigation));
    api.listContent("page").then(setPages);
  }, []);

  if (!items) {
    return <p className="p-6">Lädt …</p>;
  }

  function change(next: NavigationItem[]) {
    setItems(next);
    setState("idle");
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (!items || target < 0 || target >= items.length) {
      return;
    }
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    change(next);
  }

  async function handleSave() {
    if (!items) {
      return;
    }
    setState("saving");
    setError(null);
    try {
      const saved = await api.updateSettings({ navigation: items });
      setItems(saved.navigation);
      setState("saved");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Speichern fehlgeschlagen.");
      setState("idle");
    }
  }

  const publishedPages = pages.filter((page) => page.status === "published");

  return (
    <main>
      <h1>Menü</h1>
      <p className="text-sm text-slate-600">
        Diese Links erscheinen in der Kopfzeile der öffentlichen Website, in dieser Reihenfolge.
      </p>

      {items.length === 0 && <p>Das Menü ist leer.</p>}
      <ul className="m-0 list-none space-y-2 p-0">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <input
              aria-label="Beschriftung"
              placeholder="Beschriftung"
              value={item.label}
              onChange={(event) =>
                change(
                  items.map((entry, i) =>
                    i === index ? { ...entry, label: event.target.value } : entry,
                  ),
                )
              }
              className="mt-0"
            />
            <input
              aria-label="Link"
              placeholder="/seite oder https://…"
              value={item.url}
              onChange={(event) =>
                change(
                  items.map((entry, i) =>
                    i === index ? { ...entry, url: event.target.value } : entry,
                  ),
                )
              }
              className="mt-0"
            />
            <button type="button" aria-label="Nach oben" onClick={() => move(index, -1)}>
              ↑
            </button>
            <button type="button" aria-label="Nach unten" onClick={() => move(index, 1)}>
              ↓
            </button>
            <button
              type="button"
              aria-label="Entfernen"
              onClick={() => change(items.filter((_, i) => i !== index))}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => change([...items, { label: "", url: "/" }])}>
          + Eigener Link
        </button>
        <select
          aria-label="Seite hinzufügen"
          className="mt-0 w-auto"
          value=""
          onChange={(event) => {
            const page = publishedPages.find((entry) => entry.slug === event.target.value);
            if (page) {
              change([...items, { label: page.title, url: `/${page.slug}` }]);
            }
          }}
        >
          <option value="">+ Seite hinzufügen …</option>
          {publishedPages.map((page) => (
            <option key={page.id} value={page.slug}>
              {page.title}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => change([...items, { label: "Blog", url: "/blog" }])}>
          + Blog
        </button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex items-center gap-3">
        <button type="button" disabled={state === "saving"} onClick={() => void handleSave()}>
          Speichern
        </button>
        {state === "saved" && <span className="text-sm text-green-700">Gespeichert</span>}
      </div>
    </main>
  );
}
