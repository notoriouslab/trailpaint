import { describe, it, expect } from 'vitest';
import {
  eraLabel, spotKey, renderSpotsHtml, renderSpotsLd, renderSpotsMd, renderHead,
  applyHtmlBlocks, applyMdBlock, PHOTO_PATH_RE,
  HEAD_START, HEAD_END, BODY_START, BODY_END,
} from './story-spots.mjs';

const URL_ = 'https://trailpaint.org/stories/demo/';
const spot = (over = {}) => ({
  id: 's1', num: 1, latlng: [25.01, 121.53], title: '景點', desc: '第一段。\n\n第二段。',
  photo: '/stories/demo/spot-photos/abc.jpg', ...over,
});
const story = (segments) => ({
  title: '示範', description: '故事簡介',
  stories: segments.map((s) => s.meta),
});
const seg = (id, spots, over = {}) => ({ meta: { id, title: `段落 ${id}`, subtitle: '副標', description: `簡介 ${id}`, ...over }, project: { spots } });
const html = (segments) => renderSpotsHtml(story(segments), segments, URL_);

describe('eraLabel', () => {
  it('single year', () => expect(eraLabel({ start: 1697, end: 1697 })).toBe('1697'));
  it('range', () => expect(eraLabel({ start: 1904, end: 1949 })).toBe('1904–1949'));
  it('still standing', () => expect(eraLabel({ start: 1762, end: 3000 })).toBe('1762 至今'));
  it('BC single and range', () => {
    expect(eraLabel({ start: -139, end: -139 })).toBe('BC 139');
    expect(eraLabel({ start: -605, end: -432 })).toBe('BC 605–432');
  });
  it('years before 1000 carry AD', () => {
    expect(eraLabel({ start: 30, end: 30 })).toBe('AD 30');
    expect(eraLabel({ start: 629, end: 645 })).toBe('AD 629–645');
    expect(eraLabel({ start: 46, end: 3000 })).toBe('AD 46 至今');
  });
  it('across the era boundary', () => expect(eraLabel({ start: -6, end: 12 })).toBe('BC 6–AD 12'));
  it('missing or malformed era', () => {
    expect(eraLabel(undefined)).toBe('');
    expect(eraLabel({ start: '1900' })).toBe('');
    expect(eraLabel({ start: 1900 })).toBe('1900');
    expect(eraLabel({ start: 0, end: 10 })).toBe('');
    expect(eraLabel({ start: 1900, end: 1800 })).toBe('1900');
    expect(eraLabel({ start: -5, end: -10 })).toBe('BC 5');
  });
});

describe('spotKey', () => {
  it('prefers placeId', () => {
    expect(spotKey({ id: 's1', placeId: 'liugong' })).toBe('liugong');
    expect(spotKey({ id: 's1' })).toBe('s1');
  });
});

