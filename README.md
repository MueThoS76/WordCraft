# PressCraft

Ein vollständig Open-Source und self-hostbares Content-Management-System als moderne Alternative zu WordPress — mit visuellem WYSIWYG-Seiteneditor, programmierbaren/visuell konfigurierbaren Themes und einem erweiterbaren Plugin-System.

**Meilenstein 1 ist erreicht**, dazu kamen Userverwaltung mit 2FA und die Alltagsfunktionen eines CMS: Seiten und Beiträge mit Kategorien, Blöcke (Absatz, Überschrift, Bild, Liste, Zitat, Trennlinie, Button) mit Drag-and-drop, Medienbibliothek, Revisionsverlauf, Dashboard, Einstellungen und Menü, Design-Editor mit Live-Vorschau, RSS/Sitemap und ein Einrichtungsassistent. Was noch fehlt (vor allem Plugin-System und Update-Prüfung), steht in [`docs/decisions/0018-erweiterungen-nach-meilenstein-1.md`](docs/decisions/0018-erweiterungen-nach-meilenstein-1.md) und in [`docs/vision/feature-roadmap.md`](docs/vision/feature-roadmap.md).

## Schnellstart (Self-Hosting)

```bash
pnpm install
pnpm selfhost:up
```

Danach: Admin-UI unter `http://localhost:3000/admin` — beim ersten Aufruf erscheint der **Einrichtungsassistent**, in dem du deinen Admin-Account anlegst (es gibt kein Standardpasswort). Die öffentliche Seite liegt unter `http://localhost:4321`. Wer die Einrichtung automatisieren will, setzt `ADMIN_EMAIL` und `ADMIN_PASSWORD` (siehe `.env.example`). Details: [`docker/README.md`](docker/README.md).

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
