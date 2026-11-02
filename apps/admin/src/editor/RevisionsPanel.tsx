import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { ContentItem, RevisionSummary } from "../api/types";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

/** Verlauf eines Items (ADR 0009): ansehen und als Entwurf wiederherstellen. */
export function RevisionsPanel({
  typeId,
  id,
  refreshKey,
  onRestored,
}: {
  typeId: string;
  id: string;
  /** Ändert sich nach jedem Speichern, damit die Liste nachlädt. */
  refreshKey: string;
  onRestored: (item: ContentItem) => void;
}) {
  const [revisions, setRevisions] = useState<RevisionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    api
      .listRevisions(typeId, id)
      .then((list) => {
        setRevisions(list);
        setError(null);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Verlauf konnte nicht geladen werden."),
      );
  }, [typeId, id, refreshKey]);

  async function handleRestore(revision: RevisionSummary) {
    if (
      !window.confirm(
        `Stand vom ${formatDateTime(revision.createdAt)} als Entwurf wiederherstellen? ` +
          "Der aktuelle Entwurf bleibt im Verlauf erhalten, die veröffentlichte Version ändert sich nicht.",
      )
    ) {
      return;
    }
    setBusyId(revision.id);
    try {
      onRestored(await api.restoreRevision(typeId, id, revision.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Wiederherstellen fehlgeschlagen.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-label="Verlauf" className="mt-4 rounded border border-slate-200 bg-white p-3">
      <h2 className="mt-0 text-base font-semibold">Verlauf</h2>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {!revisions ? (
        <p>Lädt …</p>
      ) : revisions.length === 0 ? (
        <p className="m-0 text-sm text-slate-600">
          Noch keine Einträge. Der Verlauf füllt sich beim Bearbeiten und Veröffentlichen.
        </p>
      ) : (
        <ul className="m-0 list-none divide-y divide-slate-100 p-0">
          {revisions.map((revision) => (
            <li key={revision.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium">
                  {formatDateTime(revision.createdAt)}{" "}
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                      revision.statusAtSave === "published"
                        ? "bg-green-100 text-green-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {revision.statusAtSave === "published" ? "Veröffentlicht" : "Entwurf"}
                  </span>
                </div>
                <div className="truncate text-xs text-slate-500">
                  {revision.createdByEmail ?? "unbekannt"} · {revision.blockCount} Blöcke
                  {revision.snippet ? ` · „${revision.snippet}“` : ""}
                </div>
              </div>
              <button
                type="button"
                disabled={busyId === revision.id}
                onClick={() => void handleRestore(revision)}
              >
                Wiederherstellen
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
