/**
 * Example routes bundled via Vite dynamic import.
 * Each loader returns the JSON as a JS module (lazy-loaded chunk).
 */

const LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  '陽明山七星山步道': () => import('../../data/examples/陽明山七星山步道.trailpaint.json'),
  '合歡山主峰步道': () => import('../../data/examples/合歡山主峰步道.trailpaint.json'),
  '嘉明湖步道': () => import('../../data/examples/嘉明湖步道.trailpaint.json'),
  '抹茶山聖母山莊步道': () => import('../../data/examples/抹茶山聖母山莊步道.trailpaint.json'),
  '九份金瓜石步道': () => import('../../data/examples/九份金瓜石步道.trailpaint.json'),
  '阿朗壹古道': () => import('../../data/examples/阿朗壹古道.trailpaint.json'),
  '白石湖步道半日遊': () => import('../../data/examples/白石湖步道半日遊.trailpaint.json'),
  '倫敦博物館之旅': () => import('../../data/examples/倫敦博物館之旅.trailpaint.json'),
};

export const EXAMPLE_ROUTES = [
  { name: '陽明山七星山步道', icon: '🌋' },
  { name: '合歡山主峰步道', icon: '⛰️' },
  { name: '嘉明湖步道', icon: '💧' },
  { name: '抹茶山聖母山莊步道', icon: '🍵' },
  { name: '九份金瓜石步道', icon: '🏮' },
  { name: '阿朗壹古道', icon: '🌊' },
  { name: '白石湖步道半日遊', icon: '🌸' },
  { name: '倫敦博物館之旅', icon: '🏛️' },
] as const;

/**
 * Load an example route via dynamic import.
 * Returns the raw JSON string for importJSON(), or null on failure.
 */
export async function loadExampleRoute(name: string): Promise<string | null> {
  try {
    const loader = LOADERS[name];
    if (!loader) return null;
    const mod = await loader();
    return JSON.stringify(mod.default);
  } catch {
    return null;
  }
}

/**
 * @deprecated Use EXAMPLE_ROUTES + loadExampleRoute instead.
 * Kept for OnboardingOverlay backward compat — loads the first example.
 */
export async function getSampleProjectJSON(): Promise<string | null> {
  return loadExampleRoute(EXAMPLE_ROUTES[0].name);
}
