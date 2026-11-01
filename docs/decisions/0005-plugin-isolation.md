# 0005 — Plugin-Isolation: Child-Prozess pro Plugin + Capability-Manifest

**Status:** Entschieden (2026-11-01)

## Kontext

Das Initial Brief benennt die sichere Ausführung fremder Plugins explizit als offene Architekturfrage und stellt klar: Ein reines Berechtigungs-Manifest allein ist keine Isolation, wenn der Plugin-Code trotzdem im selben Adressraum läuft wie der Core. Das Projekt will außerdem einen offenen Marketplace mit Plugins von Drittentwicklern — die Lösung muss also echte Sicherheit bieten, ohne die Einstiegshürde fürs Schreiben eines Plugins wesentlich zu erhöhen (sonst widerspricht sie der Begründung für TypeScript aus [0002](0002-backend-sprache.md)).

## Entscheidung

**Jedes Plugin läuft in einem eigenen Child-Prozess**, der über ein definiertes IPC-Protokoll mit dem Core kommuniziert. Der Plugin-Prozess hat keinen direkten Zugriff auf `fs`, `net`, `child_process` oder sonstige Node-APIs — nur auf die Capabilities, die ihm das `plugin-sdk` explizit als Funktionen über die IPC-Grenze bereitstellt (z. B. "Block registrieren", "auf CMS-Event X reagieren", "eigenen Settings-Namespace lesen/schreiben").

Darüber liegt weiterhin ein **Manifest/Permission-Modell**: Ein Plugin deklariert, welche Capabilities es braucht; der Core entscheidet (bzw. der Admin bestätigt bei der Installation), was davon gewährt wird. Die Prozessgrenze ist die _technische Durchsetzung_, das Manifest ist die _Richtlinie_ darüber, was über diese Grenze hinweg erlaubt wird — beides zusammen, nicht eins allein.

Vorbild: das Extension-Host-Modell von VS Code (Extensions laufen in einem separaten Node-Prozess, Kommunikation per Message-Passing, ein abstürzendes/böswilliges Extension reißt nicht den Haupt-Editor mit) — ein bewährtes Muster für genau dieses Problem (viele Drittanbieter-Erweiterungen, breite Entwickler-Basis, trotzdem robust).

## Geprüfte und verworfene Alternativen

- **Keine Isolation (Plugin-Code im Hauptprozess)** — das WordPress-Modell; genau das Sicherheitsproblem, das das Projekt vermeiden soll.
- **vm2** — vom eigenen Projekt als nicht sicher für echten Untrusted-Code eingestuft (mehrere bekannte Sandbox-Escapes, nicht mehr aktiv gewartet). Nicht verwendbar als Sicherheitsgrenze.
- **isolated-vm als alleinige Grenze** — echte V8-Isolates, deutlich sicherer als vm2, aber weiterhin im selben OS-Prozess (ein V8-Engine-Bug könnte theoretisch durchbrechen). Wird nicht als alleinige Sicherheitsgrenze genutzt, bleibt aber als möglicher interner Baustein für einzelne risikoarme Hot-Paths (z. B. Auswertung von Template-Ausdrücken) im Blick.
- **WASM-Sandboxing** (z. B. nach dem Vorbild von Shopify Functions: JS wird nach WASM kompiliert und läuft mit striktem Capability-Modell) — die stärkste verfügbare Isolation, aber höhere Build-Komplexität und eine andere Entwicklererfahrung als "normales TypeScript schreiben". Für v1 verworfen, als mögliche spätere Ausbaustufe vorgemerkt (z. B. für eine "verifiziert/sandboxed"-Marketplace-Kategorie).

## Konsequenzen

- `packages/plugin-runtime` übernimmt das Starten, Überwachen und Beenden der Plugin-Child-Prozesse sowie das IPC-Protokoll (Transport, Serialisierung, Timeouts).
- `packages/plugin-sdk` definiert die Capability-Funktionen, die einem Plugin über die Prozessgrenze zur Verfügung stehen, sowie das Manifest-Schema für angeforderte Berechtigungen.
- Ressourcenlimits (CPU/Memory) pro Plugin-Prozess werden über OS-/Container-Mechanismen (z. B. cgroups unter Docker) durchgesetzt, nicht durch Node selbst — das muss bei der Deployment-/Docker-Compose-Konfiguration berücksichtigt werden (Abschnitt 8 im Brief, Performance/Caching-ADR folgt separat).
- Die IPC-Kommunikation bringt Overhead gegenüber In-Process-Aufrufen mit sich — bei der API-Vertrags-Gestaltung zwischen Core und Plugins (Brief Abschnitt 12, Punkt 4) muss das berücksichtigt werden (z. B. Batching statt vieler kleiner Round-Trips).
- Dies ist eine Basisentscheidung für die Architektur, aber noch keine vollständige Spezifikation — das genaue IPC-Protokoll und der Capability-Katalog werden erst beim konkreten Plugin-SDK-Design (späterer Schritt) ausgearbeitet.
