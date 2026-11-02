import type { BlockDocument } from "@presscraft/blocks";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { Category, ContentItem } from "../api/types";
import { BlockEditor } from "../editor/BlockEditor";
import { PagePreview } from "../editor/PagePreview";
import { RevisionsPanel } from "../editor/RevisionsPanel";

const AUTOSAVE_DELAY_MS = 1000;
// Dev-Default, passend zum Astro-Dev-Server aus Implementierungsschritt 6.
const WEB_BASE_URL = import.meta.env.VITE_WEB_BASE_URL ?? "http://localhost:4321";

function toBlockDocument(value: unknown): BlockDocument {
  if (value && typeof value === "object" && Array.isArray((value as BlockDocument).blocks)) {
    return value as BlockDocument;
  }
  return { schemaVersion: 1, blocks: [] };
}

/** Öffentliche Adresse eines veröffentlichten Items, je nach Typ. */
function publicPath(typeId: string, slug: string): string {
  return typeId === "post" ? `/blog/${slug}` : `/${slug}`;
}

/**
 * Editor für alle Content-Typen. Beiträge ("post") haben zusätzlich Auszug
 * und Kategorien (ADR 0008: typisierte Felder pro Typ).
 */
export function ContentEditorPage({
  typeId,
  id,
  onBack,
}: {
  typeId: string;
  id: string;
  onBack: () => void;
}) {
  const isPost = typeId === "post";
  const [item, setItem] = useState<ContentItem | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [blockDocument, setBlockDocument] = useState<BlockDocument>({
    schemaVersion: 1,
    blocks: [],
  });
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  const applyLoaded = useCallback((loaded: ContentItem) => {
    setItem(loaded);
    setTitle(loaded.title);
    setSlug(loaded.slug);
    setExcerpt(typeof loaded.fieldValues.excerpt === "string" ? loaded.fieldValues.excerpt : "");
    setBlockDocument(toBlockDocument(loaded.blockBody));
    setSelectedCategoryIds((loaded.categories ?? []).map((category) => category.id));
  }, []);

  useEffect(() => {
    api.getContent(typeId, id).then(applyLoaded);
    if (isPost) {
      api.listCategories().then(setAllCategories);
    }
  }, [typeId, id, isPost, applyLoaded]);

  const scheduleSave = useCallback(
    (next: {
      title: string;
      slug: string;
      excerpt: string;
      blockDocument: BlockDocument;
      fieldValues: Record<string, unknown>;
    }) => {
      setSaveState("saving");
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
      saveTimeout.current = setTimeout(async () => {
        try {
          const updated = await api.updateContent(typeId, id, {
            title: next.title,
            slug: next.slug,
            blockBody: next.blockDocument,
            // Bestehende Feldwerte erhalten, nur bekannte Felder überschreiben.
            ...(isPost ? { fieldValues: { ...next.fieldValues, excerpt: next.excerpt } } : {}),
          });
          setItem((previous) => ({ ...updated, categories: previous?.categories }));
          setSaveError(null);
          setSaveState("saved");
        } catch (reason) {
          // z. B. ungültiger Block (unsicherer Link) oder doppelter Slug — sichtbar
          // machen, statt dauerhaft "Speichert …" anzuzeigen.
          setSaveError(reason instanceof Error ? reason.message : "Speichern fehlgeschlagen.");
          setSaveState("error");
        }
      }, AUTOSAVE_DELAY_MS);
    },
    [typeId, id, isPost],
  );

  const current = { title, slug, excerpt, blockDocument, fieldValues: item?.fieldValues ?? {} };

  function handleTitleChange(value: string) {
    setTitle(value);
    scheduleSave({ ...current, title: value });
  }

  function handleSlugChange(value: string) {
    setSlug(value);
    scheduleSave({ ...current, slug: value });
  }

  function handleExcerptChange(value: string) {
    setExcerpt(value);
    scheduleSave({ ...current, excerpt: value });
  }

  function handleBlockDocumentChange(next: BlockDocument) {
    setBlockDocument(next);
    scheduleSave({ ...current, blockDocument: next });
  }

  async function handleToggleCategory(categoryId: string) {
    const next = selectedCategoryIds.includes(categoryId)
      ? selectedCategoryIds.filter((existing) => existing !== categoryId)
      : [...selectedCategoryIds, categoryId];
    setSelectedCategoryIds(next);
    await api.setContentCategories(typeId, id, next);
  }

  async function handlePublish() {
    // Offene Änderungen zuerst speichern, sonst wird ein älterer Stand veröffentlicht.
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = undefined;
    }
    try {
      await api.updateContent(typeId, id, {
        title,
        slug,
        blockBody: blockDocument,
        ...(isPost ? { fieldValues: { ...current.fieldValues, excerpt } } : {}),
      });
      const published = await api.publishContent(typeId, id);
      setItem((previous) => ({ ...published, categories: previous?.categories }));
      setSaveError(null);
      setSaveState("saved");
    } catch (reason) {
      // Nicht veröffentlichen, wenn der aktuelle Stand nicht gespeichert werden konnte.
      setSaveError(reason instanceof Error ? reason.message : "Veröffentlichen fehlgeschlagen.");
      setSaveState("error");
    }
  }

  if (!item) {
    return <p>Lädt …</p>;
  }

  return (
    <main className="page-editor">
      <header>
        <button type="button" onClick={onBack}>
          ← Zur Übersicht
        </button>
        <div role="tablist" aria-label="Ansicht" className="flex gap-1">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "edit"}
            className={mode === "edit" ? "font-semibold underline" : ""}
            onClick={() => setMode("edit")}
          >
            Bearbeiten
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "preview"}
            className={mode === "preview" ? "font-semibold underline" : ""}
            onClick={() => setMode("preview")}
          >
            Vorschau
          </button>
        </div>
        <span className="save-state">
          {saveState === "saving"
            ? "Speichert …"
            : saveState === "saved"
              ? "Gespeichert"
              : saveState === "error"
                ? "Nicht gespeichert"
                : ""}
        </span>
      </header>

      {saveError && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800"
        >
          {saveError}
        </p>
      )}

      {mode === "preview" ? (
        <PagePreview
          title={title}
          blockDocument={blockDocument}
          meta={
            isPost
              ? allCategories
                  .filter((category) => selectedCategoryIds.includes(category.id))
                  .map((category) => category.name)
                  .join(" · ")
              : undefined
          }
        />
      ) : (
        <>
          <label>
            Titel
            <input value={title} onChange={(event) => handleTitleChange(event.target.value)} />
          </label>
          <label>
            Slug
            <input value={slug} onChange={(event) => handleSlugChange(event.target.value)} />
          </label>

          {isPost && (
            <>
              <label>
                Auszug (Kurztext für Übersichten)
                <textarea
                  rows={3}
                  value={excerpt}
                  onChange={(event) => handleExcerptChange(event.target.value)}
                />
              </label>
              <fieldset className="mb-3 rounded border border-slate-300 p-3">
                <legend className="px-1 text-sm font-semibold">Kategorien</legend>
                {allCategories.length === 0 ? (
                  <p className="m-0 text-sm text-slate-600">
                    Noch keine Kategorien — lege sie unter „Kategorien“ an.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {allCategories.map((category) => (
                      <label key={category.id} className="mb-0 flex items-center gap-2 font-normal">
                        <input
                          type="checkbox"
                          className="m-0 w-auto"
                          checked={selectedCategoryIds.includes(category.id)}
                          onChange={() => void handleToggleCategory(category.id)}
                        />
                        {category.name}
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
            </>
          )}

          <BlockEditor blockDocument={blockDocument} onChange={handleBlockDocumentChange} />
        </>
      )}

      <footer>
        <button type="button" onClick={handlePublish}>
          Veröffentlichen
        </button>
        <button type="button" onClick={() => setHistoryOpen((open) => !open)}>
          {historyOpen ? "Verlauf ausblenden" : "Verlauf"}
        </button>
        <span>Status: {item.status}</span>
        {item.status === "published" && (
          <a
            href={`${WEB_BASE_URL}${publicPath(typeId, item.slug)}`}
            target="_blank"
            rel="noreferrer"
          >
            Live ansehen
          </a>
        )}
      </footer>

      {historyOpen && (
        <RevisionsPanel
          typeId={typeId}
          id={id}
          refreshKey={`${saveState}-${item.updatedAt}`}
          onRestored={(restored) => {
            if (saveTimeout.current) {
              clearTimeout(saveTimeout.current);
              saveTimeout.current = undefined;
            }
            applyLoaded(restored);
            setSaveState("saved");
          }}
        />
      )}
    </main>
  );
}
