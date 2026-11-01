# 0004 — Backend-Framework: NestJS mit Fastify-Adapter

**Status:** Entschieden (2026-11-01)

## Kontext

Das Brief listete NestJS und Fastify als zwei separate "vorläufige" Punkte. Das ist technisch irreführend: Fastify ist kein Alternativ-Framework zu NestJS, sondern einer von zwei austauschbaren HTTP-Adaptern _unter_ NestJS (der andere ist Express). Die eigentliche Entscheidung ist: NestJS (mit viel Struktur/DI) oder rohes Fastify ohne Nest-Schicht (schlank, wenig Ceremony)?

## Entscheidung

**NestJS, mit Fastify als HTTP-Adapter** (statt des NestJS-Defaults Express) für bessere Rohdurchsatz-Performance.

Begründung: Das Brief fordert einen modularen Monolithen mit klaren Modulgrenzen und ein Plugin-System, das sich kontrolliert ins Core einhängen kann (neue Content-Blocks registrieren, Admin-UI erweitern, auf CMS-Events reagieren, eigene Settings verwalten). NestJS bringt genau dafür die passenden Bausteine bereits mit:

- **Module + Dependency Injection** → Plugins lassen sich als eigene Nest-Module modellieren, die über definierte Provider/Interfaces mit dem Core sprechen, statt wild auf interne Implementierungen zuzugreifen (das verlangt das Brief in Abschnitt 6 explizit).
- **Guards/Interceptors/Pipes** → wiederverwendbare Mechanismen für Validierung, Rollenrechte und Request-Hooks, die auch Plugin-Autoren zur Verfügung stehen, statt dass jedes Plugin eigene Patterns erfindet.
- **Decorators** → passt zu TypeScript mit strikter Typprüfung (Entwicklungsprinzip 1 im Brief) und macht öffentliche Schnittstellen (Controller, DTOs) explizit und versionierbar (Prinzip 6).

## Alternative geprüft: rohes Fastify ohne NestJS

Schneller zum Start, weniger Abstraktion — aber die Modul-/DI-Mechanik, die für ein sauberes Plugin-System sowieso gebraucht wird, müsste dann selbst gebaut werden (z. B. mit einer separaten DI-Lib wie Awilix). Das würde am Ende auf ein selbstgebautes, schlechter dokumentiertes Äquivalent zu dem hinauslaufen, was NestJS bereits bietet. Für ein Projekt, das langfristig von Drittentwicklern erweitert werden soll, ist die etablierte, dokumentierte Lösung die sinnvollere Wahl.

## Konsequenzen

- `apps/server` wird als NestJS-Projekt mit `@nestjs/platform-fastify` aufgesetzt.
- `packages/plugin-runtime` definiert, wie ein Plugin als Nest-Modul registriert und geladen wird — das ist unabhängig von der noch offenen Sandboxing-Frage (siehe [0001-open-questions.md](0001-open-questions.md)): NestJS-Module lösen das Problem der _Struktur_, nicht das Problem der _Isolation_ (ein Plugin könnte innerhalb des gleichen Prozesses trotzdem beliebigen Code ausführen). Das bleibt bewusst offen.
