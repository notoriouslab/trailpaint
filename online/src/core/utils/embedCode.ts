import type { Project } from '../models/types';

/**
 * Build the HTML snippet for embedding a full project (including photos) via <script>.
 * Used by both Player's "copy embed" button and ExportWizard.
 *
 * Safety: JSON is escaped to prevent </script> / HTML comment breakouts + U+2028/2029
 * line separators that would corrupt the inline script. Without this, a spot title
 * containing "</script><img onerror=...>" becomes stored XSS on the victim's site.
 */
export function buildProjectEmbedHtml(project: Project, origin: string): string {
  const safeJson = JSON.stringify(project)
    .replace(/</g, '\\u003c')
    .replace(/-->/g, '--\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return `<div id="tp-embed"></div>\n<script>\n(function(){\n  var d=${safeJson};\n  var f=document.createElement('iframe');\n  f.src='${origin}/app/player/?embed=1';\n  f.style.cssText='width:100%;height:500px;border:none;border-radius:8px';\n  f.allowFullscreen=true;\n  document.getElementById('tp-embed').appendChild(f);\n  window.addEventListener('message',function h(e){if(e.data&&e.data.type==='trailpaint-ready'){f.contentWindow.postMessage({type:'trailpaint-project',data:d},'${origin}');window.removeEventListener('message',h);}});\n})();\n<\/script>`;
}

/**
 * Media URL whitelist shared by migrateProject (JSON import) and PlaybackControl
 * (?music= URL param). Same policy everywhere — prevents tracking pixel / mixed content.
 */
export function isAllowedMediaUrl(url: string): boolean {
  if (typeof url !== 'string' || url.length === 0 || url.length > 2000) return false;
  return (
    url.startsWith('https://') ||
    (url.startsWith('/') && !url.startsWith('//')) ||
    url.startsWith('./') ||
    url.startsWith('../')
  );
}
