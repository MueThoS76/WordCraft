import type { ButtonAttributes } from "@presscraft/blocks";

export function ButtonBlockForm({
  attributes,
  onChange,
}: {
  attributes: ButtonAttributes;
  onChange: (attributes: ButtonAttributes) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        placeholder="Beschriftung"
        value={attributes.label}
        onChange={(event) => onChange({ ...attributes, label: event.target.value })}
      />
      <input
        type="text"
        placeholder="Link (/seite oder https://…)"
        value={attributes.url}
        onChange={(event) => onChange({ ...attributes, url: event.target.value })}
      />
      <select
        value={attributes.style ?? "primary"}
        onChange={(event) =>
          onChange({ ...attributes, style: event.target.value as "primary" | "outline" })
        }
      >
        <option value="primary">Gefüllt</option>
        <option value="outline">Umrandet</option>
      </select>
    </div>
  );
}
