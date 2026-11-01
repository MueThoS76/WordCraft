# PressCraft

Ein vollständig Open-Source und self-hostbares Content-Management-System als moderne Alternative zu WordPress — mit visuellem WYSIWYG-Seiteneditor, programmierbaren/visuell konfigurierbaren Themes und einem erweiterbaren Plugin-System.

**Meilenstein 1 ist erreicht:** Seiten per Admin-UI erstellen, mit Blöcken befüllen und veröffentlichen — live auf der öffentlichen Astro-Seite sichtbar. Die langfristige Vision (Userverwaltung, Theme-Editor, Plugin-Marketplace, …) ist architektonisch vorbereitet, aber noch nicht umgesetzt — siehe [`docs/vision/feature-roadmap.md`](docs/vision/feature-roadmap.md).

## Schnellstart (Self-Hosting)

```bash
pnpm install
pnpm selfhost:up
```

Danach: Admin-UI unter `http://localhost:3000/admin` (Login: `admin@presscraft.local` / `presscraft-dev` — **vor echtem Einsatz ändern**, siehe `.env.example`), öffentliche Seite unter `http://localhost:4321`. Details: [`docker/README.md`](docker/README.md).

## Entwicklung

```bash
pnpm install
pnpm db:up          # nur Postgres, für lokal laufende Dev-Server
pnpm build
pnpm test
```

Danach z. B. `apps/server` (`pnpm --filter @presscraft/server dev`), `apps/web` (`pnpm --filter @presscraft/web dev`) und `apps/admin` (`pnpm --filter @presscraft/admin dev`) einzeln starten.

## Dokumentation

- [`docs/00-brief/initial-brief.md`](docs/00-brief/initial-brief.md) — die ursprüngliche Projektbeschreibung und der Ausgangsauftrag.
- [`docs/vision/feature-roadmap.md`](docs/vision/feature-roadmap.md) — die langfristige Feature-Vision mit Verweis auf die jeweilige Architekturentscheidung.
- [`docs/decisions/0001-open-questions.md`](docs/decisions/0001-open-questions.md) — Übersicht über Status aller Architekturentscheidungen.
- [`docs/decisions/0015-implementierungsplan-meilenstein-1.md`](docs/decisions/0015-implementierungsplan-meilenstein-1.md) — der abgeschlossene Implementierungsplan für Meilenstein 1.

Alle Architekturentscheidungen werden als ADRs unter `docs/decisions/` dokumentiert.
