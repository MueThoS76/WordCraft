import { useEffect, useState, type FormEvent } from "react";
import { ApiError, api } from "../api/client";
import type { AppUser } from "../api/types";

export function UsersListPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setUsers(await api.listUsers());
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.createUser({ email, password });
      setEmail("");
      setPassword("");
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "User konnte nicht angelegt werden.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("User wirklich löschen?")) {
      return;
    }
    try {
      await api.deleteUser(id);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "User konnte nicht gelöscht werden.");
    }
  }

  return (
    <main className="users-list">
      <h1>Benutzer</h1>

      <form onSubmit={handleCreate} className="new-page-form">
        <input
          type="email"
          placeholder="E-Mail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button type="submit">Neuer User</button>
      </form>
      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Lädt …</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>E-Mail</th>
              <th>2FA</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.totpEnabled ? "aktiviert" : "—"}</td>
                <td>
                  <button type="button" onClick={() => handleDelete(user.id)}>
                    Löschen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="hint">
        Gruppenzuweisung erfolgt über die Gruppenseite — dort einen User als Mitglied hinzufügen.
      </p>
    </main>
  );
}
