import { useEffect, useRef } from 'react';
import { useProjectStore } from '../core/store/useProjectStore';

/**
 * Handles the automatic timer for slideshow playback.
 */
export default function PlaybackManager() {
  const playing = useProjectStore((s) => s.playing);
  const playMode = useProjectStore((s) => s.playMode);
  const playInterval = useProjectStore((s) => s.playInterval);
  const nextSpot = useProjectStore((s) => s.nextSpot);
  
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (playing && playMode === 'auto') {
      timerRef.current = window.setInterval(() => {
        nextSpot();
      }, playInterval);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [playing, playMode, playInterval, nextSpot]);

  return null;
}
