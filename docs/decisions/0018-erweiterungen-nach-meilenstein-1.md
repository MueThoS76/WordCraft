# 0018 — Erweiterungen nach Meilenstein 1 (Stand 2026-11-02)

**Status:** Umgesetzt (in einer durchgehenden Arbeitssitzung, mit Tests)

## Kontext

Nach Meilenstein 1 (Seiten) und der Userverwaltung ([0017](0017-implementierungsplan-userverwaltung.md)) fehlten die Funktionen, die ein CMS im Alltag erst brauchbar machen. Dieses Dokument hält fest, was umgesetzt wurde und welche Entscheidungen dabei getroffen wurden, damit sie später nachvollziehbar sind. Keine dieser Entscheidungen ändert die Architekturrahmen aus [0002](0002-backend-sprache.md)–[0016](0016-ki-mcp-zugaenglichkeit.md).

## Umgesetzt

| Bereich                          | Kern der Umsetzung                                                                                                                                                                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Admin-Layout**                 | Sidebar links (gruppiert, einklappbar), React Router mit echten URLs, Tailwind. Navigation als Daten (`layout/navigation.ts`), damit Plugins später Einträge beisteuern können. Altes CSS bleibt in einer eigenen CSS-Ebene unter den Tailwind-Utilities.                            |
| **Medienbibliothek**             | Tabelle `media_items`, Dateien im Dateisystem (`MEDIA_DIR`), Upload nur PNG/JPEG/GIF/WebP bis 10 MB, **Typprüfung an den Magic Bytes** statt am Browser-Content-Type, **kein SVG** (Skript-Risiko). Öffentliche Auslieferung mit strenger UUID-Dateinamenprüfung.                    |
| **Beiträge und Kategorien**      | Content-Typ `post` (Feld: Auszug), Kategorien n:m (`categories`, `content_item_categories`). Öffentliche Listen-API (`/public/posts`, Filter + Paging), Astro-Seiten `/blog`, `/blog/<slug>`, `/kategorie/<slug>`.                                                                   |
| **Revisionen**                   | Entwurfs-Revisionen beim Speichern. **Autosaves werden zusammengefasst** (5 Minuten, gleicher Nutzer), unveränderte Stände ignoriert, maximal 50 pro Item. Wiederherstellen sichert vorher den aktuellen Entwurf und lässt den veröffentlichten Stand unberührt.                     |
| **Dashboard**                    | Kennzahlen, zuletzt Bearbeitetes, Systemstatus. Abschnitte nur mit passender Capability sichtbar. Bewusst **keine Update-Prüfung** vorgetäuscht — sie steht als „noch nicht eingerichtet“ da, bis [0010](0010-updates-und-telemetrie.md) umgesetzt ist.                              |
| **Einstellungen und Navigation** | Schlüssel/Wert-Tabelle `site_settings` (Titel, Untertitel, Startseite, Menü, Fußzeile, Theme). Link-Ziele nur relative Pfade oder http(s), serverseitig und im Frontend geprüft.                                                                                                     |
| **Block-Validierung**            | Der Server prüft beim Speichern jeden Block gegen das Schema seines Typs. [0014](0014-api-vertraege.md) sah das vor, es war aber nicht verdrahtet — vorher wurde nur die Dokumentstruktur geprüft.                                                                                   |
| **Weitere Blöcke**               | Liste, Zitat, Trennlinie, Button; Drag-and-drop zum Umsortieren (natives HTML5, keine neue Abhängigkeit).                                                                                                                                                                            |
| **Design-Editor**                | `theme-sdk` definiert ein Theme als streng validierte Konfiguration (Hex-Farben, Schrift aus fester Liste, Zahlenbereiche) → sichere CSS-Variablen ([0007](0007-theme-vs-plugin-abgrenzung.md)). Presets, Kontrastwarnung (WCAG), Live-Vorschau. Kein Freitext-CSS.                  |
| **Feeds und SEO**                | `/feed.xml`, `/sitemap.xml`, `/robots.txt`, Meta-Description, Open-Graph-Tags. Basis-URL über `SITE_URL`.                                                                                                                                                                            |
| **Einrichtungsassistent**        | **Kein Standard-Admin mehr**: Ohne gesetztes `ADMIN_PASSWORD` legt der Server keinen Account an, `/admin` zeigt stattdessen die Einrichtung (Passwort mind. 12 Zeichen). `POST /setup` funktioniert nur, solange kein User existiert, danach 403. Compose setzt keinen Default mehr. |

## Entscheidungen im Detail

- **`apps/server` darf `theme-sdk` importieren** (nur zur Validierung der Theme-Konfiguration beim Speichern). Das war in [0012](0012-monorepo-struktur.md) nicht vorgesehen und wurde dort ergänzt. Der Kern (`content`) bleibt frei von `theme-sdk` und speichert das Theme nur als opake JSON-Einstellung.
- **Validierung an zwei Stellen** bei allem, was ins HTML oder CSS der öffentlichen Seite fließt (Menü-Links, Theme, Button-Links): beim Schreiben im Server und beim Lesen im Frontend. Eine kaputte oder manipulierte Einstellung darf die öffentliche Seite weder unsicher noch unbenutzbar machen.
- **Medien liegen im Dateisystem**, nicht in der Datenbank. Für mehrere Server-Instanzen oder Objektspeicher wäre ein Speicher-Adapter nötig — bewusst noch nicht gebaut.
- **Einrichtungsassistent mit Prozess-lokaler Sperre**: Schützt vor gleichzeitigen Requests einer einzelnen Server-Instanz. Bei mehreren Instanzen bräuchte es eine Datenbank-Sperre.

## Bekannte Lücken

- Kein Plugin-System ([0005](0005-plugin-isolation.md)) und kein Marketplace; die Navigation und die Block-Registry sind darauf vorbereitet.
- Update-Prüfung und optionale Installations-Statistik ([0010](0010-updates-und-telemetrie.md)) fehlen noch.
- Block-Editor arbeitet mit Formularen pro Block, nicht mit direkter Bearbeitung auf der Seite (kein echtes WYSIWYG).
- Keine Seiten-Hierarchie, keine Kommentare, keine Suche, keine zeitgesteuerte Veröffentlichung, keine Mehrsprachigkeit.
- Rate-Limiting für Login und Einrichtung fehlt.
- Die Revisionen speichern Inhalt und Feldwerte, aber nicht Titel und Slug.
