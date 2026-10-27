import { decodeDtc, encodeDtc, parseDtcResponse } from './dtcCodec';

describe('decodeDtc / encodeDtc', () => {
  it.each([
    ['0133', 'P0133'],
    ['0420', 'P0420'],
    ['4123', 'C0123'],
    ['9234', 'B1234'],
    ['C100', 'U0100'],
    ['3ABC', 'P3ABC'],
  ])('%s <-> %s', (hex, code) => {
    expect(decodeDtc(hex)).toBe(code);
    expect(encodeDtc(code)).toBe(hex);
  });

  it('treats 0000 as padding', () => {
    expect(decodeDtc('0000')).toBeNull();
  });

  it('rejects invalid codes', () => {
    expect(() => encodeDtc('X0123')).toThrow();
    expect(() => encodeDtc('P4123')).toThrow();
  });
});

describe('parseDtcResponse', () => {
  it('parses a CAN single frame', () => {
    expect(parseDtcResponse(['4302013304200000'], '43', true)).toEqual(['P0133', 'P0420']);
  });

  it('parses a CAN answer with no codes', () => {
    expect(parseDtcResponse(['4300'], '43', true)).toEqual([]);
  });

  it('parses CAN multi-frame with spaces and padding', () => {
    const lines = ['00A', '0: 43 04 01 33 04 20', '1: 03 01 C1 00 00 00 00'];
    expect(parseDtcResponse(lines, '43', true)).toEqual(['P0133', 'P0420', 'P0301', 'U0100']);
  });

  it('parses non-CAN lines of three codes each', () => {
    const lines = ['43013304200301', '43C10000000000'];
    expect(parseDtcResponse(lines, '43', false)).toEqual(['P0133', 'P0420', 'P0301', 'U0100']);
  });

  it('merges answers from several ECUs without duplicates', () => {
    expect(parseDtcResponse(['43010133', '4302013301C1'], '43', true)).toEqual(['P0133', 'P01C1']);
  });

  it('ignores lines of another mode', () => {
    expect(parseDtcResponse(['47010171'], '43', true)).toEqual([]);
  });
});
