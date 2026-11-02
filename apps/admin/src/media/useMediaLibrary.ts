import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { MediaItem } from "../api/types";

/** Gemeinsame Logik für Medien-Seite und Bildauswahl. */
export function useMediaLibrary() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const reload = useCallback(async () => {
    try {
      setItems(await api.listMedia());
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Medien konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Lädt mehrere Dateien nacheinander hoch; gibt das zuletzt hochgeladene zurück. */
  async function upload(files: FileList | File[]): Promise<MediaItem | undefined> {
    setUploading(true);
    setError(null);
    let last: MediaItem | undefined;
    try {
      for (const file of Array.from(files)) {
        last = await api.uploadMedia(file);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
      await reload();
    }
    return last;
  }

  return { items, loading, error, uploading, reload, upload };
}
