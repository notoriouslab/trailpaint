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
  const spotsCount = useProjectStore((s) => s.project.spots.length);
  const togglePlay = useProjectStore((s) => s.togglePlay);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // If spots empty but somehow playing, stop immediately
    if (playing && spotsCount === 0) {
      togglePlay();
      return;
    }

    const scheduleNext = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      
      timerRef.current = setTimeout(() => {
        const state = useProjectStore.getState();
        if (state.playing && state.playMode === 'auto') {
          state.nextSpot();
          scheduleNext();
        }
      }, playInterval);
    };

    if (playing && playMode === 'auto') {
      scheduleNext();
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playing, playMode, playInterval, spotsCount, togglePlay]);

  return null;
}
