import type { HeadingAttributes } from "@presscraft/blocks";

const LEVELS = [1, 2, 3, 4, 5, 6] as const;

export function HeadingBlockForm({
  attributes,
  onChange,
}: {
  attributes: HeadingAttributes;
  onChange: (attributes: HeadingAttributes) => void;
}) {
  return (
    <div className="heading-form">
      <select
        value={attributes.level}
        onChange={(event) =>
          onChange({
            ...attributes,
            level: Number(event.target.value) as HeadingAttributes["level"],
          })
        }
      >
        {LEVELS.map((level) => (
          <option key={level} value={level}>
            H{level}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={attributes.text}
        onChange={(event) => onChange({ ...attributes, text: event.target.value })}
      />
    </div>
  );
}
