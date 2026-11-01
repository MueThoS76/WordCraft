import type { BlockDocument } from "@presscraft/blocks";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { ContentItem } from "../api/types";
import { BlockEditor } from "../editor/BlockEditor";

const AUTOSAVE_DELAY_MS = 1000;
// Dev-Default, passend zum Astro-Dev-Server aus Implementierungsschritt 6.
const WEB_BASE_URL = import.meta.env.VITE_WEB_BASE_URL ?? "http://localhost:4321";

function toBlockDocument(value: unknown): BlockDocument {
  if (value && typeof value === "object" && Array.isArray((value as BlockDocument).blocks)) {
    return value as BlockDocument;
  }
  return { schemaVersion: 1, blocks: [] };
}

export function PageEditorPage({
  id,
  onBack,
  onLogout,
}: {
  id: string;
  onBack: () => void;
  onLogout: () => void;
}) {
  const [page, setPage] = useState<ContentItem | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [blockDocument, setBlockDocument] = useState<BlockDocument>({
    schemaVersion: 1,
    blocks: [],
  });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    api.getPage(id).then((loaded) => {
      setPage(loaded);
      setTitle(loaded.title);
      setSlug(loaded.slug);
      setBlockDocument(toBlockDocument(loaded.blockBody));
    });
  }, [id]);

  const scheduleSave = useCallback(
    (next: { title: string; slug: string; blockDocument: BlockDocument }) => {
      setSaveState("saving");
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
      saveTimeout.current = setTimeout(async () => {
        const updated = await api.updatePage(id, {
          title: next.title,
          slug: next.slug,
          blockBody: next.blockDocument,
        });
        setPage(updated);
        setSaveState("saved");
      }, AUTOSAVE_DELAY_MS);
    },
    [id],
  );

  function handleTitleChange(value: string) {
    setTitle(value);
    scheduleSave({ title: value, slug, blockDocument });
  }

  function handleSlugChange(value: string) {
    setSlug(value);
    scheduleSave({ title, slug: value, blockDocument });
  }

  function handleBlockDocumentChange(next: BlockDocument) {
    setBlockDocument(next);
    scheduleSave({ title, slug, blockDocument: next });
  }

  async function handlePublish() {
    const published = await api.publishPage(id);
    setPage(published);
  }

  if (!page) {
    return <p>Lädt …</p>;
  }

  return (
    <main className="page-editor">
      <header>
        <button type="button" onClick={onBack}>
          ← Zur Übersicht
        </button>
        <span className="save-state">
          {saveState === "saving" ? "Speichert …" : saveState === "saved" ? "Gespeichert" : ""}
        </span>
        <button type="button" onClick={onLogout}>
          Abmelden
        </button>
      </header>

      <label>
        Titel
        <input value={title} onChange={(event) => handleTitleChange(event.target.value)} />
      </label>
      <label>
        Slug
        <input value={slug} onChange={(event) => handleSlugChange(event.target.value)} />
      </label>

      <BlockEditor blockDocument={blockDocument} onChange={handleBlockDocumentChange} />

      <footer>
        <button type="button" onClick={handlePublish}>
          Veröffentlichen
        </button>
        <span>Status: {page.status}</span>
        {page.status === "published" && (
          <a href={`${WEB_BASE_URL}/${page.slug}`} target="_blank" rel="noreferrer">
            Live ansehen
          </a>
        )}
      </footer>
    </main>
  );
}
