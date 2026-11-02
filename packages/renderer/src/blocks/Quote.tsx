import type { QuoteAttributes } from "@presscraft/blocks";

export function Quote({ text, cite }: QuoteAttributes) {
  return (
    <blockquote>
      <p>{text}</p>
      {cite && <footer>— {cite}</footer>}
    </blockquote>
  );
}
