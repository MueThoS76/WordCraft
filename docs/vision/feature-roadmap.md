# Feature-Roadmap: die Langfrist-Vision für PressCraft

> Diese Liste ist **kein Umsetzungsplan für morgen**, sondern die Zielvorstellung, wie PressCraft als echter WordPress-Konkurrent langfristig aussehen soll. Sie wird Schritt für Schritt umgesetzt — Meilenstein 1 (siehe [Initial Brief, Abschnitt 11](../00-brief/initial-brief.md#11-erster-meilenstein)) bleibt bewusst minimal: eine Seite erstellen, speichern, öffentlich darstellen. Diese Roadmap bestimmt aber schon jetzt, wie die Architektur gebaut wird, damit spätere Erweiterung kein Umbau wird.

Herkunft: Nutzer-Interview vom 2026-11-01, mit [grill-me](../decisions/) durchgesprochen. Jeder Punkt verlinkt die ADR, die die zugrunde liegende Architekturentscheidung dokumentiert — auch wenn die eigentliche _Umsetzung_ des Feature-Punkts noch aussteht.

## Userverwaltung

- Users, Gruppen, Capability-System (System + Plugins deklarieren Rechte, Zuweisung nur über Gruppen).
- 2FA optional für alle, pro Gruppe erzwingbar.
- → Architektur entschieden: [0006-rechte-und-rollenmodell.md](../decisions/0006-rechte-und-rollenmodell.md)

## Seiten, Blocks, Content

- Feste Seiten per WYSIWYG-Blockeditor (Meilenstein 1).
- Generisches Content-Typ-System: später Posts/Blog, Custom-Types von Plugins, Drupal-artige typisierte Felder pro Typ.
- Redaktions-Workflow: Entwurf/Veröffentlicht, revisionsfähige Struktur.
- → Architektur entschieden: [0008-content-typ-system.md](../decisions/0008-content-typ-system.md), [0009-redaktions-workflow.md](../decisions/0009-redaktions-workflow.md)

## Theme-System

- Online-Editor, alles änderbar, keine Bezahlschranke für Einstellungen (expliziter Gegenentwurf zu WordPress).
- Themes sind reine Design-Konfiguration; neue Bausteine kommen über Plugins.
- → Architektur entschieden: [0007-theme-vs-plugin-abgrenzung.md](../decisions/0007-theme-vs-plugin-abgrenzung.md)

## Plugins (= "Addins")

- Erweiterbarkeit: neue Blocks, Admin-UI-Erweiterungen, eigene Datenmodelle, API-Endpunkte, Event-Reaktionen, eigene Settings.
- Sichere Ausführung über Prozess-Isolation + Capability-Manifest.
- Künftig: offizieller Marketplace für kostenlose Open-Source-Plugins/Themes (Brief Abschnitt 7) — noch nicht Teil der aktuellen Planung.
- → Architektur entschieden: [0005-plugin-isolation.md](../decisions/0005-plugin-isolation.md)

## Einrichtung & Betrieb

- Einrichtungsassistent bei Erstinstallation (DB-Verbindung, erster Admin-Account, Opt-in-Abfrage für Installations-Statistik).
- Admin-Dashboard: reiner Update-Status (Core/Plugins/Themes) — bewusst keine Werbung oder irrelevante Inhalte.
- Update-Check default an und transparent, Installations-Statistik default aus (Opt-in).
- → Architektur entschieden: [0010-updates-und-telemetrie.md](../decisions/0010-updates-und-telemetrie.md)

## Sicherheit

- Grundsatz: Sicherheit geht vor Feature-Tempo.
- Plugin-Isolation (Child-Prozess + Manifest), erzwingbares 2FA für sensible Gruppen.
- → Architektur entschieden: [0005-plugin-isolation.md](../decisions/0005-plugin-isolation.md), [0006-rechte-und-rollenmodell.md](../decisions/0006-rechte-und-rollenmodell.md)

## Design

- Standard-Theme mit vollwertigem Desktop- und Mobile-Design (ergibt sich aus den Editor-Vorgaben für Geräte-Vorschau, Brief Abschnitt 4).

## Dokumentation

- Vollständige Referenzdoku für alle öffentlichen Schnittstellen (REST-API, Plugin-SDK, Theme-SDK, CLI).
- → Architektur entschieden: [0011-dokumentationsumfang.md](../decisions/0011-dokumentationsumfang.md)

## Inspirationsquellen

- Großteil der WordPress-Funktionalität als Zielbild.
- Gute Konzepte aus Drupal (insbesondere das Field-System) und anderen CMS gezielt übernehmen, wo sie einen echten Vorteil bringen — nicht blind kopieren.
