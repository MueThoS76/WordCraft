import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { ContentItem } from "../api/types";

export function PagesListPage({ onOpen }: { onOpen: (id: string) => void }) {
  const [pages, setPages] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");

  async function reload() {
    setPages(await api.listPages());
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!newSlug || !newTitle) {
      return;
    }
    const created = await api.createPage({ slug: newSlug, title: newTitle });
    setNewSlug("");
    setNewTitle("");
    await reload();
    onOpen(created.id);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Seite wirklich löschen?")) {
      return;
    }
    await api.deletePage(id);
    await reload();
  }

  return (
    <main className="pages-list">
      <h1>Seiten</h1>

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
        <button type="submit">Neue Seite</button>
      </form>

      {loading ? (
        <p>Lädt …</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Titel</th>
              <th>Slug</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id}>
                <td>
                  <button type="button" className="link" onClick={() => onOpen(page.id)}>
                    {page.title}
                  </button>
                </td>
                <td>{page.slug}</td>
                <td>{page.status}</td>
                <td>
                  <button type="button" onClick={() => handleDelete(page.id)}>
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
