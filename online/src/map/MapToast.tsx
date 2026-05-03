/**
 * MapToast — passive listener for overlay-load-failed notifications.
 *
 * Hardened against external spoofing: previously used `window.dispatchEvent`
 * with a string event name, which any script (including malicious iframes
 * sharing the page) could fire. Now uses a module-private listener set so
 * only `dispatchOverlayLoadFailed` from the same bundle can trigger toasts.
 *
 * Auto-hides after 4s. Excluded from captureMap exports via `.map-toast`
 * filter (it's a transient notification, not map content).
 */

import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';

const TOAST_DURATION_MS = 4000;

type Listener = () => void;
const listeners = new Set<Listener>();

/** Subscribe to overlay-load-failed events. Returns an unsubscribe fn. */
function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Fire all subscribed overlay-load-failed listeners. Module-internal — caller
 * must import this function (compile-time gate) instead of guessing an event name.
 */
export function dispatchOverlayLoadFailed(): void {
  // Snapshot to avoid mutation during iteration if a listener unsubscribes itself.
  for (const fn of [...listeners]) fn();
}

export default function MapToast() {
  const [msg, setMsg] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = () => {
      setMsg(t('overlay.loadFailed'));
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setMsg(''), TOAST_DURATION_MS);
    };
    const unsubscribe = subscribe(handler);
    return () => {
      unsubscribe();
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
