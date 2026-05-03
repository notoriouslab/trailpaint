/**
 * Postcard renderer — composes a 1080x1080 IG-square image:
 *   0–540   : map cover-fit (tiles + overlays)
 *   540–900 : spot card (photo 280x280 left, title / scripture / desc right)
 *   900–1080: era stamp (large era text, via TrailPaint watermark)
 *
 * Design ref: openspec/changes/2026-05-03-016-time-slider-postcard/design.md B4
 *
 * Spec drift (2026-05-03 主公 hotfix): original 720/360 felt flat — no spot
 * identity. Amended to 540/360/180 with photo + title + scripture + desc in
 * the middle band, so the postcard reads as "this place, this time".
 */

import type { CapturedMap } from './exportRenderer';
import { formatEra, formatScriptureRef, type StampLocale } from './postcardStamp';
import { stripUnsafeChars } from './textSanitize';

const POSTCARD_SIZE = 1080;
const MAP_HEIGHT = 540;
const CARD_TOP = MAP_HEIGHT;
const CARD_HEIGHT = 360;
const STAMP_TOP = CARD_TOP + CARD_HEIGHT;
const STAMP_HEIGHT = POSTCARD_SIZE - STAMP_TOP;

const PADDING = 60;
const PHOTO_SIZE = 280;
const PHOTO_RADIUS = 14;
const TEXT_LEFT = PADDING + PHOTO_SIZE + 40;
const TEXT_WIDTH = POSTCARD_SIZE - PADDING - TEXT_LEFT;

const COLOR_BG = '#fdf8ef';
const COLOR_CARD_BG = '#faf5eb';
const COLOR_BORDER = '#7c3a0e';
const COLOR_TEXT = '#3b1a06';
const COLOR_MUTED = '#8b6914';
const COLOR_PHOTO_PLACEHOLDER = '#e5dcc8';

const FONT_STACK = '"EB Garamond", "Cormorant Garamond", "Noto Serif TC", "Noto Serif JP", Georgia, serif';

export interface PostcardSpotInput {
  title?: string;
  /** base64 data URL or null. */
  photo?: string | null;
  desc?: string;
  scriptureRef?: string;
}

export interface PostcardOptions {
  capturedMap: CapturedMap;
  /** Year only — location / scripture moved into spot card section. */
  stamp: { year: number };
  /** Spot card content. Omit to hide the card section's text (photo placeholder still drawn). */
  spot?: PostcardSpotInput;
  /** Project or compilation name — rendered bottom-right of the spot card section. */
  projectName?: string;
  locale: StampLocale;
}

export async function renderPostcard({
  capturedMap,
  stamp,
  spot,
  projectName,
  locale,
}: PostcardOptions): Promise<Blob> {
  const useOffscreen = typeof OffscreenCanvas !== 'undefined';
  const canvas: OffscreenCanvas | HTMLCanvasElement = useOffscreen
    ? new OffscreenCanvas(POSTCARD_SIZE, POSTCARD_SIZE)
    : (() => {
        const c = document.createElement('canvas');
        c.width = POSTCARD_SIZE;
        c.height = POSTCARD_SIZE;
        return c;
      })();
  const ctx = canvas.getContext('2d') as
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D
    | null;
  if (!ctx) throw new Error('postcardRenderer: 2D context unavailable');

  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, POSTCARD_SIZE, POSTCARD_SIZE);

  drawMapCoverFit(ctx as CanvasRenderingContext2D, capturedMap, 0, 0, POSTCARD_SIZE, MAP_HEIGHT);
  await drawSpotCard(ctx as CanvasRenderingContext2D, spot, projectName);
  drawStampPanel(ctx as CanvasRenderingContext2D, stamp.year, locale);

  if (canvas instanceof OffscreenCanvas) {
    return await canvas.convertToBlob({ type: 'image/png' });
  }
  return new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob((blob) => {
      if (!blob) reject(new Error('postcardRenderer: toBlob returned null'));
      else resolve(blob);
    }, 'image/png');
  });
}

/* ── Section 1: map ─────────────────────────────────────────────────────── */

function drawMapCoverFit(
  ctx: CanvasRenderingContext2D,
  cm: CapturedMap,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const src = cm.tilesImg;
  const sw = src.naturalWidth || src.width;
  const sh = src.naturalHeight || src.height;
  if (sw === 0 || sh === 0) return;
  const scale = Math.max(dw / sw, dh / sh);
  const renderW = sw * scale;
  const renderH = sh * scale;
  const cx = dx + (dw - renderW) / 2;
  const cy = dy + (dh - renderH) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(dx, dy, dw, dh);
  ctx.clip();
  ctx.drawImage(src, cx, cy, renderW, renderH);
  ctx.drawImage(cm.overlaysImg, cx, cy, renderW, renderH);
  ctx.restore();
}

/* ── Section 2: spot card ───────────────────────────────────────────────── */

