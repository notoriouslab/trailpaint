/**
 * ShareSpotButton (027) — 🔗 above the postcard button. Shares a link that
 * reopens this story on the active spot at the current year: the story page
 * when the Player runs inside one, else the Player with the same ?src=.
 * Hidden when the story didn't come from a URL (dropped file, Editor, #share=).
 */

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { t } from '../i18n';
import { usePlayerStore } from './usePlayerStore';
import { buildShareLink, isTimed, spotKey } from './deepLink';
import { initialYear } from './initialYear';

export default function ShareSpotButton() {
  const project = usePlayerStore((s) => s.project);
  const activeIndex = usePlayerStore((s) => s.activeSpotIndex);
  const currentYear = usePlayerStore((s) => s.currentYear);
  const base = usePlayerStore((s) => s.shareBase);
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(noteTimer.current), []);
  // The button sits inside the map container: keep its clicks from reaching
  // Leaflet, which would close the open popup.
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hasButton = !!project && !!base;
  useEffect(() => {
    if (buttonRef.current) L.DomEvent.disableClickPropagation(buttonRef.current);
  }, [hasButton]);

  if (!project || !base) return null;
  const spot = activeIndex !== null ? project.spots[activeIndex] : undefined;
  // The year only means something on stories with a time axis, and the
  // opening year needs no parameter.
  const year = isTimed(project) && currentYear !== initialYear(project) ? currentYear : null;
  const label = spot ? t('player.share.spot') : t('player.share.story');

  const flash = (msg: string) => {
    setNote(msg);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(null), 2000);
  };

  const handleClick = async () => {
    const url = buildShareLink(base, spot ? spotKey(spot) : null, year);
    if (navigator.share) {
      try {
        await navigator.share({ title: spot?.title ?? project.name, url });
        return;
      } catch (e) {
        // Dismissed by the user; anything else (e.g. a third-party iframe
        // without allow="web-share") falls back to the clipboard.
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      flash(t('player.share.copied'));
    } catch {
      flash(t('player.share.failed'));
    }
  };

  return (
    <>
      <button ref={buttonRef} type="button" className="share-spot-button" onClick={handleClick} title={label} aria-label={label}>
        🔗
      </button>
      {note && <div className="share-spot-note" role="status">{note}</div>}
    </>
  );
}
