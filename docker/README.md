# Docker

Self-Hosting-Setup via Docker Compose (`docker-compose.yml`): `postgres`, `server` (API + Admin-UI unter `/admin`) und `web` (öffentliche Astro-Seite).

## Nur die Datenbank (für lokale Entwicklung)

Wenn `apps/server`/`apps/web` direkt über `pnpm dev`/`node` laufen (wie in den Implementierungsschritten 1–9), reicht die Datenbank aus Docker:

- Starten: `pnpm db:up` (Root) — Postgres läuft dann auf `localhost:5433` (nicht 5432, siehe ADR 0015).
- Stoppen: `pnpm db:down`

## Kompletter Stack (Self-Hosting)

- Starten (baut bei Bedarf neu): `pnpm selfhost:up` (Root)
- Stoppen: `pnpm selfhost:down`
- Danach erreichbar: API/Admin unter `http://localhost:3000` (Admin-UI: `/admin`), öffentliche Seite unter `http://localhost:4321`.
- Migrationen laufen beim Start von `server` automatisch (`runMigrations()`), kein manueller Schritt nötig.
- Zugangsdaten sind reine Entwicklungs-Platzhalter (`presscraft`/`presscraft`, Admin-Login `admin@presscraft.local` / `presscraft-dev`), siehe `.env.example` — **vor echtem Einsatz ändern** (z. B. über `ADMIN_EMAIL`/`ADMIN_PASSWORD`-Umgebungsvariablen in `docker-compose.yml`).
- Die Dockerfiles kopieren bewusst das ganze Repo und bauen alles neu, statt eines größen-optimierten Multi-Stage-Builds — Einfachheit vor Image-Größe für Meilenstein 1 (siehe ADR 0015, Schritt 10).