describe('renderSpotsHtml', () => {
  it('escapes text', () => {
    const out = html([seg('a', [spot({ title: '<script>alert(1)</script>', desc: 'a & b <img>' })])]);
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(out).toContain('a &amp; b &lt;img&gt;');
  });

  it('splits desc into paragraphs', () => {
    const out = html([seg('a', [spot()])]);
    expect(out).toContain('<p>第一段。</p>');
    expect(out).toContain('<p>第二段。</p>');
  });

  it('links only https refs', () => {
    const out = html([seg('a', [spot({
      historical_refs: ['https://www.example.org/a?b=1', 'http://example.org/x', 'javascript:alert(1)', '《裨海紀遊》卷中'],
    })])]);
    expect(out).toContain('<a href="https://www.example.org/a?b=1" rel="noopener">example.org</a>');
    expect(out).not.toContain('href="http://');
    expect(out).not.toContain('href="javascript:');
    expect(out).toContain('《裨海紀遊》卷中');
  });

  it('joins scripture refs', () => {
    expect(html([seg('a', [spot({ scripture_refs: ['Matt 26:20', 'John 13:1'] })])])).toContain('經文：Matt 26:20、John 13:1');
  });

  it('drops photos whose path is not accepted', () => {
    for (const photo of ['data:image/png;base64,AAAA', 'https://evil.example/x.jpg', '/stories/../x.jpg', '']) {
      expect(html([seg('a', [spot({ photo })])])).not.toContain('<figure>');
    }
    expect(PHOTO_PATH_RE.test('/taiwan/taipei-daan/spot-photos/c7247704c630ed6c.jpg')).toBe(true);
  });

  it('credits a photo from photoMeta, linking only an https source', () => {
    const meta = { author: 'A <b>', license: 'CC BY 4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:X.jpg' };
    const linked = html([seg('a', [spot({ photoMeta: meta })])]);
    expect(linked).toContain('<figcaption>照片：<a href="https://commons.wikimedia.org/wiki/File:X.jpg" rel="noopener">A &lt;b&gt;，CC BY 4.0</a></figcaption>');
    const plain = html([seg('a', [spot({ photoMeta: { ...meta, sourceUrl: 'javascript:alert(1)' } })])]);
    expect(plain).toContain('<figcaption>照片：A &lt;b&gt;，CC BY 4.0</figcaption>');
  });

  it('falls back to CREDITS.md when a photo has no photoMeta', () => {
    expect(html([seg('a', [spot()])])).toContain('<figcaption><a href="https://github.com/notoriouslab/trailpaint/blob/main/stories/demo/CREDITS.md" rel="noopener">照片出處與授權</a></figcaption>');
  });

  it('anchors include the segment id, so the same spot id in two segments stays unique', () => {
    const out = html([seg('first', [spot()]), seg('second', [spot()])]);
    expect(out).toContain('id="spot-first-s1"');
    expect(out).toContain('id="spot-second-s1"');
    expect(out).toContain('id="seg-first"');
  });

  it('map link uses placeId and carries year only with an era', () => {
    const out = html([seg('a', [
      spot({ placeId: 'liugong', era: { start: 1762, end: 3000 } }),
      spot({ id: 's2', num: 2 }),
    ])]);
    expect(out).toContain('href="?seg=a&amp;spot=liugong&amp;year=1762"');
    expect(out).toContain('href="?seg=a&amp;spot=s2"');
    expect(out).toContain('<span class="story-spot__year">1762 至今</span>');
  });

  it('omits the map link for ids that are not link-safe', () => {
    expect(html([seg('Bad Seg', [spot()])])).not.toContain('story-spot__map');
    expect(html([seg('a', [spot({ id: 'bad id"' })])])).not.toContain('story-spot__map');
  });

  it('does not repeat a segment description equal to the story description', () => {
    const segments = [seg('a', [spot()], { description: '故事簡介' })];
    expect(html(segments).match(/故事簡介/g)).toHaveLength(1);
  });
});

describe('renderSpotsLd / renderHead', () => {
  const segments = [seg('a', [spot(), spot({ id: 's2', num: 2, photo: '' })]), seg('b', [spot({ title: '</script><script>x' })])];
  const ld = renderSpotsLd(story(segments), segments, URL_);

  it('numbers positions across segments', () => {
    expect(ld.numberOfItems).toBe(3);
    expect(ld.itemListElement.map((e) => e.position)).toEqual([1, 2, 3]);
  });

  it('describes each spot as a Place with geo, anchor url and absolute image', () => {
    const [first, second] = ld.itemListElement.map((e) => e.item);
    expect(first).toMatchObject({
      '@type': 'Place',
      url: `${URL_}#spot-a-s1`,
      geo: { '@type': 'GeoCoordinates', latitude: 25.01, longitude: 121.53 },
      image: 'https://trailpaint.org/stories/demo/spot-photos/abc.jpg',
    });
    expect(second.image).toBeUndefined();
  });

  it('keeps descriptions short', () => {
    const long = [seg('a', [spot({ desc: '很長的句子。'.repeat(60) })])];
    expect(renderSpotsLd(story(long), long, URL_).itemListElement[0].item.description.length).toBeLessThanOrEqual(110);
  });

  it('cannot close its own script tag', () => {
    const head = renderHead(URL_, ld, false);
    expect(head.match(/<\/script>/g)).toHaveLength(1);
    expect(head).toContain('\\u003c/script>');
    expect(JSON.parse(head.split('\n').slice(2, -1).join('\n')).itemListElement[2].item.name).toBe('</script><script>x');
  });

  it('adds the markdown alternate unless the page already has one', () => {
    expect(renderHead(URL_, ld, false)).toContain(`href="${URL_}index.md"`);
    expect(renderHead(URL_, ld, true)).not.toContain('text/markdown');
  });
});

