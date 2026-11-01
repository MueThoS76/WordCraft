# Initial Brief: PressCraft CMS

> Dies ist die unveränderte Original-Projektbeschreibung, wie sie zu Beginn des Projekts formuliert wurde. Sie dient als Ausgangspunkt für die Architektur- und Implementierungsplanung und sollte als Referenz erhalten bleiben, auch wenn einzelne Entscheidungen sich im Laufe des Projekts ändern.
>
> Hinweis aus der Beschreibung selbst: _"Offene Entscheidungen dürfen nicht eigenmächtig als endgültig festgelegt werden."_ Siehe [`../decisions/0001-open-questions.md`](../decisions/0001-open-questions.md) für den aktuellen Stand offener vs. festgelegter Punkte.

---

Die folgende Beschreibung dient als Ausgangspunkt für die Entwicklung eines modernen WordPress-Alternativsystems. Codex soll zunächst die Architektur berücksichtigen und das Projekt schrittweise implementieren. Offene Entscheidungen dürfen nicht eigenmächtig als endgültig festgelegt werden.

## 1. Projektziel

Entwicklung eines vollständig neuen, modernen Content-Management-Systems als Alternative zu WordPress.

Das CMS soll:

- Vollständig Open Source und kostenlos verfügbar sein.
- Auf eigenen Servern installiert werden können (Self-Hosted).
- Einen modernen visuellen WYSIWYG-Seiteneditor besitzen.
- Programmierbare und visuell konfigurierbare Themes unterstützen.
- Durch Plugins erweiterbar sein.
- Einen offiziellen Marketplace für kostenlose Open-Source-Plugins und -Themes erhalten.
- Schnelle, responsive und dynamische Webseiten erzeugen.
- Eine besonders flüssige und reaktionsschnelle Administrationsoberfläche bieten.
- Langfristig wartbar, sicher und modular erweiterbar sein.

Priorität: Benutzerfreundlichkeit, Performance, Sicherheit und langfristige Erweiterbarkeit.

## 2. Technologie-Stack

| Bereich            | Technologie          | Status        |
| ------------------ | -------------------- | ------------- |
| Programmiersprache | TypeScript           | Festgelegt    |
| Backend-Runtime    | Node.js              | Vorläufig     |
| Backend-Framework  | NestJS               | Vorläufig     |
| HTTP-Framework     | Fastify              | Vorläufig     |
| Admin-Frontend     | React                | Festgelegt    |
| UI-Styling         | Tailwind CSS         | Vorgeschlagen |
| UI-Komponenten     | shadcn/ui            | Vorgeschlagen |
| Rich-Text-Editor   | Tiptap / ProseMirror | Vorgeschlagen |
| Drag-and-drop      | dnd-kit              | Vorgeschlagen |
| Datenbank          | PostgreSQL           | Vorläufig     |
| ORM                | Drizzle              | Vorgeschlagen |
| Monorepo           | pnpm + Turborepo     | Vorgeschlagen |
| Deployment         | Docker Compose       | Vorgeschlagen |
| Lizenz             | GPLv3                | Vorgeschlagen |

Rust wurde als Alternative untersucht. Für die erste Version wird TypeScript bevorzugt, insbesondere wegen des Plugin-Ökosystems und der Entwicklungsgeschwindigkeit.

Die Rendering-Technologie ist noch nicht festgelegt.

## 3. Architektur

Das Projekt verwendet zunächst einen modularen Monolithen.
Keine Microservices, solange kein konkreter technischer Bedarf besteht.

Vorgeschlagene Monorepo-Struktur:

```
cms/
├── apps/
│   ├── server/
│   ├── admin/
│   └── web/
│
├── packages/
│   ├── core/
│   ├── database/
│   ├── auth/
│   ├── content/
│   ├── media/
│   ├── editor/
│   ├── blocks/
│   ├── renderer/
│   ├── theme-sdk/
│   ├── plugin-sdk/
│   ├── plugin-runtime/
│   └── shared/
│
├── plugins/
├── themes/
├── docker/
└── docs/
```

Die Architektur muss klare Modulgrenzen besitzen.
Der CMS-Core darf nicht unmittelbar von einem bestimmten Theme oder Editor abhängig sein.

## 4. Visueller Editor

Das CMS erhält einen eigenen blockbasierten WYSIWYG-Editor.

Anforderungen:

- Drag-and-drop von Komponenten
- Inline-Textbearbeitung
- Responsive Layouts
- Container, Spalten und Grid-Layouts
- Bilder, Videos und Medien
- Wiederverwendbare Komponenten
- Undo/Redo
- Autosave
- Vorschau für Desktop, Tablet und Smartphone
- Erweiterbarkeit durch Plugins

Editor und öffentliche Website müssen auf einem gemeinsamen Komponenten- beziehungsweise Rendering-Vertrag basieren.
Inhalte werden strukturiert gespeichert, beispielsweise als versioniertes JSON-Dokument.

## 5. Theme-System

Themes müssen sowohl programmatisch als auch visuell bearbeitbar sein.
Entwickler sollen eigene Themes erstellen können.

Benutzer sollen unter anderem folgende Eigenschaften konfigurieren können:

- Farben und Typografie
- Abstände und Layouts
- Header und Footer
- Navigation
- Seitenvorlagen
- Globale Design-Einstellungen

