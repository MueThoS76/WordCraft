import type { BlockDocument, BlockNode } from "@presscraft/blocks";
import { blockRenderers } from "./registry.js";

export function BlockDocumentRenderer({ document }: { document: BlockDocument }) {
  // Defensiv gegen fehlerhafte/fremde Daten (z. B. Altbestände, ein Bug an
  // anderer Stelle, ein Plugin, das kein gültiges BlockDocument liefert) —
  // eine kaputte Seite darf nie die ganze Render-Pipeline crashen lassen.
  if (!Array.isArray(document?.blocks)) {
    return null;
  }

  return (
    <>
      {document.blocks.map((block) => (
        <BlockNodeRenderer key={block.id} node={block} />
      ))}
    </>
  );
}

function BlockNodeRenderer({ node }: { node: BlockNode }) {
  const Component = blockRenderers[node.type];
  if (!Component) {
    return null;
  }

  return (
    <>
      <Component {...node.attributes} />
      {node.children?.map((child) => (
        <BlockNodeRenderer key={child.id} node={child} />
      ))}
    </>
  );
}
