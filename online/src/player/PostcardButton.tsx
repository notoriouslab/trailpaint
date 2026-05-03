/**
 * PostcardButton — floating 📮 button on PlayerMap that captures the current
 * map view + active spot + currentYear, renders a 1080x1080 IG-square postcard
 * via postcardRenderer, and surfaces a modal preview with download.
 *
 * Design ref: openspec/changes/2026-05-03-016-time-slider-postcard/design.md B4
 *
 * Excluded from captureMap exports via .postcard-button / .postcard-modal classes.
 */

import { useState, useEffect } from 'react';
import { t, currentLocale } from '../i18n';
import { captureMap, sanitizeFilename } from '../map/ExportButton';
import { renderPostcard } from '../core/utils/postcardRenderer';
import type { StampLocale } from '../core/utils/postcardStamp';
import { usePlayerStore } from './usePlayerStore';

interface PostcardButtonProps {
  /** Current calendar year on the TimeSlider (drives stamp era text). */
  currentYear: number;
}

type RenderState =
  | { kind: 'idle' }
  | { kind: 'rendering' }
  | { kind: 'ready'; url: string; blob: Blob; filename: string }
  | { kind: 'error'; msg: string };

function resolveLocale(): StampLocale {
  if (currentLocale === 'en') return 'en';
  if (currentLocale === 'ja') return 'ja';
  return 'zh-TW';
}

export default function PostcardButton({ currentYear }: PostcardButtonProps) {
  const project = usePlayerStore((s) => s.project);
  const activeIndex = usePlayerStore((s) => s.activeSpotIndex);
  const [state, setState] = useState<RenderState>({ kind: 'idle' });

  // Revoke object URL on unmount or when state transitions away from `ready`
  useEffect(() => {
    if (state.kind === 'ready') {
      return () => URL.revokeObjectURL(state.url);
    }
  }, [state]);

  if (!project) return null;

  const handleClick = async () => {
    if (state.kind === 'rendering') return;
    setState({ kind: 'rendering' });
    try {
      const captured = await captureMap(2);
      const spot =
        activeIndex !== null && activeIndex >= 0 && activeIndex < project.spots.length
          ? project.spots[activeIndex]
          : project.spots[0];
      const blob = await renderPostcard({
        capturedMap: captured,
        stamp: {
          year: currentYear,
          location: spot?.title,
          scriptureRef: spot?.scripture_refs?.[0],
        },
        locale: resolveLocale(),
      });
      const url = URL.createObjectURL(blob);
      const yearLabel = currentYear < 0 ? `BC${-currentYear}` : `AD${currentYear}`;
      const filename = `trailpaint-postcard-${sanitizeFilename(spot?.title ?? project.name)}-${yearLabel}.png`;
      setState({ kind: 'ready', url, blob, filename });
    } catch (e) {
      console.error('Postcard render failed:', e);
      setState({ kind: 'error', msg: t('postcard.error') });
    }
  };

  const handleDownload = () => {
    if (state.kind !== 'ready') return;
    const a = document.createElement('a');
    a.href = state.url;
    a.download = state.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleClose = () => {
    setState({ kind: 'idle' });
  };

  return (
    <>
      <button
        type="button"
        className={`postcard-button${state.kind === 'rendering' ? ' postcard-button--busy' : ''}`}
        onClick={handleClick}
        disabled={state.kind === 'rendering'}
        title={t('postcard.create')}
        aria-label={t('postcard.create')}
      >
        📮
      </button>

      {(state.kind === 'ready' || state.kind === 'rendering' || state.kind === 'error') && (
        <div
          className="postcard-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
          role="dialog"
          aria-modal="true"
          aria-label={t('postcard.preview.title')}
        >
          <div className="postcard-modal">
            {state.kind === 'rendering' && (
              <div className="postcard-modal__spinner">{t('postcard.rendering')}</div>
            )}
            {state.kind === 'error' && (
              <div className="postcard-modal__error">{state.msg}</div>
            )}
            {state.kind === 'ready' && (
              <>
                <img
                  className="postcard-modal__preview"
                  src={state.url}
                  alt={t('postcard.preview.title')}
                />
                <div className="postcard-modal__actions">
                  <button
                    type="button"
                    className="postcard-modal__btn postcard-modal__btn--primary"
                    onClick={handleDownload}
                  >
                    {t('postcard.download')}
                  </button>
                  <button
                    type="button"
                    className="postcard-modal__btn"
                    onClick={handleClose}
                  >
                    {t('postcard.close')}
                  </button>
                </div>
              </>
            )}
            {(state.kind === 'rendering' || state.kind === 'error') && (
              <button
                type="button"
                className="postcard-modal__btn"
                onClick={handleClose}
                style={{ marginTop: 16 }}
              >
                {t('postcard.close')}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
