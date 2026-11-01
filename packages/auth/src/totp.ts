import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Eigene TOTP-Implementierung nach RFC 6238 (aufbauend auf HOTP, RFC 4226)
 * statt eines externen Pakets — konsistent mit der scrypt-Entscheidung aus
 * Implementierungsschritt 7 (ADR 0017, Schritt 6). HMAC-SHA1 über Node-
 * `crypto`, Base32 für die manuelle Secret-Eingabe in Authenticator-Apps
 * (kein QR-Code in diesem Durchgang, siehe Trade-off in ADR 0017).
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
/** Toleriert ±1 Zeitschritt Clock-Drift zwischen Server und Authenticator-App. */
const TOTP_WINDOW = 1;

export function base32Encode(buffer: Buffer): string {
  let bits = "";
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, "0");
  }

  let output = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    output += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }

  const remainder = bits.length % 5;
  if (remainder > 0) {
    const lastChunk = bits.slice(bits.length - remainder).padEnd(5, "0");
    output += BASE32_ALPHABET[parseInt(lastChunk, 2)];
  }
  return output;
}

export function base32Decode(value: string): Buffer {
  const cleaned = value.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Ungültiges Base32-Zeichen: "${char}".`);
    }
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/**
 * HOTP nach RFC 4226 — exportiert (statt nur intern genutzt), damit die
 * Dynamic-Truncation-Logik direkt gegen die offiziellen Testvektoren
 * geprüft werden kann, unabhängig von der zeitbasierten TOTP-Hülle.
 */
export function hotp(secret: Buffer, counter: number, digits: number = TOTP_DIGITS): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac("sha1", secret).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 10 ** digits;
  return otp.toString().padStart(digits, "0");
}

function timestampToCounter(timestamp: number): number {
  return Math.floor(timestamp / 1000 / TOTP_STEP_SECONDS);
}

export function generateTotp(base32Secret: string, timestamp: number = Date.now()): string {
  return hotp(base32Decode(base32Secret), timestampToCounter(timestamp));
}

export function verifyTotp(
  base32Secret: string,
  code: string,
  timestamp: number = Date.now(),
): boolean {
  const secret = base32Decode(base32Secret);
  const counter = timestampToCounter(timestamp);

  for (let drift = -TOTP_WINDOW; drift <= TOTP_WINDOW; drift++) {
    if (timingSafeEqualStrings(hotp(secret, counter + drift), code)) {
      return true;
    }
  }
  return false;
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
