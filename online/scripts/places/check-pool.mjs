#!/usr/bin/env node
/**
 * Validate data/places/tw/<TOWNCODE>.json files (020 D7). Exit 1 on any problem.
 *
 *   Run: node online/scripts/places/check-pool.mjs <file…>
 *   Needs the `opencc` CLI (brew install opencc) for the simplified-Chinese check.
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { townOf } from './lib/towns.mjs';
import { simplifiedLeftovers } from './lib/hanzi.mjs';

const MIN_YEAR = 1600;
const METHODS = new Set(['manual', 'auto']);
const BASES = new Set(['authority', 'cross-source']);
const KINDS = new Set(['place', 'event']); // 021: absent = 'place'

export function checkPool(path, nowYear = new Date().getFullYear()) {
  const errors = [];
  const pool = JSON.parse(readFileSync(path, 'utf8'));
  const code = basename(path, '.json');
  if (pool.towncode !== code) errors.push(`header towncode ${pool.towncode} ≠ file name ${code}`);

  const ids = new Set();
  for (const it of pool.items ?? []) {
    const at = `${it.id ?? '(no id)'}`;
    if (!it.id) errors.push(`${at}: missing id`);
    else if (ids.has(it.id)) errors.push(`${at}: duplicate id`);
    ids.add(it.id);

    const [lat, lng] = it.latlng ?? [];
    const town = Number.isFinite(lat) && Number.isFinite(lng) ? townOf(lat, lng) : null;
    if (town !== code) errors.push(`${at}: latlng ${it.latlng} is in ${town}, not ${code}`);

    if (!Number.isInteger(it.start) || it.start < MIN_YEAR || it.start > nowYear) {
      errors.push(`${at}: start ${it.start} outside ${MIN_YEAR}–${nowYear}`);
    }
    if (it.end !== null && !(Number.isInteger(it.end) && it.end >= it.start)) {
      errors.push(`${at}: end ${it.end} must be null or >= start`);
    }
    if (!Array.isArray(it.sources) || it.sources.length === 0) errors.push(`${at}: no sources`);
    for (const s of it.sources ?? []) {
      if (typeof s.url !== 'string' || !s.url.startsWith('https://')) errors.push(`${at}: non-https source ${s.url}`);
    }
    if (it.kind !== undefined && !KINDS.has(it.kind)) errors.push(`${at}: kind ${it.kind}`);
    if (it.latlngPrecision !== undefined && it.latlngPrecision !== 'approx') {
      errors.push(`${at}: latlngPrecision ${it.latlngPrecision}`);
    }
    if (it.related !== undefined) {
      if (!Array.isArray(it.related)) errors.push(`${at}: related must be an array`);
      else for (const r of it.related) {
        if (typeof r?.title !== 'string' || !r.title.trim()) errors.push(`${at}: related item without title`);
        if (typeof r?.url !== 'string' || !r.url.startsWith('https://')) errors.push(`${at}: non-https related ${r?.url}`);
      }
    }
    if (typeof it.desc !== 'string' || !it.desc.trim()) errors.push(`${at}: empty desc`);
    else if (it.desc !== it.desc.normalize('NFC')) errors.push(`${at}: desc has CJK compatibility characters (not NFC)`);
    if (!METHODS.has(it.verified?.method)) errors.push(`${at}: verified.method ${it.verified?.method}`);
    if (it.verified?.method === 'auto' && !BASES.has(it.verified.basis)) errors.push(`${at}: auto item needs verified.basis`);
  }

  errors.push(...simplifiedErrors(pool.items ?? []));
  return errors;
}

/** Simplified leftovers in names and descriptions, as error lines. */
function simplifiedErrors(items) {
  let hits;
  try {
    hits = simplifiedLeftovers(items.map((it) => `${it.name}\t${it.desc}`));
  } catch (e) {
    return [e.message];
  }
  return hits.flatMap((h, i) => h.map(({ ch, to }) => `${items[i].id}: simplified character「${ch}」(s2t → ${to})`));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error('usage: node check-pool.mjs <file…>');
    process.exit(1);
  }
  let failed = 0;
  for (const f of files) {
    const errors = checkPool(f);
    if (errors.length) {
      failed++;
      console.error(`✗ ${f}\n  ${errors.join('\n  ')}`);
    } else {
      console.log(`✓ ${f}`);
    }
  }
  process.exit(failed ? 1 : 0);
}
