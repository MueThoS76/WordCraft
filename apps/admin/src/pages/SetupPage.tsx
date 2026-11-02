import { useState, type FormEvent } from "react";
import { api } from "../api/client";

/**
 * Einrichtungsassistent für eine frische Installation: legt den ersten
 * Admin-Account an. Es gibt kein Standardpasswort (siehe BootstrapService).
 */
export function SetupPage({ onDone }: { onDone: () => void }) {
  const [siteTitle, setSiteTitle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.setup({ email, password, siteTitle: siteTitle.trim() || undefined });
      // Direkt anmelden, damit es nahtlos im Dashboard weitergeht.
      await api.login(email, password);
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Einrichtung fehlgeschlagen.");
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Willkommen bei PressCraft</h1>
      <p className="mb-4">
        Richte jetzt deine Installation ein. Der Account, den du hier anlegst, bekommt alle Rechte
        (Gruppe „Administratoren“).
      </p>
      <form onSubmit={handleSubmit}>
        <label>
          Name der Website
          <input
            value={siteTitle}
            placeholder="z. B. Mein Blog"
            onChange={(event) => setSiteTitle(event.target.value)}
          />
        </label>
        <label>
          E-Mail-Adresse
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Passwort (mindestens 12 Zeichen)
          <input
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label>
          Passwort wiederholen
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? "Richtet ein …" : "Einrichtung abschließen"}
        </button>
      </form>
    </main>
  );
}
