/**
 * Simplified-Chinese leftovers in Traditional text (020 D7).
 *
 * opencc s2t also rewrites characters that are standard in Taiwan (里→裏 in
 * 鄰里, 布置→佈置, 台→臺). A character counts as a simplified leftover only
 * when s2t changes it and it is outside the standard Big5 set (lead bytes
 * A4–C6 frequent and C9–F9 less-frequent hanzi; C6A1–C8FE and the HKSCS
 * ranges are left out because they carry non-Taiwan characters).
 * Needs the `opencc` CLI (brew install opencc).
 */
import { spawnSync } from 'node:child_process';

export const BIG5 = (() => {
  const dec = new TextDecoder('big5');
  const set = new Set();
  for (let lead = 0xa4; lead <= 0xf9; lead++) {
    if (lead === 0xc7 || lead === 0xc8) continue;
    for (let trail = 0x40; trail <= 0xfe; trail++) {
      if (trail > 0x7e && trail < 0xa1) continue;
      if (lead === 0xc6 && trail > 0x7e) continue;
      const ch = dec.decode(new Uint8Array([lead, trail]));
      if (ch !== '�') set.add(ch);
    }
  }
  return set;
})();

/** Per input line, the leftovers as [{ at, ch, to }]. Throws if opencc fails. */
export function simplifiedLeftovers(lines) {
  const r = spawnSync('opencc', ['-c', 's2t'], { input: lines.join('\n'), encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`opencc failed: ${r.error?.message ?? r.stderr}`);
  const out = r.stdout.replace(/\n$/, '').split('\n');
  return lines.map((line, i) => {
    const conv = [...(out[i] ?? '')];
    const hits = [];
    [...line].forEach((ch, at) => {
      if (conv[at] && conv[at] !== ch && !BIG5.has(ch)) hits.push({ at, ch, to: conv[at] });
    });
    return hits;
  });
}

/** NFC-normalise and replace simplified leftovers with their s2t form. */
export function toTraditional(text) {
  const nfc = text.normalize('NFC');
  const [hits] = simplifiedLeftovers([nfc]);
  if (!hits.length) return nfc;
  const chars = [...nfc];
  for (const { at, to } of hits) chars[at] = to;
  return chars.join('');
}
