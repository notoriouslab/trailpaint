import { create } from 'zustand';
import type { Project } from '../core/models/types';

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

  // Actions
  loadProject: (project: Project) => void;
  setError: (error: string) => void;
  setActiveSpot: (index: number | null) => void;
  setPlaying: (playing: boolean) => void;
  setDwellTime: (ms: number) => void;
  setLoopCount: (count: number) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>()((set) => ({
  project: null,
  error: null,
  activeSpotIndex: null,
  playing: false,
  dwellTime: 4000,
  loopCount: 1,

  loadProject: (project) => set({ project, error: null, activeSpotIndex: null, playing: false }),
  setError: (error) => set({ error, project: null }),
  setActiveSpot: (index) => set({ activeSpotIndex: index }),
  setPlaying: (playing) => set({ playing }),
  setDwellTime: (ms) => set({ dwellTime: ms }),
  setLoopCount: (count) => set({ loopCount: count }),
  reset: () => set({ project: null, error: null, activeSpotIndex: null, playing: false, dwellTime: 4000, loopCount: 1 }),
}));
