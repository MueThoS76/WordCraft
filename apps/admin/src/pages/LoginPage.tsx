import { useState, type FormEvent } from "react";
import { ApiError, api } from "../api/client";

export function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [awaitingTwoFactor, setAwaitingTwoFactor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.login(email, password);
      if (result.requiresTwoFactor) {
        setAwaitingTwoFactor(true);
      } else {
        onLoggedIn();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTwoFactorSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.loginTwoFactor(code);
      onLoggedIn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Code ungültig.");
    } finally {
      setSubmitting(false);
    }
  }

  if (awaitingTwoFactor) {
    return (
      <main className="login-page">
        <h1>PressCraft Admin</h1>
        <form onSubmit={handleTwoFactorSubmit}>
          <label>
            Code aus der Authenticator-App
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              autoFocus
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? "Prüfe …" : "Bestätigen"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="login-page">
      <h1>PressCraft Admin</h1>
      <form onSubmit={handlePasswordSubmit}>
        <label>
          E-Mail
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Passwort
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Anmelden …" : "Anmelden"}
        </button>
      </form>
    </main>
  );
}
