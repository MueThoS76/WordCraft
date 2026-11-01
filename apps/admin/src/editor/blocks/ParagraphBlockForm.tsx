import type { ParagraphAttributes } from "@presscraft/blocks";

export function ParagraphBlockForm({
  attributes,
  onChange,
}: {
  attributes: ParagraphAttributes;
  onChange: (attributes: ParagraphAttributes) => void;
}) {
  return (
    <textarea
      rows={3}
      value={attributes.text}
      onChange={(event) => onChange({ text: event.target.value })}
    />
  );
}
