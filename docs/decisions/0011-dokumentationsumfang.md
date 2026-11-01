# 0011 — Dokumentationsumfang: vollständig für öffentliche Schnittstellen, nicht für interne Implementierung

**Status:** Entschieden (2026-11-01, im Interview geklärt)

## Kontext

Die Vision fordert: "Alles dokumentieren! Jede Schnittstelle, jede Funktion. Alles." Im Gespräch wurde geklärt, ob das auch interne Implementierungsdetails einschließt oder sich auf das beschränkt, was Dritte (Plugin-/Theme-Entwickler, Admins) tatsächlich konsultieren.

## Entscheidung

**Vollständige Referenzdokumentation für alle öffentlichen Schnittstellen:**

- REST-API-Endpunkte
- Plugin-SDK (Funktionen, Hooks, Capabilities, Manifest-Schema)
- Theme-SDK (Konfigurationsschema, Design-Tokens, Layout-Slots)
- CLI-Befehle

Diese werden, wo möglich, automatisch aus dem Code generiert (TypeDoc für TS-Typen/Funktionen, OpenAPI für die REST-API) und durch handgeschriebene Anleitungen ergänzt (z. B. "wie schreibe ich ein Plugin").

**Interne/private Implementierungsdetails werden nicht pauschal dokumentationspflichtig.** Sie folgen stattdessen guter Namensgebung und den allgemeinen Entwicklungsprinzipien aus dem Brief (Abschnitt 10) — eine Pflicht, jede private Hilfsfunktion zu kommentieren, erzeugt erfahrungsgemäß mehr Rauschen als Nutzen und verrottet schneller, als sie gepflegt wird.

## Konsequenzen

- CI/Tooling kann künftig prüfen, ob öffentliche Exporte (Plugin-SDK, Theme-SDK, REST-Controller) eine Dokumentation haben — nicht, ob jede Funktion im Code kommentiert ist.
- Das deckt sich mit Prinzip 6 aus dem Brief ("Öffentliche Schnittstellen versionierbar gestalten") — Versionierung und Dokumentation gehören zusammen und betreffen denselben Kreis von Schnittstellen.
- `docs/` wird künftig auch generierte API-Referenzen aufnehmen (Ablagestruktur folgt, sobald die ersten Schnittstellen existieren).
