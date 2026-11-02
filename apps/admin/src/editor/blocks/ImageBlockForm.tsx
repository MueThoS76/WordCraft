import type { ImageAttributes } from "@presscraft/blocks";
import { useState } from "react";
import { MediaPicker } from "../../media/MediaPicker";

export function ImageBlockForm({
  attributes,
  onChange,
}: {
  attributes: ImageAttributes;
  onChange: (attributes: ImageAttributes) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="image-form flex flex-col items-stretch gap-2">
      {attributes.src && (
        <img
          src={attributes.src}
          alt={attributes.alt}
          className="max-h-40 max-w-full self-start rounded border border-slate-200 object-contain"
        />
      )}
      <button type="button" onClick={() => setPickerOpen(true)}>
        {attributes.src ? "Bild ändern" : "Bild aus Medienbibliothek wählen"}
      </button>
      <input
        type="text"
        placeholder="Bild-URL (oder oben aus der Bibliothek wählen)"
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
      {pickerOpen && (
        <MediaPicker
          onClose={() => setPickerOpen(false)}
          onSelect={(item) => {
            // Alt-Text aus der Bibliothek nur übernehmen, wenn im Block noch keiner steht.
            onChange({ ...attributes, src: item.url, alt: attributes.alt || item.altText });
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
