import type { BlockDocument } from "@presscraft/blocks";

/**
 * Lokal redeklarierte Antwortformen statt eines Imports aus
 * @presscraft/content: apps/admin darf laut ADR 0012 nur editor, renderer,
 * blocks, theme-sdk, shared importieren, nicht die server-seitigen
 * Content-Pakete (die hängen von @presscraft/database ab). Der in ADR 0014
 * angedachte eigene "/contracts"-Entry-Point für packages/content ist für
 * dieses Meilenstein-1-Ausmaß bewusst noch nicht gebaut — TODO, sobald mehr
 * als eine App diese Typen teilen muss.
 */
export type ContentStatus = "draft" | "published";

export interface ContentItem {
  id: string;
  contentTypeId: string;
  slug: string;
  status: ContentStatus;
  title: string;
  blockBody: BlockDocument | Record<string, never>;
  publishedBlockBody: BlockDocument | null;
  fieldValues: Record<string, unknown>;
  /** Zugeordnete Kategorien (nur bei Content-Typen, die sie nutzen, nicht leer). */
  categories?: CategorySummary[];
  authorId: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentType {
  id: string;
  label: string;
  providedBy: string;
  fieldSchema: Record<string, unknown>;
}

export interface Me {
  id: string;
  email: string;
  totpEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppUser {
  id: string;
  email: string;
  totpEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  require2fa: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GroupDetail extends Group {
  capabilities: { capabilityId: string }[];
  members: { id: string; email: string }[];
}

export interface Capability {
  id: string;
  providedBy: string;
  description: string | null;
}

export interface MediaItem {
  id: string;
  storedName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  altText: string;
  uploadedBy: string;
  createdAt: string;
  /** Vollständige, öffentlich abrufbare URL der Datei. */
  url: string;
}

export interface CategorySummary {
  id: string;
  slug: string;
  name: string;
}

export interface Category extends CategorySummary {
  description: string;
  /** Anzahl zugeordneter Items (nur in der Admin-Liste gefüllt). */
  itemCount?: number;
}

export interface RevisionSummary {
  id: string;
  statusAtSave: ContentStatus;
  createdAt: string;
  createdByEmail: string | null;
  blockCount: number;
  snippet: string;
}

export interface DashboardData {
  system: {
    version: string;
    nodeVersion: string;
    uptimeSeconds: number;
    database: { ok: boolean; latencyMs: number };
  };
  content: {
    byType: Record<string, { published: number; draft: number }>;
    recent: {
      id: string;
      contentTypeId: string;
      title: string;
      status: ContentStatus;
      updatedAt: string;
    }[];
    categories: number;
  } | null;
  media: { count: number; totalBytes: number } | null;
  users: { users: number; groups: number } | null;
}
