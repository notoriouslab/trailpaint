import { describe, it, expect } from 'vitest';
import { catalogBlock } from './gen-stories-hub.mjs';

const catalog = {
  collections: [
    { id: 'b', title: '第二組', order: 2 },
    { id: 'a', title: '第一組', order: 1 },
    { id: 'tw', title: '台灣百年', order: 3, href: '/taiwan/', description: '專區簡介' },
  ],
  stories: [
    { id: 's1', collection: 'a', title: '故事一', subtitle: '副標', description: '簡介', thumbnail: 's1/card.jpg', path: 's1/', count: 2 },
    { id: 's2', collection: 'b', title: '<b>故事二</b>', subtitle: '', description: '', thumbnail: 's2/card.jpg', path: 's2/', count: 1 },
    { id: 't1', collection: 'tw', title: '台灣一', subtitle: '', description: '', thumbnail: '/taiwan/t1/card.jpg', path: '/taiwan/t1/', count: 1 },
    { id: 't2', collection: 'tw', title: '台灣二', subtitle: '', description: '', thumbnail: '/taiwan/t2/card.jpg', path: '/taiwan/t2/', count: 1 },
  ],
};

describe('catalogBlock', () => {
  const block = catalogBlock(catalog);

  it('wraps the cards in the catalog container', () => {
    expect(block.startsWith('    <div id="catalog" class="catalog-groups">')).toBe(true);
    expect(block.endsWith('</div>')).toBe(true);
  });

  it('links every story of an ordinary collection, in collection order', () => {
    expect(block).toContain('<a class="catalog-card" href="s1/">');
    expect(block).toContain('<a class="catalog-card" href="s2/">');
    expect(block.indexOf('第一組')).toBeLessThan(block.indexOf('第二組'));
  });

  it('shows one entry card for a collection with its own section', () => {
    expect(block).toContain('<a class="catalog-card catalog-card--entry" href="/taiwan/">');
    expect(block).toContain('2 個故事');
    expect(block).not.toContain('href="/taiwan/t1/"');
  });

  it('escapes catalog text', () => {
    expect(block).not.toContain('<b>故事二</b>');
    expect(block).toContain('&lt;b&gt;故事二&lt;/b&gt;');
  });

  it('falls back to a flat grid for a single group', () => {
    const flat = catalogBlock({ collections: [], stories: [catalog.stories[0]] });
    expect(flat).toContain('class="catalog-grid"');
    expect(flat).toContain('href="s1/"');
  });

  it('fails loudly when stories.js has no catalogHtml', () => {
    expect(() => catalogBlock(catalog, 'function other() {}')).toThrow(/catalogHtml/);
  });
});
