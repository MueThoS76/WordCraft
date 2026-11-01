# 0007 — Theme vs. Plugin: Themes sind reine Konfiguration

**Status:** Entschieden (2026-11-01, im Interview geklärt)

## Kontext

Die Vision fordert ein Theme-System mit Online-Editor, bei dem "alles änderbar" ist — ausdrücklich abgegrenzt von WordPress, wo echte Anpassbarkeit oft hinter bezahlten Themes/Plugins versteckt ist. Außerdem wurde im Gespräch geklärt, dass "Addin" dasselbe Konzept wie "Plugin" ist (einheitlicher Begriff: **Plugin**, siehe auch [0005-plugin-isolation.md](0005-plugin-isolation.md)).

## Entscheidung

**Ein Theme enthält keinen ausführbaren Code.** Es ist ausschließlich Design-Konfiguration: Farben, Typografie, Abstände, Layout-Zuweisungen (welche Komponente sitzt in Header/Footer/Navigation), welche Seitenvorlage wo genutzt wird, globale Design-Einstellungen. Weil ein Theme nie mehr tun kann als Einstellungen zu setzen, kann **jeder** dieser Werte sicher und vollständig im Online-Editor offengelegt werden — es gibt keine Sicherheits- oder Isolationsfrage, die etwas davon einschränken müsste.

Wer neue, eigene Bausteine mit echter Logik braucht (neue Block-Typen, neue interaktive Komponenten), baut dafür ein **Plugin** — das bekommt die in [0005](0005-plugin-isolation.md) beschlossene Child-Prozess-Isolation. Ein Theme wählt dann aus den verfügbaren Blocks (Core + installierte Plugins) aus und stylt sie frei.

"Individuell anpassbar" wird dadurch nicht eingeschränkt, sondern anders aufgeteilt: Design-Anpassung läuft immer über das Theme (ohne Bezahlschranke, ohne Codezugriff nötig), strukturelle/funktionale Erweiterung läuft über Plugins (mit der dafür vorgesehenen Sicherheitsgrenze).

## Konsequenzen

- `packages/theme-sdk` definiert ausschließlich Konfigurationsschemas (Design-Tokens, Layout-Slots), keine Ausführungsumgebung für Theme-Code.
- Die Brief-Formulierung "Themes müssen sowohl programmatisch als auch visuell bearbeitbar sein" (Abschnitt 5) wird so interpretiert: visuell = der Theme-Editor für jeden; programmatisch = ein Entwickler baut die zugrundeliegenden Blocks/Komponenten als Plugin, auf denen das Theme dann aufsetzt.
- Es gibt entsprechend keinen separaten Isolationsmechanismus für Themes — sie sind durch ihre Natur (reine Daten) bereits sicher.
