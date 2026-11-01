# 0009 — Redaktions-Workflow: Entwurf/Veröffentlicht + revisionsfähige Datenstruktur

**Status:** Entschieden (2026-11-01, im Interview geklärt)

## Kontext

Der Brief erwähnt bereits Undo/Redo, Autosave und ein "versioniertes JSON-Dokument" für Inhalte (Abschnitt 4), ohne zu klären, ob das nur ein Undo-Stack innerhalb der aktuellen Editier-Sitzung ist oder ein echter Redaktions-Workflow mit Status und persistenter Revisionshistorie wie bei WordPress/Drupal.

## Entscheidung

- Jeder Content-Typ (siehe [0008](0008-content-typ-system.md)) bekommt einen **Status**: `draft` (Entwurf) oder `published` (Veröffentlicht). Ein Redakteur kann an einem Entwurf arbeiten, während die zuletzt veröffentlichte Version live bleibt.
- Die Speicherstruktur wird so angelegt, dass eine **vollständige Revisionshistorie** später ohne Schema-Umbau ergänzt werden kann (jede gespeicherte Version referenzierbar, nicht nur die aktuell aktive).
- **Meilenstein 1 / erste Umsetzung:** nur die zwei Status `draft`/`published`, ohne Revisions-Browsing-UI. Undo/Redo bleibt zusätzlich ein session-lokaler Stack im Editor (unverändert aus dem Brief).

## Konsequenzen

- `content_items` bekommt ein `status`-Feld; das Datenmodell trennt konzeptionell "aktuelle Arbeitsversion" von "veröffentlichter Stand" (z. B. über eine Revisions-Tabelle, die von Anfang an mitgeplant, aber in v1 nur mit der aktuellen und der veröffentlichten Version gefüllt wird).
- Die Rendering-Pipeline (Astro, siehe [0003](0003-rendering-technologie.md)) liest ausschließlich den `published`-Stand; der Editor liest/schreibt den Entwurf.
- "Geplant" (zeitgesteuerte Veröffentlichung) ist als möglicher dritter Status für später vorgemerkt, nicht Teil dieser Entscheidung.
