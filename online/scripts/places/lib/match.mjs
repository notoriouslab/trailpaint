/**
 * Candidate grouping (020 D5): same facility = same normalized name within MAX_DISTANCE_M.
 * Grouping ignores township borders (a facility on a border may be geocoded
 * into either side); the group's township comes from an official source.
 */

/**
 * Measured 2026-10-25 on all same-name cross-source pairs nationwide: every pair
 * up to 805 m was the same facility (park / campus centroids differ a lot, e.g.
 * 大安森林公園 347 m); the next pair is at 2238 m (a tunnel). 1000 m sits in that gap.
 */
export const MAX_DISTANCE_M = 1000;

/** Closed prefix list — strip at most one. Category words (站/館/公園) are kept. */
const PREFIXES = [
  '臺北市立', '新北市立', '桃園市立', '臺中市立', '臺南市立', '高雄市立',
  '國立', '縣立', '市立', '私立', '臺北市',
].sort((a, b) => b.length - a.length);

export function normalizeName(name) {
  let s = String(name ?? '')
    .normalize('NFKC')
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/\s+/g, '');
  for (const p of PREFIXES) {
    if (s.startsWith(p) && s.length > p.length) {
      s = s.slice(p.length);
      break;
    }
  }
  return s;
}

/** Great-circle distance in metres between [lat, lng] pairs. */
export function haversine([lat1, lng1], [lat2, lng2]) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Union candidates with equal normalized names within MAX_DISTANCE_M.
 * → [{ towncode, members: [cand…] }]
 */
export function groupCandidates(cands) {
  const parent = cands.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const keys = cands.map((c) => normalizeName(c.name));

  // 0.02° buckets (>= 2 km wide up to 26°N, > MAX_DISTANCE_M) — only neighbouring buckets can match
  const buckets = new Map();
  cands.forEach((c, i) => {
    const k = `${Math.floor(c.latlng[0] * 50)},${Math.floor(c.latlng[1] * 50)}`;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(i);
  });
  cands.forEach((c, i) => {
    const by = Math.floor(c.latlng[0] * 50);
    const bx = Math.floor(c.latlng[1] * 50);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (const j of buckets.get(`${by + dy},${bx + dx}`) ?? []) {
          if (j <= i || keys[i] !== keys[j]) continue;
          if (haversine(c.latlng, cands[j].latlng) <= MAX_DISTANCE_M) parent[find(j)] = find(i);
        }
      }
    }
  });

  const groups = new Map();
  cands.forEach((c, i) => {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(c);
  });
  return [...groups.values()].map((members) => {
    const anchor = members.find((m) => m.tier === 'official') ?? members[0];
    return { towncode: anchor.towncode, members };
  });
}

/** Decoded URL for comparison (pool files and candidates encode titles differently). */
function sameUrl(a, b) {
  const norm = (u) => {
    try { return decodeURIComponent(u).replace(/^https?:\/\//, ''); } catch { return u; }
  };
  return norm(a) === norm(b);
}

/**
 * Whether a group is already in the pool: name match within MAX_DISTANCE_M, or
 * a shared source URL. Pool items may carry historical names (臺北第三中學校
 * for today's 師大附中), so the zh.wikipedia URL is the stronger key.
 */
export function matchesExisting(group, poolItems) {
  return poolItems.some((it) => {
    const key = normalizeName(it.name);
    return group.members.some(
      (m) => (normalizeName(m.name) === key && haversine(m.latlng, it.latlng) <= MAX_DISTANCE_M)
        || (it.sources ?? []).some((s) => m.url && sameUrl(s.url, m.url)),
    );
  });
}
