import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { usePlayerStore } from './usePlayerStore';
import { t } from '../i18n';

const FLY_DURATION = 800; // ms

const DWELL_OPTIONS = [
  { label: '2s', value: 2000 },
  { label: '4s', value: 4000 },
  { label: '6s', value: 6000 },
  { label: '8s', value: 8000 },
];

const LOOP_OPTIONS = [
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
  { label: '3×', value: 3 },
  { label: '∞', value: 0 },
];

export default function PlaybackControl() {
  const project = usePlayerStore((s) => s.project)!;
  const playing = usePlayerStore((s) => s.playing);
  const activeIndex = usePlayerStore((s) => s.activeSpotIndex);
  const dwellTime = usePlayerStore((s) => s.dwellTime);
  const loopCount = usePlayerStore((s) => s.loopCount);
  const setPlaying = usePlayerStore((s) => s.setPlaying);
  const setActiveSpot = usePlayerStore((s) => s.setActiveSpot);
  const setDwellTime = usePlayerStore((s) => s.setDwellTime);
  const setLoopCount = usePlayerStore((s) => s.setLoopCount);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentLoopRef = useRef(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const canFullscreen = useMemo(() => !!document.documentElement.requestFullscreen, []);
  const isEmbed = useMemo(() => new URLSearchParams(window.location.search).get('embed') === '1', []);

  const spots = project.spots;
  const total = spots.length;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Playback loop
  useEffect(() => {
    if (!playing || total === 0) return;

    const currentIndex = activeIndex ?? -1;
    const nextIndex = currentIndex + 1;

    if (nextIndex >= total) {
      // End of sequence — check loop
      timerRef.current = setTimeout(() => {
        const nextLoop = currentLoopRef.current + 1;
        if (loopCount !== 0 && nextLoop >= loopCount) {
          // All loops done
          setPlaying(false);
          setActiveSpot(null);
        } else {
          // Start next loop
          currentLoopRef.current = nextLoop;
          setActiveSpot(-1); // triggers restart from 0
        }
      }, dwellTime);
      return () => clearTimer();
    }

    // Move to next spot after dwell
    const delay = currentIndex === -1 ? 0 : FLY_DURATION + dwellTime;
    timerRef.current = setTimeout(() => {
      setActiveSpot(nextIndex);
    }, delay);

    return () => clearTimer();
  }, [playing, activeIndex, total, dwellTime, loopCount, setPlaying, setActiveSpot, clearTimer]);

  // Stop timer when paused
  useEffect(() => {
    if (!playing) clearTimer();
  }, [playing, clearTimer]);

  const handlePlayPause = () => {
    if (playing) {
      setPlaying(false);
    } else {
      if (total === 0) return;
      // Starting from beginning — reset loop counter
      if (activeIndex === null || activeIndex >= total - 1) {
        currentLoopRef.current = 0;
        setActiveSpot(-1);
      }
      setPlaying(true);
    }
  };

  const handleDotClick = (index: number) => {
    setPlaying(false);
    setActiveSpot(index);
    currentLoopRef.current = 0;
  };

  // Listen for fullscreen changes (e.g. user presses Escape)
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  if (total === 0) return null;

  return (
    <>
      {showSettings && (
        <div className="playback__settings">
          <div className="playback__setting-group">
            <span className="playback__setting-label">{t('player.playback.interval')}</span>
            {DWELL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`playback__setting-btn${dwellTime === opt.value ? ' playback__setting-btn--active' : ''}`}
                onClick={() => setDwellTime(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="playback__setting-group">
            <span className="playback__setting-label">{t('player.playback.loop')}</span>
            {LOOP_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`playback__setting-btn${loopCount === opt.value ? ' playback__setting-btn--active' : ''}`}
                onClick={() => setLoopCount(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="playback">
        {canFullscreen && (
          <button
            className="playback__btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? t('player.fullscreen.exit') : t('player.fullscreen.enter')}
          >
            {isFullscreen ? '⊡' : '⛶'}
          </button>
        )}
        <button
          className="playback__btn"
          onClick={handlePlayPause}
          title={playing ? t('player.playback.pause') : t('player.playback.play')}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <div className="playback__dots">
          {spots.map((_, i) => (
            <button
              key={i}
              className={`playback__dot${activeIndex === i ? ' playback__dot--active' : ''} ${i < (activeIndex ?? -1) ? 'playback__dot--visited' : ''}`}
              onClick={() => handleDotClick(i)}
              title={spots[i].title}
            />
          ))}
        </div>
        <span className="playback__counter">
          {activeIndex !== null && activeIndex >= 0 ? activeIndex + 1 : 0}/{total}
        </span>
        {!isEmbed && (
          <button
            className={`playback__gear${embedCopied ? ' playback__gear--active' : ''}`}
            onClick={() => {
              const src = window.location.pathname + '?embed=1&src=' + (new URLSearchParams(window.location.search).get('src') || '');
              const url = window.location.origin + src;
              const html = `<iframe src="${url}" width="100%" height="500" style="border:none;border-radius:8px" allowfullscreen></iframe>`;
              navigator.clipboard.writeText(html).then(() => {
                setEmbedCopied(true);
                setTimeout(() => setEmbedCopied(false), 2000);
              });
            }}
            title={t('player.embed.copy')}
          >
            {embedCopied ? '✓' : '⟨/⟩'}
          </button>
        )}
        <button
          className={`playback__gear${showSettings ? ' playback__gear--active' : ''}`}
          onClick={() => setShowSettings(!showSettings)}
          title={t('player.playback.settings')}
        >
          ⚙
        </button>
      </div>
    </>
  );
}
