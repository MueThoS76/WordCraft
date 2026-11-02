import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { Category } from "../api/types";

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function reload() {
    setCategories(await api.listCategories());
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }
    try {
      await api.createCategory({ name });
      setName("");
      setError(null);
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Anlegen fehlgeschlagen.");
    }
  }

  async function handleRename(id: string) {
    if (!editName.trim()) {
      return;
    }
    try {
      await api.updateCategory(id, { name: editName });
      setEditingId(null);
      setError(null);
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Umbenennen fehlgeschlagen.");
    }
  }

  async function handleDelete(category: Category) {
    const count = category.itemCount ?? 0;
    const hint =
      count > 0 ? ` Sie ist ${count} Einträgen zugeordnet — diese bleiben erhalten.` : "";
    if (!window.confirm(`Kategorie „${category.name}“ löschen?${hint}`)) {
      return;
    }
    await api.deleteCategory(category.id);
    await reload();
  }

  return (
    <main className="pages-list">
      <h1>Kategorien</h1>

      <form onSubmit={handleCreate} className="new-page-form">
        <input
          placeholder="Name der neuen Kategorie"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button type="submit">Anlegen</button>
      </form>
      {error && <p className="text-sm text-red-700">{error}</p>}

      {loading ? (
        <p>Lädt …</p>
      ) : categories.length === 0 ? (
        <p>Noch keine Kategorien.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Einträge</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>
                  {editingId === category.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void handleRename(category.id);
                        if (event.key === "Escape") setEditingId(null);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="link"
                      onClick={() => {
                        setEditingId(category.id);
                        setEditName(category.name);
                      }}
                    >
                      {category.name}
                    </button>
                  )}
                </td>
                <td>{category.slug}</td>
                <td>{category.itemCount ?? 0}</td>
                <td>
                  <button type="button" onClick={() => void handleDelete(category)}>
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
