# 0014 — API-Verträge zwischen Backend, Editor und Renderer

**Status:** Entschieden (2026-11-01)

## Kontext

Letzter konzeptioneller Punkt aus Brief Abschnitt 12 (Punkt 4), bevor es an die Umsetzung von Meilenstein 1 geht. Legt fest, wie `apps/admin` (Editor) und `apps/web` (Astro-Renderer) mit `apps/server` sprechen, und wie Block- bzw. Feld-Schemas zwischen allen Beteiligten geteilt werden, ohne die Abhängigkeitsregeln aus [0012](0012-monorepo-struktur.md) zu verletzen.

## Entscheidung

### 1. Block-Dokument: das zentrale Datenformat

```ts
type BlockNode = {
  id: string; // uuid
  type: string; // z. B. "core/paragraph", "myplugin/custom-block"
  attributes: Record<string, JsonValue>; // gegen das Attribute-Schema des Block-Typs validiert
  children?: BlockNode[]; // für Container-Blocks (Spalten, Gruppen)
};

type BlockDocument = {
  schemaVersion: number;
  blocks: BlockNode[];
};
```

Jeder Block-Typ (von Core oder einem Plugin über `plugin-sdk` registriert) definiert: eine ID, ein Attribute-Schema (Zod, in `packages/blocks`), eine Editor-Komponente (in `packages/editor`) und eine Render-Komponente (in `packages/renderer`) — letztere wird von `apps/web` als Astro-Island **und** von `apps/admin` als Live-Vorschau verwendet (der gemeinsame Rendering-Vertrag aus dem Brief, konkretisiert).

### 2. Contracts-Pakete statt Server-Import

Ergänzung zu [0012](0012-monorepo-struktur.md): `apps/admin` und `apps/web` dürfen nicht `apps/server` importieren, brauchen aber dieselben Request-/Response-Typen für Typsicherheit. Lösung: `packages/content` und `packages/auth` exportieren über einen separaten, DB-freien Entry-Point (`@presscraft/content/contracts`, `@presscraft/auth/contracts`) reine TypeScript-Typen/Zod-Schemas für Inputs/Outputs. `apps/server` validiert damit eingehende Requests, `apps/admin`/`apps/web` nutzen dieselben Typen für ihren API-Client. Die Lint-Boundary-Regel aus [0012](0012-monorepo-struktur.md) wird entsprechend erweitert: Apps dürfen nur den `/contracts`-Entry-Point importieren, nicht die volle Paket-Implementierung.

### 3. REST-API (versioniert unter `/api/v1`)

**Öffentlich (kein Login nötig, liefert ausschließlich veröffentlichten Stand):**

- `GET /api/v1/public/content/:typeId/:slug` — für `apps/web`; liefert **nie** Entwürfe, serverseitig erzwungen, nicht nur Konvention.

**Redaktion (Login erforderlich):**

- `POST /api/v1/auth/login`, `POST /api/v1/auth/login/2fa`, `POST /api/v1/auth/logout`
- `GET /api/v1/content-types`, `GET /api/v1/content-types/:id`
- `GET|POST /api/v1/content/:typeId`, `GET|PATCH|DELETE /api/v1/content/:typeId/:id`
- `POST /api/v1/content/:typeId/:id/publish`, `.../unpublish`
- `GET /api/v1/blocks` — Registry aller verfügbaren Block-Typen (inkl. Plugin-Blocks) für die Editor-Palette
- `GET /api/v1/themes/active`, `PATCH /api/v1/themes/:id`

Fehler einheitlich als `{ error: { code, message } }`. Versionierung über den URL-Pfad, passend zu Brief-Prinzip 6 ("öffentliche Schnittstellen versionierbar gestalten").

### 4. Wie `apps/web` Inhalte bekommt

Astro läuft in **On-Demand-Rendering** (SSR-Adapter, z. B. `@astrojs/node`), ruft pro Request die öffentliche Content-API auf. Keine Build-Time-Static-Generation in v1 — das würde einen Rebuild-Trigger bei jeder Veröffentlichung brauchen, was die Caching-/Invalidierungs-Frage (Brief Abschnitt 8, bereits in [0003](0003-rendering-technologie.md) auf später verschoben) vorzeitig aufmachen würde. HTTP-Caching (Cache-Control) kann später ergänzt werden, ohne diese Entscheidung zu ändern.

## Konsequenzen

- `packages/blocks` bekommt zusätzlich zur Attribute-Schema-Definition die `BlockDocument`/`BlockNode`-Typen als zentrale Exportschnittstelle.
- `apps/server` validiert jedes PATCH auf `content_items.block_body` gegen das Schema des jeweiligen Block-Typs (serverseitig, nicht nur im Editor).
- Damit ist Brief Abschnitt 12 vollständig bearbeitet (Punkte 1–4); Punkt 5 (Implementierungsplan) folgt in [0015](0015-implementierungsplan-meilenstein-1.md).
