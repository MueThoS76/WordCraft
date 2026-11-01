import { describe, expect, it } from "vitest";
import {
  base32Decode,
  base32Encode,
  generateTotp,
  generateTotpSecret,
  hotp,
  verifyTotp,
} from "./totp.js";

describe("HOTP (RFC 4226, Appendix D)", () => {
  // Offizielle Testvektoren: Secret ist die ASCII-Zeichenfolge
  // "12345678901234567890" (20 Bytes), direkt als HMAC-Key — nicht Base32.
  const secret = Buffer.from("12345678901234567890", "ascii");
  const expected = [
    "755224",
    "287082",
    "359152",
    "969429",
    "338314",
    "254676",
    "287922",
    "162583",
    "399871",
    "520489",
  ];

  it.each(expected.map((value, counter) => [counter, value] as const))(
    "counter %i -> %s",
    (counter, value) => {
      expect(hotp(secret, counter)).toBe(value);
    },
  );
});

describe("TOTP (RFC 6238, Appendix B, SHA1, 8-stellig)", () => {
  // Dieselben 20 ASCII-Bytes wie oben, aber 8-stellige Codes und
  // zeitbasierte Counter (T = floor(Time / 30)).
  const secret = Buffer.from("12345678901234567890", "ascii");
  const cases: Array<[time: number, expected: string]> = [
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
  ];

  it.each(cases)("time %i -> %s", (time, expected) => {
    const counter = Math.floor(time / 30);
    expect(hotp(secret, counter, 8)).toBe(expected);
  });
});

describe("base32Encode/base32Decode", () => {
  it("round-trips arbitrary bytes", () => {
    const original = Buffer.from([0, 1, 2, 253, 254, 255, 42, 17]);
    expect(base32Decode(base32Encode(original))).toEqual(original);
  });

  it("round-trips a generated secret", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(base32Decode(secret)).toHaveLength(20);
  });
});

describe("generateTotp / verifyTotp", () => {
  it("verifies a code it just generated itself", () => {
    const secret = generateTotpSecret();
    const code = generateTotp(secret);
    expect(verifyTotp(secret, code)).toBe(true);
  });

  it("rejects a wrong code", () => {
    const secret = generateTotpSecret();
    const code = generateTotp(secret);
    const wrongCode = code === "000000" ? "111111" : "000000";
    expect(verifyTotp(secret, wrongCode)).toBe(false);
  });

  it("tolerates one time step of clock drift", () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    const oneStepEarlier = now - 30_000;
    const code = generateTotp(secret, oneStepEarlier);
    expect(verifyTotp(secret, code, now)).toBe(true);
  });

  it("rejects a code far outside the drift window", () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    const fiveMinutesEarlier = now - 5 * 60_000;
    const code = generateTotp(secret, fiveMinutesEarlier);
    expect(verifyTotp(secret, code, now)).toBe(false);
  });
});
