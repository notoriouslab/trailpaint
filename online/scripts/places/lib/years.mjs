/**
 * Year parsing for place candidates (020 D4/D5).
 * Every year carries a kind: 'opened' (the building/facility came into use),
 * 'founded' (the institution was set up — often elsewhere) or 'started'
 * (construction began; 興建 is ambiguous in 文資局 texts: 總統府「1912 興建」
 * was completed 1919). Only an 'opened' year can make a candidate auto-verify.
 */

const ROC_OFFSET = 1911;
const ERAS = { 明治: 1867, 大正: 1911, 昭和: 1925 };
const OPENED = ['落成', '啟用', '完工', '竣工', '建成', '開闢', '開園', '通車', '開館'];
const STARTED = ['興建', '動工', '開工', '始建', '興築'];
const FOUNDED = ['創建', '創立', '設立', '創設', '成立', '創辦'];

/** 民國 83 / "83" / 1994 / "1994-05-01" / "+1994-01-01T00:00:00Z" → 1994; else null. */
export function parseYear(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return plausible(raw < 200 ? raw + ROC_OFFSET : raw);
  const s = String(raw).trim();
  const roc = s.match(/^民國\s*(\d{1,3})/);
  if (roc) return plausible(Number(roc[1]) + ROC_OFFSET);
  const m = s.match(/^\+?(\d{1,4})(?:\D|$)/);
  if (!m) return null;
  const n = Number(m[1]);
  return plausible(n < 200 ? n + ROC_OFFSET : n);
}

function plausible(y) {
  return Number.isInteger(y) && y >= 1600 && y <= new Date().getFullYear() ? y : null;
}

/**
 * Years tied to a build/found keyword inside the same clause of a history
 * text (文資局 pastHistory). A year with no keyword in its clause (e.g.
 * "1985年整修") is ignored. → [{ year, kind }], de-duplicated.
 */
export function yearsFromHistory(text) {
  const out = [];
  const seen = new Set();
  for (const clause of String(text ?? '').split(/[，。；、\n]/)) {
    const years = clauseYears(clause);
    if (!years.length) continue;
    const kind = keywordKind(clause);
    if (!kind) continue;
    for (const year of years) {
      const key = `${year}-${kind}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ year, kind });
    }
  }
  return out;
}

function clauseYears(clause) {
  const ys = new Set();
  // "1930年代" is a decade, not a year
  for (const m of clause.matchAll(/(?<!\d)(1[6-9]\d\d|20\d\d)(?!\d|年代)/g)) {
    const y = plausible(Number(m[1]));
    if (y) ys.add(y);
  }
  for (const m of clause.matchAll(/民國\s*(\d{1,3})\s*年/g)) {
    const y = plausible(Number(m[1]) + ROC_OFFSET);
    if (y) ys.add(y);
  }
  for (const m of clause.matchAll(/(明治|大正|昭和)\s*(\d{1,2}|元)\s*年/g)) {
    const y = plausible(ERAS[m[1]] + (m[2] === '元' ? 1 : Number(m[2])));
    if (y) ys.add(y);
  }
  return [...ys];
}

/** Clause keyword → kind; when both appear, the later keyword wins (closer to the verb). */
function keywordKind(clause) {
  let best = null;
  let at = -1;
  for (const [words, kind] of [[OPENED, 'opened'], [FOUNDED, 'founded'], [STARTED, 'started']]) {
    for (const w of words) {
      // a keyword inside a place name (建成町, 建成路) is not a verb
      const i = clause.replace(new RegExp(`${w}(?=[町路街里區])`, 'g'), '＿'.repeat(w.length)).lastIndexOf(w);
      if (i > at) {
        at = i;
        best = kind;
      }
    }
  }
  return best;
}
