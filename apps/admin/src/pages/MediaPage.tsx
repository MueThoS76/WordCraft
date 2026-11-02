import { useState } from "react";
import { api } from "../api/client";
import type { MediaItem } from "../api/types";
import { UploadButton } from "../media/UploadButton";
import { useMediaLibrary } from "../media/useMediaLibrary";

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MediaPage() {
  const { items, loading, error, uploading, reload, upload } = useMediaLibrary();
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [altText, setAltText] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function select(item: MediaItem) {
    setSelected(item);
    setAltText(item.altText);
    setActionError(null);
  }

  async function handleSave() {
    if (!selected) {
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateMediaAltText(selected.id, altText);
      setSelected(updated);
      await reload();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !selected ||
      !window.confirm("Datei wirklich löschen? Sie verschwindet aus allen Seiten.")
    ) {
      return;
    }
    try {
      await api.deleteMedia(selected.id);
      setSelected(null);
      await reload();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Löschen fehlgeschlagen.");
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="m-0">Medien</h1>
        <UploadButton onFiles={(files) => void upload(files)} disabled={uploading} />
      </div>

      {error && <p className="mb-3 text-sm text-red-700">{error}</p>}

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          {loading ? (
            <p>Lädt …</p>
          ) : items.length === 0 ? (
            <p className="rounded border border-dashed border-slate-300 p-8 text-center text-slate-600">
              Noch keine Medien. Lade PNG-, JPEG-, GIF- oder WebP-Bilder bis 10 MB hoch.
            </p>
          ) : (
            <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => select(item)}
                    className={`block w-full overflow-hidden rounded border bg-white p-0 text-left ${
                      selected?.id === item.id
                        ? "border-indigo-600 ring-2 ring-indigo-300"
                        : "border-slate-200 hover:border-indigo-400"
                    }`}
                  >
                    <img
                      src={item.url}
                      alt={item.altText}
                      className="block h-32 w-full object-cover"
                    />
                    <span className="block truncate px-2 py-1 text-xs text-slate-600">
                      {item.originalName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected && (
          <aside
            aria-label="Details"
            className="w-full shrink-0 rounded border border-slate-200 bg-white p-4 lg:w-80"
          >
            <img
              src={selected.url}
              alt={selected.altText}
              className="mb-3 max-h-48 w-full rounded object-contain"
            />
            <p className="m-0 break-all text-sm font-medium">{selected.originalName}</p>
            <p className="mb-3 mt-0 text-xs text-slate-500">
              {selected.mimeType} · {formatSize(selected.sizeBytes)} ·{" "}
              {new Date(selected.createdAt).toLocaleDateString("de-DE")}
            </p>
            <label className="mb-3 block text-sm font-semibold">
              Alt-Text (Beschreibung für Screenreader)
              <input
                type="text"
                value={altText}
                onChange={(event) => setAltText(event.target.value)}
              />
            </label>
            <label className="mb-3 block text-sm font-semibold">
              Datei-URL
              <input type="text" readOnly value={selected.url} onFocus={(e) => e.target.select()} />
            </label>
            {actionError && <p className="mb-2 text-sm text-red-700">{actionError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || altText === selected.altText}
                className="rounded border-0 bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Speichern
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="rounded border border-red-300 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                Löschen
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
