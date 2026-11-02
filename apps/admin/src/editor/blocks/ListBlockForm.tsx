import type { ListAttributes } from "@presscraft/blocks";

export function ListBlockForm({
  attributes,
  onChange,
}: {
  attributes: ListAttributes;
  onChange: (attributes: ListAttributes) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="mb-0 flex items-center gap-2 font-normal">
        <input
          type="checkbox"
          className="m-0 w-auto"
          checked={attributes.ordered}
          onChange={(event) => onChange({ ...attributes, ordered: event.target.checked })}
        />
        Nummerierte Liste
      </label>
      <textarea
        rows={4}
        placeholder="Ein Eintrag pro Zeile"
        value={attributes.items.join("\n")}
        onChange={(event) => onChange({ ...attributes, items: event.target.value.split("\n") })}
      />
    </div>
  );
}
