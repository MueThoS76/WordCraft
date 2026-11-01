# 0013 — Minimales Datenmodell: Users/Groups, Content-Typen, Plugins/Themes

**Status:** Entschieden (2026-11-01)

## Kontext

Brief Abschnitt 12, Punkt 3, verlangt ein minimales Datenmodell für Seiten und Inhaltsblöcke — unter Berücksichtigung der inzwischen getroffenen Entscheidungen: gruppenbasiertes Rechtemodell mit erzwingbarem 2FA ([0006](0006-rechte-und-rollenmodell.md)), generisches Content-Typ-System mit typisierten Feldern ([0008](0008-content-typ-system.md)), Entwurf/Veröffentlicht-Workflow mit Revisionsfähigkeit ([0009](0009-redaktions-workflow.md)) und getrennter Update-/Telemetrie-Mechanismus ([0010](0010-updates-und-telemetrie.md)).

Alle Tabellen leben in PostgreSQL, Zugriff über Drizzle ([0001](0001-open-questions.md)), ausschließlich durch `apps/server` (siehe [0012](0012-monorepo-struktur.md)).

## Entscheidung: Tabellen (Kernmodell, v1)

**Auth & Rechte**

- `users` — id, email, password_hash, totp_secret (nullable), totp_recovery_codes (jsonb, nullable), totp_enabled, created_at, updated_at.
- `groups` — id, name, require_2fa (bool), created_at, updated_at.
- `user_groups` — user_id, group_id (n:m).
- `capabilities` — id ("content.page.edit" usw.), provided_by ("core" oder Plugin-ID), description.
- `group_capabilities` — group_id, capability_id (n:m).
- `sessions` — id (opaker Token), user_id, created_at, expires_at, two_factor_verified (bool).

**Content**

- `content_types` — id ("page"), label, provided_by ("core" oder Plugin-ID), field_schema (jsonb: Definition der typisierten Felder dieses Typs).
- `content_items` — id, content_type_id, slug, status (`draft` \| `published`), title, block_body (jsonb, aktueller Entwurf), published_block_body (jsonb, nullable — letzter veröffentlichter Stand), field_values (jsonb, passend zum field_schema des Typs), author_id, published_at (nullable), created_at, updated_at.
- `content_revisions` — id, content_item_id, block_body (jsonb-Snapshot), field_values (jsonb-Snapshot), status_at_save, created_by, created_at. _(v1: wird minimal bei jeder Veröffentlichung befüllt, noch ohne Browsing-UI — siehe [0009](0009-redaktions-workflow.md).)_

**Erweiterung**

- `plugins` — id, version, manifest (jsonb: deklarierte Capabilities/Content-Typen/Blocks), enabled, installed_at.
- `themes` — id, version, config (jsonb: Design-Tokens, Layout-Slot-Zuweisungen), active, installed_at.

## Entscheidung im Vorbeigehen: Session-basierte Authentifizierung statt JWT

Für den Login-Mechanismus fällt hier eine kleine, bisher nicht explizit entschiedene Wahl an: **Server-seitige Sessions mit sicherem, httpOnly-Cookie**, nicht JWT. Begründung: Sessions lassen sich sofort serverseitig widerrufen (z. B. bei Verdacht auf Kompromittierung, oder beim Logout) — bei JWT ohne zusätzliche Revocation-Liste ist ein ausgestelltes Token bis zum Ablauf gültig, egal was passiert. Das passt besser zu "Sicherheit geht immer vor" ([0006](0006-rechte-und-rollenmodell.md)). Die `sessions`-Tabelle trägt zusätzlich `two_factor_verified`, damit der erzwingbare 2FA-Schritt pro Gruppe ([0006](0006-rechte-und-rollenmodell.md)) im Login-Flow geprüft werden kann.

## Offen gelassener Trade-off: `field_values` als JSONB

Die typisierten Felder eines Content-Typs ([0008](0008-content-typ-system.md)) werden in v1 als ein einziges JSONB-Feld auf `content_items` gespeichert, nicht als normalisierte Einzel-Spalten oder EAV-Tabelle. PostgreSQL unterstützt Filtern/Sortieren auf JSONB-Pfaden über Expression-/GIN-Indizes gut genug für den Anfang — das erfüllt die "abfragbar"-Anforderung aus [0008](0008-content-typ-system.md), ohne pro Content-Typ eigene Tabellen generieren zu müssen. Sollte das bei komplexeren Abfragen (Sortierung über mehrere Felder, Aggregationen) an Grenzen stoßen, ist eine normalisierte Feld-Tabelle eine spätere, nicht-brechende Migration — keine Architekturänderung.

## Konsequenzen

- `packages/database` definiert diese Tabellen als Drizzle-Schema; `packages/content` und `packages/auth` bauen ihre Logik darauf.
- `packages/plugin-sdk`/`plugin-runtime` lesen/schreiben nie direkt in diesen Tabellen — nur über die von `apps/server` bereitgestellten, capability-geprüften Funktionen (siehe [0012](0012-monorepo-struktur.md)).
- Dies ist das **Kernmodell**, nicht das Endmodell — neue Content-Typen, Plugin-eigene Datenmodelle (Brief Abschnitt 6) und die volle Revisionshistorie-UI kommen später hinzu, ohne dass dieses Grundgerüst umgebaut werden muss.
- Damit sind die Punkte 1–3 aus Brief Abschnitt 12 (Monorepo-Struktur, Abhängigkeitsregeln, minimales Datenmodell) bearbeitet. Offen bleiben Punkt 4 (API-Verträge zwischen Backend, Editor und Renderer) und Punkt 5 (schrittweiser Implementierungsplan) als nächste Schritte.
