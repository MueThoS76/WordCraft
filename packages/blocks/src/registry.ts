import type { z } from "zod";

/**
 * Jeder Block-Typ (Core oder Plugin) deklariert hier sein Attribute-Schema.
 * Die Editor- und Render-Komponenten dazu leben in packages/editor bzw.
 * packages/renderer (ADR 0012, ADR 0014) — dieses Paket kennt nur die Daten.
 */
export interface BlockTypeDefinition<Attributes = Record<string, unknown>> {
  id: string;
  label: string;
  attributesSchema: z.ZodType<Attributes>;
  /** Darf dieser Block-Typ Kind-Blocks enthalten (z. B. Spalten, Gruppen)? Default: false. */
  allowsChildren?: boolean;
}

export class BlockTypeRegistry {
  private readonly types = new Map<string, BlockTypeDefinition>();

  register(definition: BlockTypeDefinition): void {
    if (this.types.has(definition.id)) {
      throw new Error(`Block-Typ "${definition.id}" ist bereits registriert.`);
    }
    this.types.set(definition.id, definition);
  }

  get(id: string): BlockTypeDefinition | undefined {
    return this.types.get(id);
  }

  has(id: string): boolean {
    return this.types.has(id);
  }

  list(): BlockTypeDefinition[] {
    return [...this.types.values()];
  }
}