async function drawSpotCard(
  ctx: CanvasRenderingContext2D,
  spot: PostcardSpotInput | undefined,
  projectName: string | undefined,
): Promise<void> {
  ctx.fillStyle = COLOR_CARD_BG;
  ctx.fillRect(0, CARD_TOP, POSTCARD_SIZE, CARD_HEIGHT);

  ctx.strokeStyle = COLOR_BORDER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PADDING, CARD_TOP + 4);
  ctx.lineTo(POSTCARD_SIZE - PADDING, CARD_TOP + 4);
  ctx.stroke();

  if (!spot) return;

  const photoX = PADDING;
  const photoY = CARD_TOP + 40;
  await drawPhotoOrPlaceholder(ctx, spot.photo, photoX, photoY, PHOTO_SIZE, PHOTO_SIZE);

  let cursorY = photoY + 4;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  if (spot.title) {
    ctx.fillStyle = COLOR_TEXT;
    ctx.font = `36px ${FONT_STACK}`;
    // Strip RTL / bidi-override / control chars before drawing — same defence
    // as formatScriptureRef. An attacker-supplied title containing U+202E
    // would otherwise reverse downstream text on the postcard.
    const titleLines = wrapText(ctx, stripUnsafeChars(spot.title), TEXT_WIDTH, 2);
    for (const line of titleLines) {
      ctx.fillText(line, TEXT_LEFT, cursorY);
      cursorY += 44;
    }
    cursorY += 6;
  }

  if (spot.scriptureRef) {
    const ref = formatScriptureRef(spot.scriptureRef);
    if (ref) {
      ctx.fillStyle = COLOR_MUTED;
      ctx.font = `italic 22px ${FONT_STACK}`;
      ctx.fillText(ref, TEXT_LEFT, cursorY);
      cursorY += 32;
    }
  }

  if (spot.desc) {
    ctx.fillStyle = COLOR_TEXT;
    ctx.font = `18px ${FONT_STACK}`;
    const cleaned = stripDescDecorations(spot.desc);
    // Reserve bottom space for projectName line (18px italic + breathing room)
    const reservedBottom = projectName ? 36 : 0;
    const remainingLines = Math.max(
      1,
      Math.floor((photoY + PHOTO_SIZE - cursorY - reservedBottom) / 26),
    );
    const lines = wrapText(ctx, cleaned, TEXT_WIDTH, remainingLines);
    for (const line of lines) {
      ctx.fillText(line, TEXT_LEFT, cursorY);
      cursorY += 26;
    }
  }

  // Project / compilation name — bottom-right of card section, italic muted
  if (projectName) {
    ctx.fillStyle = COLOR_MUTED;
    ctx.font = `italic 18px ${FONT_STACK}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(projectName, POSTCARD_SIZE - PADDING, CARD_TOP + CARD_HEIGHT - 22);
  }
}

async function drawPhotoOrPlaceholder(
  ctx: CanvasRenderingContext2D,
  src: string | null | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
): Promise<void> {
  ctx.save();
  roundedRectPath(ctx, x, y, w, h, PHOTO_RADIUS);
  ctx.clip();

  if (src) {
    try {
      const img = await loadImage(src);
      const sw = img.naturalWidth || img.width;
      const sh = img.naturalHeight || img.height;
      if (sw > 0 && sh > 0) {
        const scale = Math.max(w / sw, h / sh);
        const rw = sw * scale;
        const rh = sh * scale;
        ctx.drawImage(img, x + (w - rw) / 2, y + (h - rh) / 2, rw, rh);
        ctx.restore();
        roundedRectPath(ctx, x, y, w, h, PHOTO_RADIUS);
        ctx.strokeStyle = COLOR_BORDER;
        ctx.lineWidth = 1;
        ctx.stroke();
        return;
      }
    } catch {
      // fall through to placeholder
    }
  }

  ctx.fillStyle = COLOR_PHOTO_PLACEHOLDER;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = COLOR_MUTED;
  ctx.font = `64px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📷', x + w / 2, y + h / 2);
  ctx.restore();
  roundedRectPath(ctx, x, y, w, h, PHOTO_RADIUS);
  ctx.strokeStyle = COLOR_BORDER;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/* ── Section 3: stamp ───────────────────────────────────────────────────── */

function drawStampPanel(
  ctx: CanvasRenderingContext2D,
  year: number,
  locale: StampLocale,
): void {
  ctx.strokeStyle = COLOR_BORDER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PADDING, STAMP_TOP + 4);
  ctx.lineTo(POSTCARD_SIZE - PADDING, STAMP_TOP + 4);
  ctx.stroke();

  ctx.fillStyle = COLOR_TEXT;
  ctx.font = `64px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatEra(year, locale), POSTCARD_SIZE / 2, STAMP_TOP + STAMP_HEIGHT / 2 - 8);

  ctx.fillStyle = COLOR_MUTED;
  ctx.font = `16px ${FONT_STACK}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('via TrailPaint · trailpaint.org', POSTCARD_SIZE - PADDING, POSTCARD_SIZE - 24);
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Defence in depth: today spot.photo is always a base64 data: URL (no CORS
    // implications), but if a future schema allows external photo URLs the
    // canvas would taint without crossOrigin set, breaking toBlob silently.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let line = '';
  let i = 0;
  const chars = Array.from(text);
  while (i < chars.length) {
    const ch = chars[i];
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      lines.push(line);
      if (lines.length >= maxLines) break;
      line = ch;
    } else {
      line = test;
    }
    i += 1;
  }
  if (line.length > 0 && lines.length < maxLines) lines.push(line);
  if (i < chars.length && lines.length === maxLines) {
    lines[maxLines - 1] = trimWithEllipsis(ctx, lines[maxLines - 1], maxWidth);
  }
  return lines;
}

function trimWithEllipsis(
  ctx: CanvasRenderingContext2D,
  line: string,
  maxWidth: number,
): string {
  const ellipsis = '…';
  let candidate = line + ellipsis;
  while (candidate.length > 1 && ctx.measureText(candidate).width > maxWidth) {
    candidate = candidate.slice(0, -2) + ellipsis;
  }
  return candidate;
}

function stripDescDecorations(desc: string): string {
  // Strip credits + RTL/control chars in one pass: photo credit (📷 ...) gets
  // truncated, then unsafe chars removed so a malicious desc can't reverse
  // downstream text on the postcard.
  const idx = desc.indexOf('📷');
  const truncated = idx === -1 ? desc : desc.slice(0, idx);
  return stripUnsafeChars(truncated).trim();
}
