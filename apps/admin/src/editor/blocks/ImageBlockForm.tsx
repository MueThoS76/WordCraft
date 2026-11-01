import type { ImageAttributes } from "@presscraft/blocks";

export function ImageBlockForm({
  attributes,
  onChange,
}: {
  attributes: ImageAttributes;
  onChange: (attributes: ImageAttributes) => void;
}) {
  return (
    <div className="image-form">
      <input
        type="text"
        placeholder="Bild-URL"
        value={attributes.src}
        onChange={(event) => onChange({ ...attributes, src: event.target.value })}
      />
      <input
        type="text"
        placeholder="Alt-Text"
        value={attributes.alt}
        onChange={(event) => onChange({ ...attributes, alt: event.target.value })}
      />
      <input
        type="text"
        placeholder="Bildunterschrift (optional)"
        value={attributes.caption ?? ""}
        onChange={(event) => onChange({ ...attributes, caption: event.target.value || undefined })}
      />
    </div>
  );
}
