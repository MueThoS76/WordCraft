import type {
  BlockDocument,
  BlockNode,
  ButtonAttributes,
  HeadingAttributes,
  ImageAttributes,
  JsonValue,
  ListAttributes,
  ParagraphAttributes,
  QuoteAttributes,
} from "@presscraft/blocks";
import { useRef, useState } from "react";
import { ButtonBlockForm } from "./blocks/ButtonBlockForm";
import { HeadingBlockForm } from "./blocks/HeadingBlockForm";
import { ImageBlockForm } from "./blocks/ImageBlockForm";
import { ListBlockForm } from "./blocks/ListBlockForm";
import { ParagraphBlockForm } from "./blocks/ParagraphBlockForm";
import { QuoteBlockForm } from "./blocks/QuoteBlockForm";

/**
 * Meilenstein 1 (ADR 0015, Schritt 8): Reihenfolge per Auf/Ab-Buttons ändern
 * reicht zum Start — volles Drag-and-drop (dnd-kit) kann später nachgezogen
 * werden, ohne dass sich das Datenmodell (BlockDocument) ändert.
 */
const BLOCK_TYPES = [
  { id: "core/paragraph", label: "Absatz" },
  { id: "core/heading", label: "Überschrift" },
  { id: "core/image", label: "Bild" },
  { id: "core/list", label: "Liste" },
  { id: "core/quote", label: "Zitat" },
  { id: "core/divider", label: "Trennlinie" },
  { id: "core/button", label: "Button" },
] as const;

function createDefaultAttributes(type: string): Record<string, JsonValue> {
  switch (type) {
    case "core/paragraph":
      return { text: "" };
    case "core/heading":
      return { text: "", level: 2 };
    case "core/image":
      return { src: "", alt: "" };
    case "core/list":
      return { ordered: false, items: [""] };
    case "core/quote":
      return { text: "" };
    case "core/divider":
      return {};
    case "core/button":
      return { label: "", url: "", style: "primary" };
    default:
      return {};
  }
}

export function BlockEditor({
  blockDocument,
  onChange,
}: {
  blockDocument: BlockDocument;
  onChange: (next: BlockDocument) => void;
}) {
  function updateBlock(index: number, attributes: Record<string, JsonValue>) {
    const blocks = [...blockDocument.blocks];
    blocks[index] = { ...blocks[index], attributes };
    onChange({ ...blockDocument, blocks });
  }

  function removeBlock(index: number) {
    onChange({ ...blockDocument, blocks: blockDocument.blocks.filter((_, i) => i !== index) });
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blockDocument.blocks.length) {
      return;
    }
    const blocks = [...blockDocument.blocks];
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    onChange({ ...blockDocument, blocks });
  }

  // State nur für die Hervorhebung; die Quelle steht zusätzlich in einem Ref,
  // damit der Drop-Handler sie unabhängig vom Render-Timing zuverlässig sieht.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const dragSource = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function dropOn(target: number) {
    const source = dragSource.current;
    if (source === null || source === target) {
      return;
    }
    const blocks = [...blockDocument.blocks];
    const [moved] = blocks.splice(source, 1);
    blocks.splice(target, 0, moved);
    onChange({ ...blockDocument, blocks });
  }

  function addBlock(type: string) {
    const newBlock: BlockNode = {
      id: crypto.randomUUID(),
      type,
      attributes: createDefaultAttributes(type),
    };
    onChange({ ...blockDocument, blocks: [...blockDocument.blocks, newBlock] });
  }

  return (
    <div className="block-editor">
      {blockDocument.blocks.map((block, index) => (
        <div
          key={block.id}
          className={`block-card ${overIndex === index && dragIndex !== index ? "outline outline-2 outline-indigo-500" : ""}`}
          onDragOver={(event) => {
            if (dragSource.current !== null) {
              event.preventDefault();
              setOverIndex(index);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            dropOn(index);
            dragSource.current = null;
            setDragIndex(null);
            setOverIndex(null);
          }}
        >
          <div className="block-card-header">
            <strong className="flex items-center gap-2">
              <span
                role="img"
                aria-label="Zum Verschieben ziehen"
                title="Zum Verschieben ziehen"
                draggable
                className="cursor-grab select-none text-slate-400"
                onDragStart={(event) => {
                  dragSource.current = index;
                  setDragIndex(index);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", block.id);
                  const card = (event.currentTarget as HTMLElement).closest(".block-card");
                  if (card) {
                    event.dataTransfer.setDragImage(card, 16, 16);
                  }
                }}
                onDragEnd={() => {
                  dragSource.current = null;
                  setDragIndex(null);
                  setOverIndex(null);
                }}
              >
                ⠿
              </span>
              {BLOCK_TYPES.find((t) => t.id === block.type)?.label ?? block.type}
            </strong>
            <div className="block-card-actions">
              <button type="button" onClick={() => moveBlock(index, -1)} disabled={index === 0}>
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveBlock(index, 1)}
                disabled={index === blockDocument.blocks.length - 1}
              >
                ↓
              </button>
              <button type="button" onClick={() => removeBlock(index)}>
                Entfernen
              </button>
            </div>
          </div>
          <BlockAttributesForm
            type={block.type}
            attributes={block.attributes}
            onChange={(attributes) => updateBlock(index, attributes)}
          />
        </div>
      ))}

      <div className="add-block">
        {BLOCK_TYPES.map((blockType) => (
          <button key={blockType.id} type="button" onClick={() => addBlock(blockType.id)}>
            + {blockType.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BlockAttributesForm({
  type,
  attributes,
  onChange,
}: {
  type: string;
  attributes: Record<string, JsonValue>;
  onChange: (attributes: Record<string, JsonValue>) => void;
}) {
  switch (type) {
    case "core/paragraph":
      return (
        <ParagraphBlockForm attributes={attributes as ParagraphAttributes} onChange={onChange} />
      );
    case "core/heading":
      return <HeadingBlockForm attributes={attributes as HeadingAttributes} onChange={onChange} />;
    case "core/image":
      return <ImageBlockForm attributes={attributes as ImageAttributes} onChange={onChange} />;
    case "core/list":
      return <ListBlockForm attributes={attributes as ListAttributes} onChange={onChange} />;
    case "core/quote":
      return <QuoteBlockForm attributes={attributes as QuoteAttributes} onChange={onChange} />;
    case "core/divider":
      return <p className="m-0 text-sm text-slate-500">Eine horizontale Trennlinie.</p>;
    case "core/button":
      return <ButtonBlockForm attributes={attributes as ButtonAttributes} onChange={onChange} />;
    default:
      return <p>Unbekannter Block-Typ: {type}</p>;
  }
}
