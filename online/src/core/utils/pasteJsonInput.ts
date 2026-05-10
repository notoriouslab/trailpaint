/**
 * Strip markdown code fences from LLM-pasted JSON input.
 *
 * ChatGPT/Claude typically wrap JSON output in triple backticks with an
 * optional language hint (```json ... ```). We want the raw JSON so
 * JSON.parse succeeds.
 */
export function stripJsonCodeFence(text: string): string {
  let t = text.trim();
  t = t.replace(/^```(?:json|javascript|js)?\s*\n?/i, '');
  t = t.replace(/\n?\s*```\s*$/, '');
  return t.trim();
}
