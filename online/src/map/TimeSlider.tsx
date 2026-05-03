/**
 * TimeSlider — horizontal time-picker that cross-fades historical map overlays.
 *
 * Design ref: openspec/changes/2026-05-03-016-time-slider-postcard/design.md B1, D1, D7
 *
 * Layout:
 *   - Pill anchored to top of map (top:10, left:10, right:10) — does not collide
 *     with the right-side control stack (BasemapSwitcher / LocateButton / FitAllButton)
 *     nor with PlaybackControl at the bottom.
 *   - Tick dots distributed evenly along a horizontal rail, oldest left → modern right
 *     (matches reading direction: drag right = move forward in time).
 *   - Thumb tooltip shows the active era name; other ticks are bare dots.
 *
 * Behaviour:
 *   - Drag thumb (or tap rail) → snap to nearest tick → onChange(overlayId)
 *   - Cross-fade animation handled by useOverlayLayer hook (shared with BasemapSwitcher)
 *   - Filter ticks to overlays geographically relevant to current spots
 *     (London route doesn't list China overlays).
 *   - Hide entire component when fewer than 2 relevant ticks remain (only "modern"
 *     left = no meaningful interaction).
 *
 * T1b scope: HISTORY_SCALE only. Bible scale toggle deferred to T6 (CP3).
 * Excluded from `captureMap` exports via `.time-slider` filter (control, not content).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { t } from '../i18n';
import { HISTORY_SCALE, BIBLE_SCALE, type Scale, type ScaleGroupId } from './eraScales';
import { getRelevantOverlayIds } from './overlays';

/** Payload delivered to onChange when a tick is selected. */
export interface TimeSliderTick {
  /** Overlay id mapped to this tick, or null for modern / overlay-less ticks. */
  overlayId: string | null;
  /** Calendar year (BC negative, AD positive) — drives spot era fade. */
  year: number;
  /** i18n key for the tick label — useful for postcard stamps. */
  labelKey: string;
}

interface TimeSliderProps {
  /** Currently active overlay id, or null for none/modern. */
  overlayId: string | null;
  /** Called when user drags or taps to a new tick. */
  onChange: (tick: TimeSliderTick) => void;
  /** Spot positions used to filter ticks down to geographically relevant overlays. */
  spotsLatLngs: ReadonlyArray<readonly [number, number]>;
}

/** Sort newest→oldest scale into oldest→newest for left-to-right rendering. */
function reverseChronological(scale: Scale[]): Scale[] {
  return [...scale].reverse();
}

export default function TimeSlider({ overlayId, onChange, spotsLatLngs }: TimeSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [scaleGroup, setScaleGroup] = useState<ScaleGroupId>('history');

  // History scale: filter overlays by spot bounds, then reverse for left-old/right-new.
  // Bible scale: keep all 7 ticks (geographic filter doesn't apply — most ticks have
  // no overlay, just drive spot era fade).
  const scale = useMemo(() => {
    if (scaleGroup === 'bible') {
      return reverseChronological(BIBLE_SCALE);
    }
    const relevantIds = getRelevantOverlayIds(spotsLatLngs);
    const filtered = HISTORY_SCALE.filter(
      (tick) => !tick.overlayId || relevantIds.has(tick.overlayId),
    );
    return reverseChronological(filtered);
  }, [spotsLatLngs, scaleGroup]);

  const activeIndex = useMemo(() => {
    if (!overlayId) return scale.length - 1; // modern is rightmost after reversal
    const idx = scale.findIndex((tick) => tick.overlayId === overlayId);
    return idx === -1 ? scale.length - 1 : idx;
  }, [overlayId, scale]);

  const lastFiredIndexRef = useRef<number>(activeIndex);
  useEffect(() => {
    lastFiredIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Prevent map drag/scroll when interacting with the control
  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
    }
  }, []);

  // Degraded: nothing to pick (e.g. spots in a region with 0 overlays + modern).
  // Bible scale always has 7 ticks so this only triggers for empty history filter.
  if (scale.length < 2) return null;

  /** Toggle scale group. Snaps thumb to modern + clears overlay so the tile state
   *  matches the new scale's index 0/n-1 immediately (no half-state confusion). */
  const handleToggleScale = (next: ScaleGroupId) => {
    if (next === scaleGroup) return;
    setScaleGroup(next);
    onChange({ overlayId: null, year: new Date().getFullYear(), labelKey: 'era.modern' });
  };

  /** Map a pointer x within the track to nearest tick index. */
  const pointerToIndex = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return activeIndex;
    const rect = track.getBoundingClientRect();
    // Guard against zero-width track (display:none mid-pointer / pre-layout
    // pointerdown). Without this `clientX / 0 === Infinity` and Math.round
    // returns Infinity, producing scale[Infinity] = undefined → crash.
    if (rect.width === 0) return activeIndex;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * (scale.length - 1));
  };

  const fireChangeIfNew = (idx: number) => {
    if (idx === lastFiredIndexRef.current) return;
    lastFiredIndexRef.current = idx;
    const tick = scale[idx];
    onChange({
      overlayId: tick.overlayId ?? null,
      year: tick.year,
      labelKey: tick.labelKey,
    });
  };

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    fireChangeIfNew(pointerToIndex(e.clientX));
  };

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!draggingRef.current) return;
    fireChangeIfNew(pointerToIndex(e.clientX));
  };

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const activeTick = scale[activeIndex];
  const activeRatio = scale.length === 1 ? 0 : activeIndex / (scale.length - 1);

  return (
    <div className="time-slider time-slider--horizontal" ref={containerRef}>
      <div className="time-slider__pill">
        <div className="time-slider__group-toggle" role="radiogroup" aria-label={t('timeSlider.scaleGroup')}>
          <button
            type="button"
            className={`time-slider__group-btn${scaleGroup === 'history' ? ' time-slider__group-btn--active' : ''}`}
            onClick={() => handleToggleScale('history')}
            title={t('timeSlider.scale.history')}
            aria-label={t('timeSlider.scale.history')}
            aria-checked={scaleGroup === 'history'}
            role="radio"
          >
            🗺️
          </button>
          <button
            type="button"
            className={`time-slider__group-btn${scaleGroup === 'bible' ? ' time-slider__group-btn--active' : ''}`}
            onClick={() => handleToggleScale('bible')}
            title={t('timeSlider.scale.bible')}
            aria-label={t('timeSlider.scale.bible')}
            aria-checked={scaleGroup === 'bible'}
            role="radio"
          >
            📖
          </button>
        </div>
        <div
          className="time-slider__track"
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          role="slider"
          aria-label={t('timeSlider.title')}
          aria-valuemin={0}
          aria-valuemax={scale.length - 1}
          aria-valuenow={activeIndex}
          aria-valuetext={t(activeTick.labelKey as Parameters<typeof t>[0])}
          tabIndex={0}
        >
          <div className="time-slider__rail" />
          {scale.map((tick, i) => {
            const ratio = scale.length === 1 ? 0 : i / (scale.length - 1);
            return (
              <span
                key={`${tick.year}-${tick.labelKey}`}
                className={`time-slider__tick${i === activeIndex ? ' time-slider__tick--active' : ''}`}
                style={{ left: `${ratio * 100}%` }}
                aria-hidden="true"
              />
            );
          })}
          <div
            className="time-slider__thumb"
            style={{ left: `${activeRatio * 100}%` }}
          >
            <span className="time-slider__thumb-label">
              {t(activeTick.labelKey as Parameters<typeof t>[0])}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
