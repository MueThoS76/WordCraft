# Docker

Self-Hosting-Setup via Docker Compose.

`docker-compose.yml` enthält aktuell nur den lokalen Postgres für die Entwicklung (Schritt 2 des [Implementierungsplans](../docs/decisions/0015-implementierungsplan-meilenstein-1.md)). Server/Admin/Web kommen in Schritt 10 dazu.

- Starten: `pnpm db:up` (Root) — Postgres läuft dann auf `localhost:5433` (nicht 5432, siehe ADR 0015).
- Stoppen: `pnpm db:down`
- Zugangsdaten sind reine Entwicklungs-Platzhalter (`presscraft`/`presscraft`), siehe `.env.example`.
