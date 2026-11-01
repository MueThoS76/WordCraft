import { useEffect, useState, type FormEvent } from "react";
import { ApiError, api } from "../api/client";
import type { Group } from "../api/types";

export function GroupsListPage({ onOpen }: { onOpen: (id: string) => void }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [require2fa, setRequire2fa] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setGroups(await api.listGroups());
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const created = await api.createGroup({ name, require2fa });
      setName("");
      setRequire2fa(false);
      await reload();
      onOpen(created.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gruppe konnte nicht angelegt werden.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Gruppe wirklich löschen?")) {
      return;
    }
    await api.deleteGroup(id);
    await reload();
  }

  return (
    <main className="groups-list">
      <h1>Gruppen</h1>

      <form onSubmit={handleCreate} className="new-page-form">
        <input
          placeholder="Gruppenname"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <label className="inline-checkbox">
          <input
            type="checkbox"
            checked={require2fa}
            onChange={(event) => setRequire2fa(event.target.checked)}
          />
          2FA-Pflicht
        </label>
        <button type="submit">Neue Gruppe</button>
      </form>
      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Lädt …</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>2FA-Pflicht</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.id}>
                <td>
                  <button type="button" className="link" onClick={() => onOpen(group.id)}>
                    {group.name}
                  </button>
                </td>
                <td>{group.require2fa ? "ja" : "nein"}</td>
                <td>
                  <button type="button" onClick={() => handleDelete(group.id)}>
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
