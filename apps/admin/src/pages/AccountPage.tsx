import { useEffect, useState, type FormEvent } from "react";
import { ApiError, api } from "../api/client";
import type { Me } from "../api/types";

export function AccountPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [enrollment, setEnrollment] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    setMe(await api.me());
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleStartEnroll() {
    setError(null);
    setEnrollment(await api.enrollTwoFactor());
  }

  async function handleConfirm(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.confirmTwoFactor(code);
      setEnrollment(null);
      setCode("");
      setMessage("2FA ist jetzt aktiviert.");
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Code ungültig.");
    }
  }

  async function handleDisable(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.disableTwoFactor(code);
      setCode("");
      setMessage("2FA ist jetzt deaktiviert.");
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Code ungültig.");
    }
  }

  if (!me) {
    return <p>Lädt …</p>;
  }

  return (
    <main className="account-page">
      <h1>Mein Account</h1>
      <p>{me.email}</p>
      {message && <p className="hint">{message}</p>}
      {error && <p className="error">{error}</p>}

      {me.totpEnabled ? (
        <>
          <p>Zwei-Faktor-Authentifizierung ist aktiviert.</p>
          <form onSubmit={handleDisable}>
            <label>
              Code zum Deaktivieren
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
              />
            </label>
            <button type="submit">2FA deaktivieren</button>
          </form>
        </>
      ) : enrollment ? (
        <>
          <p>Secret in der Authenticator-App eintragen (manuell, kein QR-Code):</p>
          <pre className="secret">{enrollment.secret}</pre>
          <form onSubmit={handleConfirm}>
            <label>
              Code aus der Authenticator-App
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
                autoFocus
              />
            </label>
            <button type="submit">Bestätigen</button>
          </form>
        </>
      ) : (
        <button type="button" onClick={handleStartEnroll}>
          2FA aktivieren
        </button>
      )}
    </main>
  );
}
