/**
 * MapToast — passive listener for `tp:overlay-load-failed` window events.
 *
 * Decoupled from useOverlayLayer hook (which dispatches via callback) so that:
 *   - the hook stays a leaf utility with no UI concerns
 *   - both Editor and Player render the same toast component without prop drilling
 *
 * Auto-hides after 4s. Excluded from `captureMap` exports via `.map-toast` filter
 * (it's a transient notification, not map content).
 */

import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';

const OVERLAY_LOAD_FAILED_EVENT = 'tp:overlay-load-failed';
const TOAST_DURATION_MS = 4000;

export default function MapToast() {
  const [msg, setMsg] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = () => {
      setMsg(t('overlay.loadFailed'));
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setMsg(''), TOAST_DURATION_MS);
    };
    window.addEventListener(OVERLAY_LOAD_FAILED_EVENT, handler);
    return () => {
      window.removeEventListener(OVERLAY_LOAD_FAILED_EVENT, handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!msg) return null;
  return (
    <div className="map-toast" role="status" aria-live="polite">
      {msg}
    </div>
  );
}

/** Dispatch helper — used by overlay-error callbacks in BasemapSwitcher / PlayerBasemapSwitcher. */
export function dispatchOverlayLoadFailed() {
  window.dispatchEvent(new CustomEvent(OVERLAY_LOAD_FAILED_EVENT));
}
