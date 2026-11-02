import { describe, expect, it } from "vitest";
import { detectImageType } from "./validate-image.js";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const GIF = Buffer.from("GIF89a....", "ascii");
const WEBP = Buffer.concat([
  Buffer.from("RIFF", "ascii"),
  Buffer.from([1, 0, 0, 0]),
  Buffer.from("WEBPVP8 ", "ascii"),
]);

describe("detectImageType", () => {
  it("erkennt PNG, JPEG, GIF und WebP an den Magic Bytes", () => {
    expect(detectImageType(PNG)).toBe("image/png");
    expect(detectImageType(JPEG)).toBe("image/jpeg");
    expect(detectImageType(GIF)).toBe("image/gif");
    expect(detectImageType(WEBP)).toBe("image/webp");
  });

  it("lehnt SVG, HTML und Zufallsdaten ab", () => {
    expect(
      detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')),
    ).toBeNull();
    expect(detectImageType(Buffer.from("<html><script>alert(1)</script></html>"))).toBeNull();
    expect(detectImageType(Buffer.from([1, 2, 3]))).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });
});
