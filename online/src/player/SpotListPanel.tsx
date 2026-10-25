import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from './usePlayerStore';
import { ICONS } from '../core/icons';
import { t } from '../i18n';
import { siteVisibleSpots } from './siteStops';
import type { Spot } from '../core/models/types';
import { PhotoAttribution } from '../core/components/PhotoAttribution';

export default function SpotListPanel() {
  const project = usePlayerStore((s) => s.project)!;
  const activeIndex = usePlayerStore((s) => s.activeSpotIndex);
  const currentYear = usePlayerStore((s) => s.currentYear);
  const setActiveSpot = usePlayerStore((s) => s.setActiveSpot);
  const setPlaying = usePlayerStore((s) => s.setPlaying);
  const listRef = useRef<HTMLDivElement>(null);
  // 021 site: a phase photo opened full size (thumbnail click)
  const [viewing, setViewing] = useState<Spot | null>(null);
  // 021 site layout: only the phases that exist in currentYear, full text.
  const site = project.layout === 'site';

  // Auto-scroll to active spot (by data-index: the site list is filtered)
  useEffect(() => {
    if (activeIndex === null || activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeIndex]);

  useEffect(() => {
    if (!viewing) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setViewing(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewing]);

  const items: { spot: Spot; index: number }[] = site
    ? siteVisibleSpots(project.spots, currentYear)
    : project.spots.map((spot, index) => ({ spot, index }));

  return (
    <div className={`spot-panel${site ? ' spot-panel--site' : ''}`}>
      <div className="spot-panel__header">
        <h2 className="spot-panel__title">{project.name}</h2>
        {site
          ? <div className="spot-panel__year">{currentYear}</div>
          : <span className="spot-panel__count">{project.spots.length} {t('player.spots')}</span>}
      </div>
      <div className="spot-panel__list" ref={listRef}>
        {site && items.length === 0 && (
          <p className="spot-panel__empty">{t('player.site.empty')}</p>
        )}
        {items.map(({ spot, index: i }) => {
          const icon = ICONS.find((ic) => ic.id === spot.iconId);
          return (
            <button
              key={spot.id}
              data-index={i}
              className={`spot-panel__item${activeIndex === i ? ' spot-panel__item--active' : ''}`}
              onClick={() => { setPlaying(false); setActiveSpot(i); }}
            >
              <span className="spot-panel__num">{spot.num}</span>
              <span className="spot-panel__icon">{icon?.emoji ?? '📍'}</span>
              <div className="spot-panel__text">
                <span className="spot-panel__name">{spot.title}</span>
                {spot.desc && (
                  <span className={`spot-panel__desc${site ? ' spot-panel__desc--full' : ''}`}>
                    {(() => {
                      if (site) return spot.desc;
                      const chars = Array.from(spot.desc);
                      return chars.length > 40 ? chars.slice(0, 40).join('') + '...' : spot.desc;
                    })()}
                  </span>
                )}
              </div>
              {site && spot.photo && (
                <img
                  className="spot-panel__thumb"
                  src={spot.photo}
                  alt={spot.title}
                  onClick={(e) => { e.stopPropagation(); setViewing(spot); }}
                />
              )}
            </button>
          );
        })}
      </div>
      {viewing && (
        <div className="photo-viewer" role="dialog" aria-label={viewing.title} onClick={() => setViewing(null)}>
          <figure className="photo-viewer__figure" onClick={(e) => e.stopPropagation()}>
            <img className="photo-viewer__img" src={viewing.photo ?? ''} alt={viewing.title} />
            <figcaption className="photo-viewer__caption">{viewing.title}</figcaption>
            <PhotoAttribution meta={viewing.photoMeta} />
          </figure>
          <button className="photo-viewer__close" onClick={() => setViewing(null)} aria-label="×">×</button>
        </div>
      )}
    </div>
  );
}
