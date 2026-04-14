import type { StyleFilter } from './exportRenderer';

/**
 * Apply a style filter to a canvas in-place.
 * All filters are pure Canvas 2D pixel manipulation — zero API calls.
 */
export function applyStyleFilter(canvas: HTMLCanvasElement, filter: StyleFilter): void {
  switch (filter) {
    case 'sketch':
      applySketch(canvas);
      break;
    // 'original' — no-op
  }
}

/* ── Sketch: 灰階 + Sobel 邊緣偵測 ── */

function applySketch(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const src = imageData.data;

  // Convert to grayscale array
  const gray = new Float32Array(w * h);
  for (let i = 0; i < gray.length; i++) {
    const j = i * 4;
    gray[i] = 0.299 * src[j] + 0.587 * src[j + 1] + 0.114 * src[j + 2];
  }

  // Sobel edge detection
  const output = ctx.createImageData(w, h);
  const od = output.data;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      // Sobel kernels
      const gx =
        -gray[idx - w - 1] + gray[idx - w + 1] +
        -2 * gray[idx - 1] + 2 * gray[idx + 1] +
        -gray[idx + w - 1] + gray[idx + w + 1];
      const gy =
        -gray[idx - w - 1] - 2 * gray[idx - w] - gray[idx - w + 1] +
        gray[idx + w - 1] + 2 * gray[idx + w] + gray[idx + w + 1];

      // Magnitude → invert (dark edges on white background)
      const mag = Math.min(255, Math.sqrt(gx * gx + gy * gy));
      const val = 255 - mag;

      const oi = idx * 4;
      // Slight warm tint for pencil feel
      od[oi] = clamp(val - 5);
      od[oi + 1] = clamp(val - 3);
      od[oi + 2] = clamp(val + 2);
      od[oi + 3] = 255;
    }
  }

  // Fill edges (first/last row/col) with white
  for (let x = 0; x < w; x++) {
    const top = x * 4;
    const bot = ((h - 1) * w + x) * 4;
    od[top] = od[top + 1] = od[top + 2] = 250; od[top + 3] = 255;
    od[bot] = od[bot + 1] = od[bot + 2] = 250; od[bot + 3] = 255;
  }
  for (let y = 0; y < h; y++) {
    const left = (y * w) * 4;
    const right = (y * w + w - 1) * 4;
    od[left] = od[left + 1] = od[left + 2] = 250; od[left + 3] = 255;
    od[right] = od[right + 1] = od[right + 2] = 250; od[right + 3] = 255;
  }

  ctx.putImageData(output, 0, 0);
}

/* ── Helpers ── */

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}
