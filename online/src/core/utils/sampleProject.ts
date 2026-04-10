/**
 * Example routes available in public/examples/.
 * Each entry maps to a .trailpaint.json file.
 */
export const EXAMPLE_ROUTES = [
  { file: '陽明山七星山步道.trailpaint.json', name: '陽明山七星山步道', icon: '🌋' },
  { file: '合歡山主峰步道.trailpaint.json', name: '合歡山主峰步道', icon: '⛰️' },
  { file: '嘉明湖步道.trailpaint.json', name: '嘉明湖步道', icon: '💧' },
  { file: '抹茶山聖母山莊步道.trailpaint.json', name: '抹茶山聖母山莊步道', icon: '🍵' },
  { file: '九份金瓜石步道.trailpaint.json', name: '九份金瓜石步道', icon: '🏮' },
  { file: '阿朗壹古道.trailpaint.json', name: '阿朗壹古道', icon: '🌊' },
] as const;

/**
 * Fetch an example route JSON from public/examples/.
 * Returns the raw JSON string for importJSON(), or null on failure.
 */
export async function loadExampleRoute(filename: string): Promise<string | null> {
  try {
    const base = import.meta.env.BASE_URL ?? '/';
    const res = await fetch(`${base}examples/${encodeURIComponent(filename)}`);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * @deprecated Use EXAMPLE_ROUTES + loadExampleRoute instead.
 * Kept for OnboardingOverlay backward compat — loads the first example.
 */
export async function getSampleProjectJSON(): Promise<string | null> {
  return loadExampleRoute(EXAMPLE_ROUTES[0].file);
}
