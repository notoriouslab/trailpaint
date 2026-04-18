import { describe, it, expect } from 'vitest';
import { buildProjectEmbedHtml, isAllowedMediaUrl } from './embedCode';
import type { Project } from '../models/types';

function mkProject(overrides: Partial<Project> = {}): Project {
  return {
    version: 3,
    name: 'test',
    center: [0, 0],
    zoom: 8,
    spots: [],
    routes: [],
    ...overrides,
  };
}

describe('buildProjectEmbedHtml — XSS defense (S1 regression)', () => {
  it('escapes </script> in spot title', () => {
    const project = mkProject({
      spots: [
        {
          id: 's1',
          latlng: [0, 0],
          num: 1,
          title: 'foo</script><img src=x onerror="alert(1)">',
          desc: '',
          photo: null,
          iconId: 'pin',
          cardOffset: { x: 0, y: -60 },
        },
      ],
    });
    const html = buildProjectEmbedHtml(project, 'https://example.com');
    // Raw </script> must not appear in the JSON body (only in the literal <script> tag)
    const scripts = html.match(/<\/script>/gi) || [];
    expect(scripts.length).toBe(1); // only the closing tag of the wrapper
    // Escaped form is present
    expect(html).toContain('\\u003c/script');
  });

  it('escapes HTML comment breakout -->', () => {
    const project = mkProject({ name: 'evil --> <script>alert(1)</script>' });
    const html = buildProjectEmbedHtml(project, 'https://example.com');
    expect(html).toContain('--\\u003e');
  });

  it('escapes U+2028 and U+2029 line separators', () => {
    const project = mkProject({ name: 'a\u2028b\u2029c' });
    const html = buildProjectEmbedHtml(project, 'https://example.com');
    expect(html).not.toContain('\u2028');
    expect(html).not.toContain('\u2029');
    expect(html).toContain('\\u2028');
    expect(html).toContain('\\u2029');
  });

  it('uses exact origin in postMessage target (not wildcard)', () => {
    const html = buildProjectEmbedHtml(mkProject(), 'https://trailpaint.org');
    expect(html).toContain("'https://trailpaint.org'");
    expect(html).not.toContain("postMessage({type:'trailpaint-project',data:d},'*'");
  });
});

describe('isAllowedMediaUrl', () => {
  it('accepts https://', () => expect(isAllowedMediaUrl('https://cdn.example.com/a.mp3')).toBe(true));
  it('accepts absolute path', () => expect(isAllowedMediaUrl('/music/a.mp3')).toBe(true));
  it('accepts relative ./', () => expect(isAllowedMediaUrl('./a.mp3')).toBe(true));
  it('accepts relative ../', () => expect(isAllowedMediaUrl('../music/a.mp3')).toBe(true));
  it('rejects http://', () => expect(isAllowedMediaUrl('http://tracker.example.com/a.mp3')).toBe(false));
  it('rejects javascript:', () => expect(isAllowedMediaUrl('javascript:alert(1)')).toBe(false));
  it('rejects data:', () => expect(isAllowedMediaUrl('data:audio/mp3;base64,AAAA')).toBe(false));
  it('rejects protocol-relative //', () => expect(isAllowedMediaUrl('//evil.com/a.mp3')).toBe(false));
  it('rejects empty string', () => expect(isAllowedMediaUrl('')).toBe(false));
  it('rejects oversized URL > 2000 chars', () => expect(isAllowedMediaUrl('https://' + 'a'.repeat(2000))).toBe(false));
});
