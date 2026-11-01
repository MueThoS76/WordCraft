import type { BlockDocument, BlockNode } from "@presscraft/blocks";
import { blockRenderers } from "./registry.js";

export function BlockDocumentRenderer({ document }: { document: BlockDocument }) {
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
