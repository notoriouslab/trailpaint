import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderExportCanvas, type CapturedMap, type RenderOptions, type StyleFilter } from './exportRenderer';

type CallLog = string[];

function installFakeCanvas(log: CallLog): () => void {
  const fakeCtx = new Proxy({} as Record<string | symbol, unknown>, {
    get(_target, prop) {
      if (prop === 'drawImage') {
        return (img: { __id?: string }) => log.push(`drawImage:${img.__id ?? 'unknown'}`);
      }
      // All other methods/properties — return noop fn or undefined
      return () => {};
    },
    set() { return true; },
  });

  const fakeCanvas = {
    width: 0,
    height: 0,
    getContext: () => fakeCtx,
  };

  const origDocument = (globalThis as { document?: unknown }).document;
  (globalThis as unknown as { document: { createElement: (t: string) => unknown } }).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') return fakeCanvas;
      return {};
    },
  };

  return () => {
    if (origDocument === undefined) {
      delete (globalThis as { document?: unknown }).document;
    } else {
      (globalThis as unknown as { document: unknown }).document = origDocument;
    }
  };
}

function fakeImage(id: string): HTMLImageElement {
  return { width: 800, height: 600, __id: id } as unknown as HTMLImageElement;
}

const baseOptions = (filter: StyleFilter): RenderOptions => ({
  format: 'full',
  borderStyle: 'minimal',
  filter,
  showWatermark: false,
  routes: [],
  showStats: false,
});

describe('renderExportCanvas — 三層 pipeline（tiles → filter → overlays）', () => {
  let log: CallLog;
  let restore: () => void;

  beforeEach(() => {
    log = [];
    restore = installFakeCanvas(log);
  });

  afterEach(() => {
    restore();
  });

  it('filter=original 時不呼叫 applyFilter，但 tiles 與 overlays 都畫一次', () => {
    const applyFilter = vi.fn();
    const map: CapturedMap = { tilesImg: fakeImage('tiles'), overlaysImg: fakeImage('overlays') };

    renderExportCanvas(map, baseOptions('original'), applyFilter);

    expect(applyFilter).not.toHaveBeenCalled();
    expect(log).toEqual(['drawImage:tiles', 'drawImage:overlays']);
  });

  it('filter=sketch 時順序：tilesImg → applyFilter(sketch) → overlaysImg', () => {
    const map: CapturedMap = { tilesImg: fakeImage('tiles'), overlaysImg: fakeImage('overlays') };
    const applyFilter = vi.fn((_canvas: HTMLCanvasElement, filter: StyleFilter) => {
      log.push(`applyFilter:${filter}`);
    });

    renderExportCanvas(map, baseOptions('sketch'), applyFilter);

    expect(log).toEqual([
      'drawImage:tiles',
      'applyFilter:sketch',
      'drawImage:overlays',
    ]);
    expect(applyFilter).toHaveBeenCalledTimes(1);
  });

  it('applyFilter 不會在 overlaysImg 畫上後才呼叫（核心保證：素描不影響 overlay）', () => {
    const map: CapturedMap = { tilesImg: fakeImage('tiles'), overlaysImg: fakeImage('overlays') };
    const applyFilter = vi.fn((_canvas: HTMLCanvasElement, filter: StyleFilter) => {
      log.push(`applyFilter:${filter}`);
    });

    renderExportCanvas(map, baseOptions('sketch'), applyFilter);

    const filterIdx = log.indexOf('applyFilter:sketch');
    const overlaysIdx = log.indexOf('drawImage:overlays');
    expect(filterIdx).toBeGreaterThan(-1);
    expect(overlaysIdx).toBeGreaterThan(-1);
    expect(filterIdx).toBeLessThan(overlaysIdx);
  });

  it('tilesImg 和 overlaysImg 的尺寸用於 crop 計算（以 tilesImg 為準）', () => {
    const tilesImg = { width: 1200, height: 800, __id: 'tiles' } as unknown as HTMLImageElement;
    const overlaysImg = { width: 1200, height: 800, __id: 'overlays' } as unknown as HTMLImageElement;
    const applyFilter = vi.fn();

    // 1:1 crop on 1200x800 should not throw and should still produce two drawImage calls
    expect(() => renderExportCanvas({ tilesImg, overlaysImg }, {
      ...baseOptions('original'),
      format: '1:1',
    }, applyFilter)).not.toThrow();

    expect(log).toEqual(['drawImage:tiles', 'drawImage:overlays']);
  });
});
