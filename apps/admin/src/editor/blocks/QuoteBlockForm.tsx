import type { QuoteAttributes } from "@presscraft/blocks";

export function QuoteBlockForm({
  attributes,
  onChange,
}: {
  attributes: QuoteAttributes;
  onChange: (attributes: QuoteAttributes) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <textarea
        rows={3}
        placeholder="Zitat"
        value={attributes.text}
        onChange={(event) => onChange({ ...attributes, text: event.target.value })}
      />
      <input
        type="text"
        placeholder="Quelle (optional)"
        value={attributes.cite ?? ""}
        onChange={(event) => onChange({ ...attributes, cite: event.target.value || undefined })}
      />
    </div>
  );
}
