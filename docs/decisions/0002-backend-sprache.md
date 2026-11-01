# 0002 — Backend-Sprache: TypeScript bestätigt

**Status:** Entschieden (im Gespräch bestätigt am 2026-11-01)

## Kontext

Das Initial Brief hatte TypeScript bereits als "Festgelegt" markiert, aber ausdrücklich betont, dass offene bzw. vorläufige Punkte nicht einfach durchgewunken werden sollen. Im Gespräch wurde TypeScript deshalb bewusst gegen zwei Alternativen geprüft:

- **Ruby on Rails**
- **Elixir/Phoenix**

## Entscheidung

TypeScript (Node.js-Backend, React-Admin, ein gemeinsames Typsystem über den ganzen Stack) bleibt die Kernsprache des Projekts.

## Geprüfte Alternativen und warum sie verworfen wurden

**Ruby on Rails**

- Der visuelle WYSIWYG-Editor erfordert sowieso ein JS-schweres Frontend (React). Ein Ruby-Backend würde Backend und Frontend in zwei getrennte Sprach-/Typsysteme aufspalten — Validierung und Typdefinitionen für Seiten/Block-Inhalte könnten nicht zwischen Backend, Editor und künftigem Plugin-SDK geteilt werden.
- Performance/Concurrency-Modell ist für viele gleichzeitige Requests schwächer als Node.
- Kein Vorteil, der die genannten Nachteile aufwiegt.

**Elixir/Phoenix (inkl. Phoenix LiveView)**

- Technisch ernstzunehmend: Phoenix LiveView wäre eine elegante Antwort auf "besonders flüssige und reaktionsschnelle Administrationsoberfläche" (Server-State + WebSocket-Updates statt klassischer SPA), und BEAM/OTP bietet starke Fehlerisolation und Concurrency — beides Eigenschaften, die einem CMS-Core zugutekommen.
- Ausschlaggebend gegen Elixir: das Projektziel eines **offiziellen Marketplace mit kostenlosen Plugins/Themes von Drittentwicklern** (Brief, Abschnitt 7). Dieses Ökosystem-Ziel hängt direkt an der Größe des verfügbaren Entwickler-Pools. TypeScript/JavaScript hat mit großem Abstand die breiteste Verbreitung unter Webentwicklern; Elixir ist eine kleine, spezialisierte Community. Für "viele Drittentwickler bauen Plugins" ist die Reichweite der Sprache wichtiger als ihre technische Eleganz.

## Konsequenzen

- TypeScript bleibt für Backend, Admin-Frontend und Plugin-SDK verbindlich — ein Plugin-Autor schreibt TS gegen dieselben Typen, die auch der Core nutzt.
- Die LiveView-Idee (Server hält State, pusht Updates, minimaler Client-JS-Overhead) wird nicht übernommen, ist aber als Inspiration für die Admin-UI-Architektur notiert — falls React-SPA-Performance später zum Problem wird, lohnt ein Blick auf vergleichbare Patterns im React/JS-Ökosystem (z. B. Server Components, HTMX-artige Ansätze), statt die Kernsprache zu wechseln.
- Dies schließt die "Vorläufig"-Markierung für die Backend-Sprache in [0001-open-questions.md](0001-open-questions.md) ab; Node.js als Runtime ist damit implizit bestätigt (folgt direkt aus TypeScript + Backend). NestJS/Fastify als konkretes Framework sind davon unabhängig weiterhin offen.
