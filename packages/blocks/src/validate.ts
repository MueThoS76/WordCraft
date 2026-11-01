import { blockDocumentSchema, type BlockDocument, type BlockNode } from "./document.js";
import type { BlockTypeRegistry } from "./registry.js";

export class UnknownBlockTypeError extends Error {
  constructor(public readonly blockType: string) {
    super(`Unbekannter Block-Typ "${blockType}".`);
  }
}

/**
 * Validiert ein BlockDocument strukturell UND prüft jeden Block gegen das
 * Attribute-Schema seines registrierten Typs. Wird serverseitig bei jedem
 * Speichern eines content_items.block_body aufgerufen (ADR 0014).
 */
export function validateBlockDocument(input: unknown, registry: BlockTypeRegistry): BlockDocument {
  const document = blockDocumentSchema.parse(input);
  for (const block of document.blocks) {
    validateBlockNode(block, registry);
  }
  return document;
}

function validateBlockNode(node: BlockNode, registry: BlockTypeRegistry): void {
  const definition = registry.get(node.type);
  if (!definition) {
    throw new UnknownBlockTypeError(node.type);
  }

  definition.attributesSchema.parse(node.attributes);

  if (!definition.allowsChildren && node.children && node.children.length > 0) {
    throw new Error(`Block-Typ "${node.type}" erlaubt keine Kind-Blocks.`);
  }

  for (const child of node.children ?? []) {
    validateBlockNode(child, registry);
  }
}
