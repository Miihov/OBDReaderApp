import { TDtcSystem } from '../../shared/types/TDtcSystem';

const SYSTEM_LETTERS = ['P', 'C', 'B', 'U'] as const;

const SYSTEMS_BY_LETTER: Record<string, TDtcSystem> = {
  P: 'powertrain',
  C: 'chassis',
  B: 'body',
  U: 'network',
};

/**
 * Two raw bytes -> code. Bits 15-14: letter, 13-12: first digit, then three hex digits.
 * "0133" -> "P0133", "C123" -> "U0123". Returns null for "0000" (padding).
 */
export function decodeDtc(hex: string): string | null {
  const value = parseInt(hex, 16);
  if (hex.length !== 4 || Number.isNaN(value) || value === 0) return null;

  const letter = SYSTEM_LETTERS[value >> 14];
  const firstDigit = (value >> 12) & 0b11;
  const rest = (value & 0x0fff).toString(16).toUpperCase().padStart(3, '0');
  return `${letter}${firstDigit}${rest}`;
}

/** Inverse of decodeDtc, used by the simulator. */
export function encodeDtc(code: string): string {
  const letterIndex = SYSTEM_LETTERS.indexOf(code[0] as (typeof SYSTEM_LETTERS)[number]);
  const firstDigit = Number(code[1]);
  const rest = parseInt(code.slice(2), 16);
  if (letterIndex < 0 || !(firstDigit >= 0 && firstDigit <= 3) || code.length !== 5 || Number.isNaN(rest)) {
    throw new Error(`Invalid DTC: ${code}`);
  }
  const value = (letterIndex << 14) | (firstDigit << 12) | rest;
  return value.toString(16).toUpperCase().padStart(4, '0');
}

export function dtcSystem(code: string): TDtcSystem {
  return SYSTEMS_BY_LETTER[code[0]];
}

/**
 * Extracts codes from a mode 03/07/0A response (spaces off, headers off).
 *
 * CAN:     "43 02 0133 0420"           -> mode byte, DTC count, then 2 bytes per code.
 *          Longer answers come as ISO-TP multi-frame: "00A" byte-count line, then "0:...", "1:..." lines.
 * Non-CAN: "43 0133 0420 0000"         -> per line exactly 3 codes, zero padded, no count byte.
 *
 * Several ECUs may answer, so codes are de-duplicated.
 */
export function parseDtcResponse(lines: string[], responseMode: string, isCan: boolean): string[] {
  const codes = new Set<string>();

  for (const message of joinFrames(lines)) {
    if (!message.startsWith(responseMode)) continue;

    let payload = message.slice(responseMode.length);
    if (isCan) {
      const count = parseInt(payload.slice(0, 2), 16);
      payload = payload.slice(2, 2 + count * 4);
    }

    for (let i = 0; i + 4 <= payload.length; i += 4) {
      const code = decodeDtc(payload.slice(i, i + 4));
      if (code) codes.add(code);
    }
  }

  return [...codes];
}

/** Merges ISO-TP multi-frame lines back into single hex messages; single-frame lines pass through. */
function joinFrames(lines: string[]): string[] {
  const messages: string[] = [];
  let multiFrame: { bytes: number; hex: string } | null = null;

  const flush = () => {
    if (multiFrame) messages.push(multiFrame.hex.slice(0, multiFrame.bytes * 2));
    multiFrame = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+/g, '').toUpperCase();

    if (/^[0-9A-F]{3}$/.test(line)) {
      flush();
      multiFrame = { bytes: parseInt(line, 16), hex: '' };
    } else if (multiFrame && /^[0-9A-F]:/.test(line)) {
      multiFrame.hex += line.slice(2);
    } else {
      flush();
      messages.push(line);
    }
  }
  flush();

  return messages;
}
