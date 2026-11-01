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
