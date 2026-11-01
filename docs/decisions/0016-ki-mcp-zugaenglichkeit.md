# 0016 — KI-/MCP-Zugänglichkeit als verbindliches API-first-Prinzip

**Status:** Entschieden (2026-11-01)

## Kontext

Anforderung aus dem Gespräch: Das gesamte CMS soll per MCP (oder einem vergleichbaren Protokoll) von einer KI bedienbar sein — Design-Einstellungen vornehmen, Beiträge schreiben, User verwalten, kurz: alles, was ein menschlicher Admin im Backend tun kann. Das soll kein nachträglicher Aufsatz sein, sondern von Anfang an bei jeder Funktion mitgedacht werden.

Die Architektur ist dafür bereits günstig vorgeprägt: [0012](0012-monorepo-struktur.md) legt fest, dass `apps/admin` nie direkt auf `apps/server`-Internals zugreift, sondern ausschließlich über die versionierte REST-API aus [0014](0014-api-vertraege.md) spricht. Dieses ADR erhebt das vom strukturellen Nebeneffekt zur harten Anforderung.

## Entscheidung

1. **API-Vollständigkeit ist ein Fertigstellungskriterium, keine Nebensache.** Für jede Admin-Funktionalität (Theme-Einstellungen, Content, User-/Gruppenverwaltung, Plugin-Verwaltung, …) gilt: Wenn eine Aktion nicht ohne `apps/admin` — also rein per API-Call — ausführbar ist, ist das Feature nicht fertig. Es darf keinen UI-only-Zustand oder eine Aktion geben, die ausschließlich im Admin-Frontend implementiert ist.
2. **Ein MCP-Server ist eine dünne Adapter-Schicht, keine eigene Logik.** Er übersetzt MCP-Tool-Calls 1:1 auf dieselbe REST-API, die auch `apps/admin` nutzt — keine Duplikation von Geschäftslogik, kein zweiter Zugriffspfad mit eigenen Regeln. Ein zukünftiges `apps/mcp-server` (Ergänzung zur Struktur aus [0012](0012-monorepo-struktur.md)) wäre damit ein Client wie `apps/admin`/`apps/web`: spricht nur per HTTP mit `apps/server`, importiert nie dessen Internals.
3. **KI-Zugriff läuft über dieselben Sicherheitsmechanismen wie menschliche Admins** — Session-Login ([0013](0013-minimales-datenmodell.md)) und das Capability-/Gruppenmodell ([0006](0006-rechte-und-rollenmodell.md)). Ein KI-Agent bekommt einen eigenen User-Account und wird einer Gruppe mit genau den Capabilities zugewiesen, die er braucht — kein universeller Vollzugriffs-Bypass-Key. Das verhindert, dass KI-Zugriff die Rechtegrenzen umgeht, die für menschliche User gelten.
4. **Keine KI-spezifischen Sonderendpunkte.** Es gibt eine API, die sowohl von `apps/admin` als auch von einem MCP-Server konsumiert wird — keine zweite, "vereinfachte" API nur für KI-Zwecke, die separat gepflegt werden müsste und aus dem Takt geraten könnte.

## Konsequenzen

- Bei jedem künftigen Implementierungsschritt (Theme-Editor, Userverwaltung, Plugin-Verwaltung etc.) wird geprüft: Ist die zugehörige REST-API vollständig genug, dieselbe Aktion ohne UI auszuführen? "Nur über das Admin-UI machbar" gilt ab jetzt als Architekturfehler, nicht als Doku-Lücke.
- Der MCP-Server selbst ist **nicht** Teil von Meilenstein 1 ([0015](0015-implementierungsplan-meilenstein-1.md) bleibt unverändert) — aber jede jetzt gebaute API-Fläche wird so entworfen, dass ein MCP-Server später ohne Umbau der bestehenden Endpunkte draufgesetzt werden kann.
- Berührt künftige ADRs zu Theme-Editor, Userverwaltung und Plugin-Marketplace: deren API-Design muss dieses Prinzip erfüllen, sobald sie geplant werden.
