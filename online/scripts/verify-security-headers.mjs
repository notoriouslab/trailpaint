#!/usr/bin/env node
// Verify trailpaint.org serves expected security headers.
// Source of truth for config: cloudflare/README.md → Security Headers section.
// Run: node online/scripts/verify-security-headers.mjs

const TARGETS = [
  'https://trailpaint.org/',
  'https://trailpaint.org/app/',
  'https://trailpaint.org/stories/',
  'https://trailpaint.org/faq/',
];

const EXPECTED = {
  'x-content-type-options': 'nosniff',
};

let failed = 0;
for (const url of TARGETS) {
  let res;
  try {
    res = await fetch(url, { method: 'HEAD', redirect: 'manual' });
  } catch (err) {
    console.log(`✗ ${url} — fetch failed: ${err.message}`);
    failed++;
    continue;
  }
  for (const [name, expected] of Object.entries(EXPECTED)) {
    const actual = res.headers.get(name);
    const ok = actual?.toLowerCase() === expected.toLowerCase();
    const mark = ok ? '✓' : '✗';
    const detail = ok ? actual : `${actual ?? '<missing>'} (expected "${expected}")`;
    console.log(`${mark} ${url} ${name}: ${detail}`);
    if (!ok) failed++;
  }
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll security headers OK');
process.exit(failed ? 1 : 0);
