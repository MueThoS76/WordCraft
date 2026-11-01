# 0008 — Content-Typ-System: generisch und erweiterbar, mit typisierten Feldern

**Status:** Entschieden (2026-11-01, im Interview geklärt)

## Kontext

Die Vision will "feste Seiten" per WYSIWYG-Editor, langfristig aber auch den Großteil der WordPress-Funktionalität (inkl. Posts/Blog) und gute Ideen von Drupal übernehmen. Drupals bestimmendes Merkmal gegenüber WordPress ist sein Field-System: Content-Typen können eigene, typisierte, abfragbare Felder definieren, nicht nur freien Block-Inhalt.

## Entscheidung

- **Generisches Content-Typ-System von Anfang an.** "Page" ist nur die erste Instanz eines zugrunde liegenden Systems; "Post" und beliebige Custom-Content-Typen (von Plugins bereitgestellt, siehe Brief Abschnitt 6) kommen später als Konfiguration hinzu, nicht als Schema-Umbau.
- **Jeder Content-Typ hat:**
  - Kern-Metadaten (Titel, Slug, Status, Zeitstempel, Autor) — immer gleich, unabhängig vom Typ.
  - Einen **Block-Body** (die freie WYSIWYG-Fläche, strukturiert als versioniertes JSON-Dokument, siehe Brief Abschnitt 4).
  - Optional eigene **typisierte Felder** (Text, Zahl, Datum, Referenz, …), die direkt in der Datenbank abfragbar/sortierbar/filterbar sind — nicht im Block-JSON vergraben.
- **Meilenstein 1 nutzt nur den Typ "Page"**, ohne eigene Zusatzfelder — das Fundament (Typ-Definition, Feld-Schema) wird aber von Anfang an so gebaut, dass spätere Typen (Post, Event, Produkt, …) draufgesetzt werden können.

## Konsequenzen

- Datenmodell: eine `content_types`-Tabelle (oder Registry) mit Feld-Schema-Definition pro Typ, eine generische `content_items`-Tabelle für Kern-Metadaten, eine generische `content_field_values`-Struktur (oder typ-spezifische Tabellen, je nach Performance-Abwägung beim konkreten Datenmodell-Entwurf) für die typisierten Felder, plus der Block-Body als JSON-Spalte/-Dokument.
- `packages/content` definiert die Content-Typ-Registry und das Feld-Schema-System; Plugins registrieren neue Typen darüber (knüpft an Brief Abschnitt 6: "Plugins können eigene Datenmodelle bereitstellen").
- Die API-Verträge zwischen Backend, Editor und Renderer (nächster offener Schritt laut Brief Abschnitt 12) müssen sowohl den Block-Body als auch die typisierten Felder abdecken.
