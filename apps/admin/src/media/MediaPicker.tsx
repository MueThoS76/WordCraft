import type { MediaItem } from "../api/types";
import { UploadButton } from "./UploadButton";
import { useMediaLibrary } from "./useMediaLibrary";

/** Modaler Dialog zur Auswahl (oder zum Hochladen) eines Bildes für Blöcke. */
export function MediaPicker({
  onSelect,
  onClose,
}: {
  onSelect: (item: MediaItem) => void;
  onClose: () => void;
}) {
  const { items, loading, error, uploading, upload } = useMediaLibrary();

  async function handleFiles(files: FileList) {
    const uploaded = await upload(files);
    if (uploaded) {
      onSelect(uploaded);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bild auswählen"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
          <h2 className="m-0 text-lg font-semibold">Bild auswählen</h2>
          <div className="flex items-center gap-2">
            <UploadButton onFiles={handleFiles} disabled={uploading} />
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100"
            >
              Schließen
            </button>
          </div>
        </div>
        <div className="overflow-y-auto p-4">
          {error && <p className="mb-3 text-sm text-red-700">{error}</p>}
          {loading ? (
            <p>Lädt …</p>
          ) : items.length === 0 ? (
            <p className="text-slate-600">Noch keine Medien — lade ein Bild hoch.</p>
          ) : (
            <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className="block w-full overflow-hidden rounded border border-slate-200 bg-white p-0 text-left hover:border-indigo-500"
                  >
                    <img
                      src={item.url}
                      alt={item.altText}
                      className="block h-28 w-full object-cover"
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
      </div>
    </div>
  );
}
