import type { ParagraphAttributes } from "@presscraft/blocks";

export function Paragraph({ text }: ParagraphAttributes) {
  return <p>{text}</p>;
}
