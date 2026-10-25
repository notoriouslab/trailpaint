/**
 * Auto-verification rules (020 D5). Two paths:
 *
 * A. authority — the group has the official source that is authoritative for
 *    its kind (公園處 for parks) with an 'opened' year, and no other dated
 *    member disagrees.
 *
 * B. cross-source — all of:
 *   1. >= 2 distinct sources give a year, as official + encyclopedic or 2 official
 *      (Wikidata + zh.wikipedia copy each other — never enough on their own)
 *   2. those years are identical
 *   3. at least one of them is an 'opened' year (two 'founded' years may both
 *      be the institution's founding elsewhere)
 *   4. all members lie within MAX_DISTANCE_M of each other
 * Anything else goes to the manual review queue with the first failing reason.
 */
import { haversine, MAX_DISTANCE_M } from './match.mjs';

/** Sources whose 'opened' year is authoritative on its own (D5 path A). */
// 文資局 left path A after the T6 gate: 4 of 12 years extracted from its prose
// were wrong (start of works, land purchase, a place name). Its years still
// count as evidence in path B and in the manual queue.
const AUTHORITY_SOURCES = new Set(['taipei-parks']);

const ID_PREFIX = { boch: 'boch', 'taipei-parks': 'tpark', wikidata: 'wd', zhwiki: 'zhwiki' };

export function decide(group) {
  const ms = group.members;
  for (let i = 0; i < ms.length; i++) {
    for (let j = i + 1; j < ms.length; j++) {
      if (haversine(ms[i].latlng, ms[j].latlng) > MAX_DISTANCE_M) return { reason: 'far' };
    }
  }
  const dated = ms.filter((m) => Number.isInteger(m.start));
  const authority = dated.find((m) => AUTHORITY_SOURCES.has(m.source) && m.yearKind === 'opened');
  if (authority) {
    if (dated.some((m) => m.start !== authority.start)) return { reason: 'year-mismatch' };
    return { method: 'auto', basis: 'authority', year: authority.start };
  }
  const bySource = new Map(dated.map((m) => [m.source, m.tier]));
  if (bySource.size < 2) return { reason: 'single-source' };
  const tiers = [...bySource.values()];
  const official = tiers.filter((t) => t === 'official').length;
  if (official === 0) return { reason: 'encyclopedic-only' };
  if (new Set(dated.map((m) => m.start)).size > 1) return { reason: 'year-mismatch' };
  if (!dated.some((m) => m.yearKind === 'opened')) return { reason: 'founded-only' };
  return { method: 'auto', basis: 'cross-source', year: dated[0].start };
}

/** Pool id for a new group: first official member's source id, e.g. "boch-12345". */
export function newId(group) {
  const m = group.members.find((x) => x.tier === 'official') ?? group.members[0];
  const prefix = ID_PREFIX[m.source] ?? m.source;
  return `${prefix}-${m.sourceId}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
}
