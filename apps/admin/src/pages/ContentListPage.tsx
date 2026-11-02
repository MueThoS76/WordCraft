import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { ContentItem } from "../api/types";

/** Gemeinsame Übersicht für alle Content-Typen (Seiten, Beiträge, …). */
export function ContentListPage({
  typeId,
  title,
  singular,
  showCategories,
  onOpen,
}: {
  typeId: string;
  title: string;
  singular: string;
  showCategories?: boolean;
  onOpen: (id: string) => void;
}) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");

  async function reload() {
    setItems(await api.listContent(typeId));
  }

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [typeId]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!newSlug || !newTitle) {
      return;
    }
    const created = await api.createContent(typeId, { slug: newSlug, title: newTitle });
    setNewSlug("");
    setNewTitle("");
    await reload();
    onOpen(created.id);
  }

  async function handleDelete(id: string) {
    if (!window.confirm(`${singular} wirklich löschen?`)) {
      return;
    }
    await api.deleteContent(typeId, id);
    await reload();
  }

  return (
    <main className="pages-list">
      <h1>{title}</h1>

      <form onSubmit={handleCreate} className="new-page-form">
        <input
          placeholder="slug"
          value={newSlug}
          onChange={(event) => setNewSlug(event.target.value)}
        />
        <input
          placeholder="Titel"
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
        />
        <button type="submit">Neu: {singular}</button>
      </form>

      {loading ? (
        <p>Lädt …</p>
      ) : items.length === 0 ? (
        <p>Noch nichts vorhanden.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Titel</th>
              <th>Slug</th>
              {showCategories && <th>Kategorien</th>}
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <button type="button" className="link" onClick={() => onOpen(item.id)}>
                    {item.title}
                  </button>
                </td>
                <td>{item.slug}</td>
                {showCategories && (
                  <td>{(item.categories ?? []).map((category) => category.name).join(", ")}</td>
                )}
                <td>{item.status}</td>
                <td>
                  <button type="button" onClick={() => handleDelete(item.id)}>
                    Löschen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
