/**
 * Erlaubte Bildformate der Medienbibliothek. SVG ist bewusst nicht dabei:
 * SVG kann Skripte enthalten und wäre ohne Sanitizing ein XSS-Risiko
 * (Sicherheit geht vor Feature-Tempo, siehe docs/vision/feature-roadmap.md).
 */
export const ALLOWED_IMAGE_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
} as const;

export type AllowedImageType = keyof typeof ALLOWED_IMAGE_TYPES;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Erkennt den Bildtyp an den ersten Bytes (Magic Bytes). Der vom Browser
 * gemeldete Content-Type wird bewusst ignoriert, weil er frei fälschbar ist.
 */
export function detectImageType(buffer: Buffer): AllowedImageType | null {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (buffer.length >= 6) {
    const header = buffer.subarray(0, 6).toString("ascii");
    if (header === "GIF87a" || header === "GIF89a") {
      return "image/gif";
    }
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}
