# 0012 — Monorepo-Struktur und Paket-Abhängigkeitsregeln

**Status:** Entschieden (2026-11-01)

## Kontext

Brief Abschnitt 12 fordert eine konkrete Monorepo-Struktur und die Abhängigkeitsregeln zwischen den Paketen, bevor das Datenmodell und die API-Verträge entworfen werden. Das Brief gibt bereits eine grobe Struktur vor (Abschnitt 3); hier wird sie anhand der inzwischen getroffenen Entscheidungen (Rendering = Astro/React-Islands [0003], Backend = NestJS/Fastify [0004], Plugin-Isolation [0005], Theme = reine Konfiguration [0007], Content-Typ-System [0008]) konkretisiert.

Leitprinzip aus dem Brief, das hier technisch durchgesetzt wird: **Der CMS-Core darf nicht unmittelbar von einem bestimmten Theme oder Editor abhängen.**

## Struktur

```
presscraft/
├── apps/
│   ├── server/        NestJS + Fastify-Adapter — die einzige Laufzeit mit DB-Zugriff
│   ├── admin/          React-SPA — Administrationsoberfläche
│   └── web/            Astro — öffentliche Website
│
├── packages/
│   ├── shared/         generische, domänenfreie Utilities/Types (keine Abhängigkeiten)
│   ├── blocks/         Block-Typ-Schemas (Datenstruktur, kein UI-Framework-Code)
│   ├── theme-sdk/      Theme-Konfigurationsschema (Design-Tokens, Layout-Slots)
│   ├── database/       Drizzle-Schema, Migrations, DB-Client
│   ├── core/           domänenübergreifende Abstraktionen (Capability-/Permission-Hooks, Event-Bus)
│   ├── content/        Content-Typ-Registry, Feld-Schema-System, Content-Item-Logik
│   ├── auth/           Authentifizierung, Sessions, 2FA
│   ├── media/          Medien-/Upload-Verwaltung
│   ├── plugin-sdk/     öffentlicher Vertrag für Plugin-Autoren (Capabilities, Hooks, Manifest-Typen)
│   ├── plugin-runtime/ Prozess-Isolation: startet/überwacht Plugin-Child-Prozesse, IPC-Protokoll
│   ├── renderer/       gemeinsamer Rendering-Vertrag (React-Komponenten pro Block-Typ)
│   └── editor/         Editor-UI-Logik (Drag-and-drop, Undo/Redo, Block-Palette) — nutzt renderer für Live-Vorschau
│
├── plugins/            installierte Plugin-Pakete (anfangs leer)
├── themes/             installierte Theme-Pakete (anfangs leer, später ein "default"-Theme)
├── docker/             Docker-Compose-Setup für Self-Hosting
└── docs/
```

## Abhängigkeitsregeln

Pakete dürfen nur **abwärts** in dieser Reihenfolge importieren, nie aufwärts oder quer in eine andere "Spalte":

1. `shared` — keine internen Abhängigkeiten.
2. `blocks`, `theme-sdk` — nur `shared`.
3. `database` — nur `shared`.
4. `core` — nur `shared` (definiert die Hook-/Event-Abstraktionen, die `content`/`auth`/Plugins nutzen).
5. `content`, `auth`, `media` — `database`, `core`, `blocks` (niemals `editor`, `renderer`, `theme-sdk`).
6. `plugin-sdk` — `blocks`, `core`, `shared` (bewusst **nicht** `database`/`auth` direkt — Plugins bekommen nur Zugriff über vom Core bereitgestellte, capability-geprüfte Funktionen, nie rohen DB-Zugriff).
7. `plugin-runtime` — `plugin-sdk`, `core`.
8. `renderer`, `editor` — `blocks`, `theme-sdk`, `shared`.
9. `apps/server` — `core`, `database`, `content`, `auth`, `media`, `plugin-runtime`, `plugin-sdk`, `blocks`, `theme-sdk` (nur zum Validieren der Theme-Konfiguration beim Speichern, siehe [0007](0007-theme-vs-plugin-abgrenzung.md); ergänzt am 2026-11-02).
10. `apps/admin` — `editor`, `renderer` (für Live-Vorschau), `blocks`, `theme-sdk`, `shared`; spricht mit `apps/server` **ausschließlich über HTTP**, nie per direktem Import.
11. `apps/web` — `renderer`, `blocks`, `theme-sdk`, `shared`; spricht mit `apps/server` ebenfalls nur über HTTP.

**Apps importieren sich nie gegenseitig.** Das hält den modularen Monolithen (eine Laufzeit: `apps/server`) trotzdem intern modular getrennt.

## Konsequenzen

- Diese Regeln werden technisch durchgesetzt (z. B. über `eslint-plugin-boundaries` oder `dependency-cruiser` in der CI), nicht nur als Dokumentation — sonst erodiert die Modulgrenze erfahrungsgemäß innerhalb weniger Monate.
- `packages/renderer` liefert React-Komponenten pro Block-Typ, die sowohl von `apps/web` (Astro-Islands, siehe [0003](0003-rendering-technologie.md)) als auch von `apps/admin` (Live-Vorschau im Editor) genutzt werden — das erfüllt den gemeinsamen Rendering-Vertrag aus dem Brief.
- `packages/plugin-sdk` ist absichtlich von `database`/`auth` entkoppelt — das ist die Stelle, an der die Capability-Grenze aus [0005](0005-plugin-isolation.md) und [0006](0006-rechte-und-rollenmodell.md) technisch ansetzt.
