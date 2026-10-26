/**
 * 025 D7 item 1: every bundled story survives migrateProject unchanged in
 * spot, photo and photoMeta counts — a photo over the size cap or with a bad
 * photoMeta would otherwise vanish silently in the Player.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { migrateProject } from './migrateProject';

const ROOT = resolve(__dirname, '../../../..');

function storyFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return storyFiles(p);
    return name.endsWith('.trailpaint.json') ? [p] : [];
  });
}

const FILES = ['stories', 'taiwan'].flatMap((d) => storyFiles(join(ROOT, d)));

interface RawSpot { photo?: unknown; photoMeta?: unknown }
const counts = (spots: RawSpot[]) => ({
  spots: spots.length,
  photos: spots.filter((s) => typeof s.photo === 'string' && s.photo).length,
  photoMeta: spots.filter((s) => s.photoMeta).length,
});

describe('bundled stories survive migrateProject', () => {
  it('finds the bundled story files', () => {
    expect(FILES.length).toBeGreaterThan(40);
  });
  it.each(FILES.map((f) => [f.slice(ROOT.length + 1), f]))('%s', (_name, file) => {
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    const migrated = migrateProject(raw);
    expect(counts(migrated.spots as RawSpot[])).toEqual(counts(raw.spots));
  });
});
