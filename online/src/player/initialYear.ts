import type { Project } from '../core/models/types';
import { HISTORY_SCALE, MODERN_TICK } from '../map/eraScales';

/**
 * Year the Player opens on.
 *   - site layout (021): the earliest phase, so the story starts at its beginning
 *   - otherwise: the year of the project's overlay tick, falling back to modern
 */
export function initialYear(project: Project): number {
  if (project.layout === 'site') {
    const starts = project.spots.flatMap((s) => (s.era ? [s.era.start] : []));
    return starts.length ? Math.min(...starts) : MODERN_TICK.year;
  }
  const ovId = project.overlay?.id;
  if (ovId) {
    const tick = HISTORY_SCALE.find((t) => t.overlayId === ovId);
    if (tick) return tick.year;
  }
  return MODERN_TICK.year;
}
