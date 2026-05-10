import { describe, it, expect } from 'vitest';
import { stripJsonCodeFence } from './pasteJsonInput';

describe('stripJsonCodeFence', () => {
  it('returns raw JSON untouched when no fence present', () => {
    const input = '{"name":"foo","spots":[]}';
    expect(stripJsonCodeFence(input)).toBe(input);
  });

  it('strips ```json fence with newlines', () => {
    const input = '```json\n{"name":"foo"}\n```';
    expect(stripJsonCodeFence(input)).toBe('{"name":"foo"}');
  });

  it('strips plain ``` fence without language hint', () => {
    const input = '```\n{"name":"foo"}\n```';
    expect(stripJsonCodeFence(input)).toBe('{"name":"foo"}');
  });

  it('strips ```javascript and ```js variants', () => {
    expect(stripJsonCodeFence('```javascript\n{"a":1}\n```')).toBe('{"a":1}');
    expect(stripJsonCodeFence('```js\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('is case-insensitive on the language hint', () => {
    expect(stripJsonCodeFence('```JSON\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('trims leading/trailing whitespace around the fence', () => {
    const input = '   \n```json\n{"a":1}\n```   \n';
    expect(stripJsonCodeFence(input)).toBe('{"a":1}');
  });

  it('leaves unfenced JSON with surrounding whitespace trimmed', () => {
    expect(stripJsonCodeFence('  \n{"a":1}\n  ')).toBe('{"a":1}');
  });

  it('only strips one outer fence, not inline backticks inside JSON', () => {
    const input = '```json\n{"desc":"`code inline`"}\n```';
    expect(stripJsonCodeFence(input)).toBe('{"desc":"`code inline`"}');
  });

  it('returns empty string for empty input', () => {
    expect(stripJsonCodeFence('')).toBe('');
    expect(stripJsonCodeFence('   \n  ')).toBe('');
  });
});
