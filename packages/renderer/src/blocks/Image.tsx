import type { ImageAttributes } from "@presscraft/blocks";

export function Image({ src, alt, caption }: ImageAttributes) {
  if (caption) {
    return (
      <figure>
        <img src={src} alt={alt} />
        <figcaption>{caption}</figcaption>
      </figure>
    );
  }
  return <img src={src} alt={alt} />;
}
