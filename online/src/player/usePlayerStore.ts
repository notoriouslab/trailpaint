import { create } from 'zustand';
import type { Project } from '../core/models/types';
import { MODERN_TICK } from '../map/eraScales';
import { initialYear } from './initialYear';

interface PlayerState {
  /** Loaded project data (null = nothing loaded yet) */
  project: Project | null;
  /** Error message from loading */
  error: string | null;
  /** Currently highlighted spot index (0-based) */
  activeSpotIndex: number | null;
  /** Playback state */
  playing: boolean;
  /** Dwell time per spot in ms */
  dwellTime: number;
  /** Loop count: 0 = infinite, 1+ = n times */
  loopCount: number;
  /** Bumped on every loadProject — keys the map so its local state starts fresh */
  loadSeq: number;
  /** Year shown on the TimeSlider; drives era visibility (shared by map, panel, playback) */
  currentYear: number;

  // Actions
  loadProject: (project: Project) => void;
  setError: (error: string) => void;
  setActiveSpot: (index: number | null) => void;
  setPlaying: (playing: boolean) => void;
  setDwellTime: (ms: number) => void;
  setLoopCount: (count: number) => void;
  setCurrentYear: (year: number) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>()((set) => ({
  project: null,
  error: null,
  activeSpotIndex: null,
  playing: false,
  dwellTime: 4000,
  loopCount: 1,
  currentYear: MODERN_TICK.year,
  loadSeq: 0,

  loadProject: (project) => set((s) => ({
    project, error: null, activeSpotIndex: null, playing: false,
    currentYear: initialYear(project), loadSeq: s.loadSeq + 1,
  })),
  setError: (error) => set({ error, project: null }),
  setActiveSpot: (index) => set({ activeSpotIndex: index }),
  setPlaying: (playing) => set({ playing }),
  setDwellTime: (ms) => set({ dwellTime: ms }),
  setLoopCount: (count) => set({ loopCount: count }),
  setCurrentYear: (year) => set({ currentYear: year }),
  reset: () => set({ project: null, error: null, activeSpotIndex: null, playing: false, dwellTime: 4000, loopCount: 1, currentYear: MODERN_TICK.year }),
}));
