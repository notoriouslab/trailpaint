import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parkToCandidate } from './taipei-parks.mjs';
import { bochToCandidate } from './boch.mjs';
import { aggregateRows, itemToCandidate } from './wikidata.mjs';

const fixture = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url)));

describe('taipei-parks adapter (020 D4)', () => {
  const out = fixture('taipei-parks.json').map(parkToCandidate);

  it('official, opened, township from coordinates', () => {
    expect(out[0]).toMatchObject({ source: 'taipei-parks', tier: 'official', name: '大安森林公園', start: 1994, yearKind: 'opened', towncode: '63000030' });
  });

  it('民國 const years are converted', () => {
    expect(out[1]).toMatchObject({ name: '公館公園', start: 2013 });
    expect(out[2]).toMatchObject({ name: '北投社三層崎公園', start: 2019 });
  });

  it('township follows coordinates, not pm_regions (環東公園: source coordinate falls in 大安)', () => {
    expect(out[3]).toMatchObject({ name: '環東公園', region: '內湖區', towncode: '63000030' });
  });
});

describe('boch adapter (020 D4)', () => {
  const out = fixture('boch.json').map(bochToCandidate);

  it('public type kept, no keyword year → no start', () => {
    expect(out[0]).toMatchObject({ source: 'boch', category: 'school', towncode: '09020020' });
    expect(out[0].start).toBeUndefined();
  });

  it('temples are not public facilities', () => {
    expect(out[1]).toBeNull();
  });

  it('mixed types are flagged for manual review', () => {
    expect(out[2]).toMatchObject({ category: 'other', needsReview: 'category-check' });
  });

  it('takes the completion year from the history text', () => {
    expect(out[4]).toMatchObject({ name: '菸酒公賣局嘉義分局', start: 1937, yearKind: 'opened', category: 'government' });
  });
});

describe('wikidata adapter (020 D4)', () => {
  const items = aggregateRows(fixture('wikidata.json'));
  items.forEach((it) => { it.name ??= it.zh; });
  const out = items.map(itemToCandidate);

  it('one candidate per item despite duplicated binding rows', () => {
    expect(out).toHaveLength(2);
  });

  it('P1619 opening beats P571 inception', () => {
    expect(out[0]).toMatchObject({ sourceId: 'Q11081532', start: 2017, yearKind: 'opened', tier: 'encyclopedic', category: 'station' });
  });

  it('P571 only → founded; zh.wikipedia title kept', () => {
    expect(out[1]).toMatchObject({ sourceId: 'Q11081455', start: 1962, yearKind: 'founded', zhwiki: '新北市立三重高級中學' });
  });
});
