import type { StyleFilter } from './exportRenderer';

/**
 * Apply a style filter to a canvas in-place.
 * All filters are pure Canvas 2D pixel manipulation — zero API calls.
 */
export function applyStyleFilter(canvas: HTMLCanvasElement, filter: StyleFilter): void {
  switch (filter) {
    case 'watercolor':
      applyWatercolor(canvas);
      break;
    case 'sketch':
      applySketch(canvas);
      break;
    case 'vintage':
      applyVintage(canvas);
      break;
    case 'comic':
      applyComic(canvas);
      break;
    // 'original' — no-op
  }
}

/* ── Watercolor: 降飽和 + blur + grain ── */

function applyWatercolor(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const w = canvas.width;
  const h = canvas.height;

  // Step 1: Desaturate + slight brightness boost via pixel manipulation
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    // Mix 55% original + 45% gray → soft desaturation
    d[i] = Math.min(255, r * 0.55 + gray * 0.45 + 8);
    d[i + 1] = Math.min(255, g * 0.55 + gray * 0.45 + 8);
    d[i + 2] = Math.min(255, b * 0.55 + gray * 0.45 + 8);
  }
  ctx.putImageData(imageData, 0, 0);

  // Step 2: Soft blur via canvas filter (well-supported)
  const temp = document.createElement('canvas');
  temp.width = w;
  temp.height = h;
  const tctx = temp.getContext('2d')!;
  tctx.filter = 'blur(1.5px)';
  tctx.drawImage(canvas, 0, 0);
  // Blend: 70% blurred + 30% original for a soft-focus look
  ctx.globalAlpha = 0.7;
  ctx.drawImage(temp, 0, 0);
  ctx.globalAlpha = 1.0;

  // Step 3: Paper grain overlay
  const grain = ctx.getImageData(0, 0, w, h);
  const gd = grain.data;
  for (let i = 0; i < gd.length; i += 4) {
    const noise = (Math.random() - 0.5) * 18;
    gd[i] = clamp(gd[i] + noise);
    gd[i + 1] = clamp(gd[i + 1] + noise);
    gd[i + 2] = clamp(gd[i + 2] + noise);
  }
  ctx.putImageData(grain, 0, 0);
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

/* ── Vintage: sepia + vignette + 紙紋 ── */

function applyVintage(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const w = canvas.width;
  const h = canvas.height;

  // Step 1: Sepia tone
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    d[i] = clamp(r * 0.393 + g * 0.769 + b * 0.189);
    d[i + 1] = clamp(r * 0.349 + g * 0.686 + b * 0.168);
    d[i + 2] = clamp(r * 0.272 + g * 0.534 + b * 0.131);
  }
  ctx.putImageData(imageData, 0, 0);

  // Step 2: Subtle paper noise
  const noiseData = ctx.getImageData(0, 0, w, h);
  const nd = noiseData.data;
  for (let i = 0; i < nd.length; i += 4) {
    const noise = (Math.random() - 0.5) * 12;
    nd[i] = clamp(nd[i] + noise);
    nd[i + 1] = clamp(nd[i + 1] + noise);
    nd[i + 2] = clamp(nd[i + 2] + noise);
  }
  ctx.putImageData(noiseData, 0, 0);

  // Step 3: Vignette (radial gradient overlay)
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.sqrt(cx * cx + cy * cy);
  const vignette = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.7, 'rgba(0,0,0,0.15)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

/* ── Comic: 高對比 + 色階量化 + 粗邊線 ── */

function applyComic(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const w = canvas.width;
  const h = canvas.height;

  // Step 1: Edge detection (for thick outlines)
  const original = ctx.getImageData(0, 0, w, h);
  const src = original.data;

  const gray = new Float32Array(w * h);
  for (let i = 0; i < gray.length; i++) {
    const j = i * 4;
    gray[i] = 0.299 * src[j] + 0.587 * src[j + 1] + 0.114 * src[j + 2];
  }

  // Sobel for edges
  const edges = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const gx =
        -gray[idx - w - 1] + gray[idx - w + 1] +
        -2 * gray[idx - 1] + 2 * gray[idx + 1] +
        -gray[idx + w - 1] + gray[idx + w + 1];
      const gy =
        -gray[idx - w - 1] - 2 * gray[idx - w] - gray[idx - w + 1] +
        gray[idx + w - 1] + 2 * gray[idx + w] + gray[idx + w + 1];
      edges[idx] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  // Step 2: Color quantization (reduce to ~8 levels per channel) + high contrast + draw edges
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const levels = 6; // fewer levels = more cartoon-like
  const step = 255 / levels;

  for (let i = 0; i < w * h; i++) {
    const j = i * 4;

    // Boost contrast first
    let r = clamp((d[j] - 128) * 1.4 + 128);
    let g = clamp((d[j + 1] - 128) * 1.4 + 128);
    let b = clamp((d[j + 2] - 128) * 1.4 + 128);

    // Quantize
    r = Math.round(r / step) * step;
    g = Math.round(g / step) * step;
    b = Math.round(b / step) * step;

    // Edge overlay: darken where edges are strong
    const edgeStrength = Math.min(1, edges[i] / 80);
    if (edgeStrength > 0.3) {
      const darkFactor = 1 - edgeStrength * 0.85;
      r *= darkFactor;
      g *= darkFactor;
      b *= darkFactor;
    }

    d[j] = clamp(r);
    d[j + 1] = clamp(g);
    d[j + 2] = clamp(b);
  }

  ctx.putImageData(imageData, 0, 0);
}

/* ── Helpers ── */

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}
