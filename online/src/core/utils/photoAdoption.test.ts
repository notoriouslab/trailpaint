import { describe, it, expect } from 'vitest';
import { planPhotoAdoption, PHOTO_ADOPT_RADIUS_M } from './photoAdoption';
import type { Spot } from '../models/types';
import { DEFAULT_CARD_OFFSET } from '../models/types';

function mkSpot(id: string, latlng: [number, number], photo: Spot['photo'] = null): Spot {
  return {
    id,
    latlng,
    num: 1,
    title: id,
    desc: '',
    photo,
    iconId: 'pin',
    cardOffset: { ...DEFAULT_CARD_OFFSET },
  };
}

const mkFile = (name: string) =>
  new File([new Uint8Array([0xff, 0xd8, 0xff])], name, { type: 'image/jpeg' });

describe('planPhotoAdoption', () => {
  it('adopts when a photo-bearing new spot is within 30m of an empty existing spot', () => {
    const existing = [mkSpot('e1', [25.034, 121.565])];
    // ~10m north
    const newSpots = [mkSpot('n1', [25.03409, 121.565])];
    const map = new Map([['n1', mkFile('a.jpg')]]);

    const plan = planPhotoAdoption(newSpots, map, existing);

    expect(plan.adoptions).toHaveLength(1);
    expect(plan.adoptions[0].spotId).toBe('e1');
    expect(plan.adoptions[0].photoFile.name).toBe('a.jpg');
    expect(plan.remainingSpots).toHaveLength(0);
    expect(plan.remainingPhotoMap.size).toBe(0);
  });

  it('does not adopt when distance exceeds the threshold', () => {
    const existing = [mkSpot('e1', [25.034, 121.565])];
    // ~118m south (台南 one-味品 ↔ 修安扁擔 distance)
    const newSpots = [mkSpot('n1', [25.0329, 121.565])];
    const map = new Map([['n1', mkFile('a.jpg')]]);

    const plan = planPhotoAdoption(newSpots, map, existing);

    expect(plan.adoptions).toHaveLength(0);
    expect(plan.remainingSpots).toHaveLength(1);
    expect(plan.remainingPhotoMap.get('n1')?.name).toBe('a.jpg');
  });

  it('does not adopt an existing spot that already has a photo', () => {
    const existing = [mkSpot('e1', [25.034, 121.565], 'data:image/jpeg;base64,MOCK')];
    const newSpots = [mkSpot('n1', [25.03409, 121.565])];
    const map = new Map([['n1', mkFile('a.jpg')]]);

    const plan = planPhotoAdoption(newSpots, map, existing);

    expect(plan.adoptions).toHaveLength(0);
    expect(plan.remainingSpots).toHaveLength(1);
  });

  it('one-to-one: two close photos cannot both adopt the same existing spot', () => {
    const existing = [mkSpot('e1', [25.034, 121.565])];
    const newSpots = [
      mkSpot('n1', [25.03405, 121.565]), // ~5.5m — closer
      mkSpot('n2', [25.03410, 121.565]), // ~11m
    ];
    const map = new Map([
      ['n1', mkFile('a.jpg')],
      ['n2', mkFile('b.jpg')],
    ]);

    const plan = planPhotoAdoption(newSpots, map, existing);

    expect(plan.adoptions).toHaveLength(1);
    expect(plan.adoptions[0].spotId).toBe('e1');
    expect(plan.adoptions[0].photoFile.name).toBe('a.jpg'); // first-come wins
    expect(plan.remainingSpots).toHaveLength(1);
    expect(plan.remainingSpots[0].id).toBe('n2');
    expect(plan.remainingPhotoMap.get('n2')?.name).toBe('b.jpg');
  });

  it('picks the nearest eligible existing spot when multiple are within range', () => {
    const existing = [
      mkSpot('e1', [25.034, 121.565]),
      mkSpot('e2', [25.0342, 121.565]), // ~22m farther
    ];
    // incoming photo ~10m from e1, ~12m from e2
    const newSpots = [mkSpot('n1', [25.03409, 121.565])];
    const map = new Map([['n1', mkFile('a.jpg')]]);

    const plan = planPhotoAdoption(newSpots, map, existing);

    expect(plan.adoptions).toHaveLength(1);
    expect(plan.adoptions[0].spotId).toBe('e1');
  });

  it('leaves new spots without photos untouched (no merge attempted)', () => {
    const existing = [mkSpot('e1', [25.034, 121.565])];
    const newSpots = [mkSpot('n1', [25.03409, 121.565])];
    const map = new Map<string, File>(); // empty — no file for n1

    const plan = planPhotoAdoption(newSpots, map, existing);

    expect(plan.adoptions).toHaveLength(0);
    expect(plan.remainingSpots).toHaveLength(1);
    expect(plan.remainingSpots[0].id).toBe('n1');
  });

  it('respects a caller-supplied custom radius', () => {
    const existing = [mkSpot('e1', [25.034, 121.565])];
    // ~22m
    const newSpots = [mkSpot('n1', [25.03420, 121.565])];
    const map = new Map([['n1', mkFile('a.jpg')]]);

    const strict = planPhotoAdoption(newSpots, map, existing, 15);
    expect(strict.adoptions).toHaveLength(0);

    const loose = planPhotoAdoption(newSpots, map, existing, 50);
    expect(loose.adoptions).toHaveLength(1);
  });

  it('handles empty inputs gracefully', () => {
    const plan = planPhotoAdoption([], new Map(), []);
    expect(plan.adoptions).toHaveLength(0);
    expect(plan.remainingSpots).toHaveLength(0);
    expect(plan.remainingPhotoMap.size).toBe(0);
  });

  it('PHOTO_ADOPT_RADIUS_M default is 30m', () => {
    expect(PHOTO_ADOPT_RADIUS_M).toBe(30);
  });
});
