import type { Project } from '../models/types';
import { t } from '../../i18n';

const CHANNEL_NAME = 'trailpaint-player';
const PWA_HINT_FLAG = 'trailpaint-pwa-story-hint-seen';

/**
 * When running as an installed PWA (display-mode: standalone), window.open('_blank')
 * replaces the current view with the Player instead of opening a new tab. There is
 * no browser chrome to return, so we warn the user once that the "← back to editor"
 * button in the Player is their way back.
 */
function maybeShowPwaHint(): void {
  if (typeof window === 'undefined') return;
  try {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    if (!isStandalone) return;
    if (localStorage.getItem(PWA_HINT_FLAG) === '1') return;
    alert(t('story.pwaHint'));
    localStorage.setItem(PWA_HINT_FLAG, '1');
  } catch {
    // matchMedia / localStorage unavailable — skip hint silently
  }
}

/**
 * Open the Player in a new tab with this project loaded.
 *
 * Three transports in parallel for robustness across browsers:
 *   1. localStorage — fast, used by Chrome/Firefox. Fails silently if the
 *      quota is exceeded (common when project contains multiple photos).
 *   2. BroadcastChannel — same-origin cross-tab channel, doesn't depend on
 *      window.opener. Safari 15.4+ supported, reliable in iOS Safari where
 *      `window.open('_blank')` may null out the opener for security.
 *   3. window.opener postMessage — legacy path for browsers without
 *      BroadcastChannel (or if the channel subscription missed the ready ping).
 *
 * The Player picks whichever arrives first.
 */
export function openStoryMode(project: Project): void {
  maybeShowPwaHint();
  const expectedOrigin = window.location.origin;

  // Restore snapshot: PWA standalone replaces the current window when Player opens,
  // wiping the Editor's in-memory Zustand state. Save the project so that when the
  // user hits "← Back" and the Editor reloads, it can restore the work-in-progress.
  try {
    localStorage.setItem('trailpaint-editor-restore', JSON.stringify({
      project,
      savedAt: Date.now(),
    }));
  } catch {
    // Quota exceeded — user will lose the in-memory state on return.
    // Acceptable fallback: they can re-import from a backup if they saved one.
  }

  // Path 1: localStorage (fast, best-effort) — consumed and cleared by Player
  try {
    localStorage.setItem('trailpaint-player-project', JSON.stringify(project));
  } catch {
    // Quota exceeded — the broadcast/opener paths will carry the payload.
  }

  const w = window.open('/app/player/?autoplay=1', '_blank');
  if (!w) return; // popup blocked — nothing we can do

  // Path 2: BroadcastChannel — waits for Player's 'player-ready' ping
  const channel = typeof BroadcastChannel === 'function'
    ? new BroadcastChannel(CHANNEL_NAME)
    : null;
  if (channel) {
    const onChannel = (ev: MessageEvent) => {
      if (ev.data?.type === 'player-ready') {
        try {
          channel.postMessage({ type: 'project', data: project });
        } catch {
          /* structured clone failed (project too big or non-cloneable) */
        }
      }
    };
    channel.addEventListener('message', onChannel);
    setTimeout(() => {
      channel.removeEventListener('message', onChannel);
      channel.close();
    }, 30000);
  }

  // Path 3: window.opener postMessage (legacy fallback)
  const openerHandler = (e: MessageEvent) => {
    if (e.origin !== expectedOrigin) return;
    if (e.source !== w) return;
    if (e.data?.type !== 'trailpaint-opener-ready') return;
    try {
      w.postMessage({ type: 'trailpaint-project', data: project }, expectedOrigin);
    } catch {
      /* new tab closed or cross-origin — channel path should still work */
    }
    window.removeEventListener('message', openerHandler);
  };
  window.addEventListener('message', openerHandler);
  setTimeout(() => window.removeEventListener('message', openerHandler), 30000);
}