Das Theme-System muss eine stabile, versionierte Schnittstelle erhalten.

## 6. Plugin-System

Das CMS muss durch externe Entwickler erweiterbar sein.

Plugins sollen beispielsweise:

- Neue Inhaltsblöcke registrieren
- Admin-Oberflächen erweitern
- Eigene Datenmodelle bereitstellen
- API-Endpunkte ergänzen
- Auf definierte CMS-Ereignisse reagieren
- Eigene Einstellungen verwalten

Plugins dürfen nicht unkontrolliert auf interne Implementierungen des CMS-Core zugreifen.

**Wichtig:** Die sichere Ausführung fremder Plugins ist eine noch offene Architekturfrage. Ein Manifest oder Berechtigungsmodell allein stellt keine Isolation sicher.

Das Plugin-System muss frühzeitig berücksichtigt werden, auch wenn seine vollständige Implementierung später erfolgt.

## 7. Marketplace und Lizenzierung

Der CMS-Core soll dauerhaft freie Software bleiben.

Für den offiziellen Marketplace gelten folgende Ziele:

- Ausschließlich kostenlose Plugins und Themes
- Öffentlich verfügbarer Quellcode
- Keine kostenpflichtigen Funktionsfreischaltungen
- Keine künstlich eingeschränkten Pro-Versionen
- Keine verpflichtenden kostenpflichtigen Lizenzen

Die Installation externer Plugins bleibt möglich.

Die GPLv3 ist als Lizenz vorgesehen, muss aber hinsichtlich ihrer Auswirkungen auf Plugins und Themes noch geprüft werden.

## 8. Performance

Die wahrgenommene Geschwindigkeit besitzt hohe Priorität.

Das betrifft insbesondere:

- Flüssige Bedienung des Editors
- Schnelle Navigation in der Administration
- Reaktionsschnelles Drag-and-drop
- Hintergrundspeicherung
- Effiziente Datenbankzugriffe
- Minimierung unnötiger React-Re-Renders
- Schnelle Auslieferung öffentlicher Webseiten

Die Rendering-Architektur soll statische und dynamische Inhalte unterstützen.
Caching und gezielte Cache-Invalidierung müssen berücksichtigt werden.
Performance-Optimierungen sollen anhand reproduzierbarer Messungen erfolgen.

## 9. Sicherheit

Von Anfang an berücksichtigen:

- Rollenbasierte Berechtigungen
- Sichere Authentifizierung
- Schutz gegen XSS, CSRF und Injection-Angriffe
- Sichere Datei-Uploads
- Eingabevalidierung
- Sichere Plugin-Installation
- Abgesicherte API-Schnittstellen
- Datenbankmigrationen
- Automatisierte Sicherheitstests

Insbesondere darf die Plugin-Architektur keine falschen Sicherheitsgarantien suggerieren.

## 10. Entwicklungsprinzipien

Codex soll folgende Regeln beachten:

1. TypeScript mit strikter Typprüfung verwenden.
2. Klare Schnittstellen und Modulgrenzen schaffen.
3. Keine unnötigen Abstraktionen oder Microservices einführen.
4. Automatisierte Tests für kritische Funktionen schreiben.
5. Sicherheitsrelevante Entscheidungen dokumentieren.
6. Öffentliche Schnittstellen versionierbar gestalten.
7. Keine unnötigen Abhängigkeiten einführen.
8. Architekturentscheidungen in ADRs dokumentieren.
9. Bestehende Entscheidungen respektieren, aber technische Probleme ausdrücklich benennen.
10. In kleinen, überprüfbaren Schritten entwickeln.

## 11. Erster Meilenstein

Ziel: Eine Seite erstellen, speichern und öffentlich darstellen.

Der erste Meilenstein umfasst:

- Grundlegendes Monorepo
- Startfähiges NestJS/Fastify-Backend
- PostgreSQL-Anbindung
- React-Administrationsoberfläche
- Einfaches Content-Datenmodell
- API zum Erstellen und Abrufen einer Seite
- Einfacher blockbasierter Editor
- Öffentliche HTML-Ausgabe der gespeicherten Seite
- Grundlegende automatisierte Tests

Noch nicht implementieren:

- Marketplace
- Vollständiges Plugin-System
- Komplexe Theme-Verwaltung
- Shop-Funktionen
- Umfangreiche Benutzerverwaltung

Die Architektur muss spätere Erweiterungen ermöglichen, ohne diese bereits vollständig umzusetzen.

## 12. Konkreter Arbeitsauftrag an Codex

Beginne mit der technischen Planung des ersten Meilensteins.

Prüfe zunächst den vorgeschlagenen Stack und die Modulgrenzen auf technische Widersprüche und unnötige Komplexität.

Erstelle anschließend:

1. Eine konkrete Monorepo-Struktur.
2. Die Abhängigkeitsregeln zwischen den Paketen.
3. Ein minimales Datenmodell für Seiten und Inhaltsblöcke.
4. Die API-Verträge zwischen Backend, Editor und Renderer.
5. Einen schrittweisen Implementierungsplan.

**Wichtig:** Noch nicht das gesamte CMS implementieren.

Präsentiere zunächst die Architektur und den ersten konkreten Implementierungsschritt. Warte anschließend auf Freigabe, bevor größere Änderungen vorgenommen werden.