describe('renderSpotsMd', () => {
  it('lists spots with position, text, refs and photo credit', () => {
    const segments = [seg('a', [spot({ era: { start: 1697, end: 1697 }, historical_refs: ['https://example.org/a', '書'] })])];
    const md = renderSpotsMd(story(segments), segments, URL_);
    expect(md).toContain('#### 1. 景點（1697）');
    expect(md).toContain('位置：25.01, 121.53');
    expect(md).toContain('- https://example.org/a');
    expect(md).toContain('照片：https://trailpaint.org/stories/demo/spot-photos/abc.jpg（出處與授權見 https://github.com/notoriouslab/trailpaint/blob/main/stories/demo/CREDITS.md）');
  });
});

describe('applyHtmlBlocks', () => {
  const page = [
    '<html><head>', '  <title>t</title>', '</head>', '<body>', '  <div class="stories-page"></div>', '',
    '  <!-- SEO-only static content: hidden -->', '  <section class="story-seo-content" hidden>', '    <h2>old</h2>', '  </section>', '',
    '  <script src="x.js"></script>', '</body></html>',
  ].join('\n');

  it('first run: head block before </head>, body block replaces the hidden section and its comment', () => {
    const out = applyHtmlBlocks(page, 'HEAD', 'BODY');
    expect(out).toContain(`${HEAD_START}\nHEAD\n${HEAD_END}\n</head>`);
    expect(out).toContain(`  ${BODY_START}\nBODY\n  ${BODY_END}`);
    expect(out).not.toContain('story-seo-content');
    expect(out).not.toContain('SEO-only');
    expect(out).toContain('<script src="x.js"></script>');
  });

  it('later runs replace only what is between the markers', () => {
    const once = applyHtmlBlocks(page, 'HEAD', 'BODY');
    const twice = applyHtmlBlocks(once, 'HEAD2', 'BODY2');
    expect(twice).toBe(once.replace('HEAD', 'HEAD2').replace('BODY', 'BODY2'));
    expect(applyHtmlBlocks(twice, 'HEAD2', 'BODY2')).toBe(twice);
  });

  it('keeps $ sequences in the body literal', () => {
    expect(applyHtmlBlocks(page, 'HEAD', "cost $& $1 $'")).toContain("cost $& $1 $'");
  });

  it('throws when the page has neither markers nor the hidden section', () => {
    expect(() => applyHtmlBlocks('<html><head></head><body></body></html>', 'H', 'B')).toThrow(/story-seo-content/);
  });
});

describe('applyMdBlock', () => {
  it('creates a new file from the header', () => {
    expect(applyMdBlock(null, 'BLOCK', '# 標題\n')).toBe(`# 標題\n\n${BODY_START}\nBLOCK\n${BODY_END}\n`);
  });

  it('appends to a hand-written file and then only rewrites the block', () => {
    const once = applyMdBlock('# 手寫\n\n內容\n', 'BLOCK', 'unused');
    expect(once.startsWith('# 手寫\n\n內容\n')).toBe(true);
    expect(once).toContain(`${BODY_START}\nBLOCK\n${BODY_END}`);
    expect(applyMdBlock(once, 'BLOCK2', 'unused')).toBe(once.replace('BLOCK', 'BLOCK2'));
  });
});
