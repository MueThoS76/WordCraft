# 0001 — Status des Technologie-Stacks & offene Fragen

> Diese Übersicht ist **kein Beschluss**, sondern eine Momentaufnahme des Diskussionsstands aus dem [Initial Brief](../00-brief/initial-brief.md). Sie wird aktualisiert, sobald einzelne Punkte tatsächlich entschieden werden. Nichts hier ist final, bis es explizit als "Festgelegt" markiert wird und im Gespräch bestätigt wurde.
>
> Die langfristige Feature-Vision (Userverwaltung, Theme-System, Plugins, Dashboard, Dokumentationsanspruch, WordPress/Drupal-Inspiration) wurde am 2026-11-01 im Detail durchgesprochen — siehe [../vision/feature-roadmap.md](../vision/feature-roadmap.md) für die Gesamtübersicht und die ADRs 0006–0011 für die einzelnen Architekturentscheidungen daraus.

## Festgelegt

- **Sprache:** TypeScript — bestätigt im Gespräch gegen Ruby on Rails und Elixir/Phoenix, siehe [0002-backend-sprache.md](0002-backend-sprache.md).
- **Backend-Runtime:** Node.js — folgt direkt aus der Sprachentscheidung.
- **Admin-Frontend:** React, Build-Tool Vite (pragmatisch in Schritt 8 entschieden, konsistent mit dem Vite-basierten Astro-Stack).
- **Rendering öffentliche Website:** Astro (+ React-Islands für interaktive Blocks) — siehe [0003-rendering-technologie.md](0003-rendering-technologie.md).
- **Backend-Framework:** NestJS mit Fastify-Adapter — siehe [0004-backend-framework.md](0004-backend-framework.md).
- **Plugin-Isolation:** Child-Prozess pro Plugin + Capability-Manifest — siehe [0005-plugin-isolation.md](0005-plugin-isolation.md).
- **Rechte-/Rollenmodell:** gruppenbasiert, global, 2FA pro Gruppe erzwingbar — siehe [0006-rechte-und-rollenmodell.md](0006-rechte-und-rollenmodell.md).
- **Theme vs. Plugin:** Themes sind reine Konfiguration ohne Code — siehe [0007-theme-vs-plugin-abgrenzung.md](0007-theme-vs-plugin-abgrenzung.md).
- **Content-Typ-System:** generisch/erweiterbar mit typisierten Feldern — siehe [0008-content-typ-system.md](0008-content-typ-system.md).
- **Redaktions-Workflow:** Entwurf/Veröffentlicht, revisionsfähig — siehe [0009-redaktions-workflow.md](0009-redaktions-workflow.md).
- **Update-Check & Telemetrie:** getrennte Mechanismen, unterschiedliche Defaults — siehe [0010-updates-und-telemetrie.md](0010-updates-und-telemetrie.md).
- **Dokumentationsumfang:** vollständig für öffentliche Schnittstellen — siehe [0011-dokumentationsumfang.md](0011-dokumentationsumfang.md).
- **Monorepo-Struktur & Paket-Abhängigkeitsregeln:** siehe [0012-monorepo-struktur.md](0012-monorepo-struktur.md).
- **Minimales Datenmodell** (Users/Groups, Content-Typen, Plugins/Themes, Session-Auth statt JWT): siehe [0013-minimales-datenmodell.md](0013-minimales-datenmodell.md).
- **API-Verträge** (Block-Dokument-Format, REST-API, Contracts-Pakete, Astro On-Demand-Rendering): siehe [0014-api-vertraege.md](0014-api-vertraege.md).
- **Implementierungsplan Meilenstein 1** (10 Schritte): siehe [0015-implementierungsplan-meilenstein-1.md](0015-implementierungsplan-meilenstein-1.md) — Schritte 1–8 umgesetzt.
- **KI-/MCP-Zugänglichkeit als API-first-Prinzip:** jede Admin-Funktionalität muss vollständig per API nutzbar sein, keine UI-only-Logik — siehe [0016-ki-mcp-zugaenglichkeit.md](0016-ki-mcp-zugaenglichkeit.md).

## Vorläufig (angenommen, aber noch zu bestätigen)

- Datenbank: PostgreSQL

Rust wurde als Alternative zu TypeScript untersucht, aber für v1 verworfen (Begründung: Plugin-Ökosystem, Entwicklungsgeschwindigkeit).

## Vorgeschlagen (noch zu prüfen, keine Zusage)

- UI-Styling: Tailwind CSS
- UI-Komponenten: shadcn/ui
- Rich-Text-Editor: Tiptap / ProseMirror
- Drag-and-drop: dnd-kit
- ORM: Drizzle
- Monorepo-Tooling: pnpm + Turborepo
- Deployment: Docker Compose
- Lizenz: GPLv3 (inkl. Prüfung der Auswirkung auf Plugins/Themes)

## Ausdrücklich offen / ungelöst

- **GPLv3-Auswirkungen** auf Plugin- und Theme-Lizenzierung (z. B. Linking-Fragen bei Fremd-Plugins) sind ungeprüft.

## Architekturrahmen (bereits im Brief vorgegeben, nicht neu zu verhandeln, aber zu respektieren)

- Modularer Monolith, keine Microservices ohne konkreten technischen Bedarf.
- CMS-Core darf nicht direkt von einem bestimmten Theme oder Editor abhängen.
- Editor und öffentliche Website teilen sich einen gemeinsamen Komponenten-/Rendering-Vertrag.
- Architekturentscheidungen sollen künftig als ADRs in diesem Ordner dokumentiert werden (Prinzip 8 aus dem Brief).
- Jede Admin-Funktionalität muss vollständig per API nutzbar sein, nicht nur über das UI — damit das CMS auch von KI-Agenten (MCP o. ä.) bedienbar ist (ADR 0016).

## Nächste Schritte

Brief Abschnitt 12 ist jetzt vollständig bearbeitet:

1. ~~Stack und Modulgrenzen prüfen.~~ ✅
2. ~~Konkrete Monorepo-Struktur festlegen.~~ ✅ [0012](0012-monorepo-struktur.md)
3. ~~Abhängigkeitsregeln zwischen Paketen definieren.~~ ✅ [0012](0012-monorepo-struktur.md)
4. ~~Minimales Datenmodell für Seiten/Blocks entwerfen.~~ ✅ [0013](0013-minimales-datenmodell.md)
5. ~~API-Verträge zwischen Backend, Editor und Renderer entwerfen.~~ ✅ [0014](0014-api-vertraege.md)
6. ~~Schrittweisen Implementierungsplan für Meilenstein 1 erstellen.~~ ✅ [0015](0015-implementierungsplan-meilenstein-1.md)

Die Umsetzung von [0015](0015-implementierungsplan-meilenstein-1.md) läuft: Monorepo, Datenbank, `packages/blocks`, `apps/server`-Grundgerüst und die Content-API (Schritte 1–5) sind fertig und verifiziert. Weiter geht's mit Schritt 6 (`packages/renderer` + `apps/web`).
