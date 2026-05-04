#!/usr/bin/env node
/**
 * Generate index.html for story groups by reading each story.json and filling
 * a template that mirrors passion-week / taiwan-missionaries layout.
 *
 *   Run: node online/scripts/gen-story-index-html.mjs
 */
import { readFile, writeFile, copyFile, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const STORIES = join(ROOT, 'stories');
const GROUPS = ['paul', 'xuanzang', 'zheng-he', 'jesus-galilee', 'zhang-qian', 'wen-tianxiang', 'marco-polo', 'xu-xiake', 'revelation-churches', 'exodus-conquest', 'david-king', 'babylon-exile-return', 'jesus-birth', 'early-church', 'matteo-ricci', 'hudson-taylor', 'luther', 'william-carey', 'three-kingdoms', 'columbus', 'magellan', 'cook'];
const TODAY = new Date().toISOString().slice(0, 10);

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;');
}

/** Safely embed JSON inside <script type="application/ld+json">.
 * Escapes '<' so an attacker-supplied `</script>` can't break out of the tag. */
function jsonLdSafe(obj) {
  return JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');
}

function buildHtml(groupId, story) {
  const url = `https://trailpaint.org/stories/${groupId}/`;
  const ogImg = `${url}og.jpg`;
  const hasParts = story.stories.map((s) => ({
    '@type': 'CreativeWork',
    name: `${s.title} — ${s.subtitle || ''}`.trim(),
    description: s.description || s.subtitle,
  }));
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${story.title} — ${story.subtitle}`,
    description: story.description,
    image: ogImg,
    datePublished: TODAY,
    dateModified: TODAY,
    author: { '@type': 'Organization', name: 'NotoriousLab', url: 'https://github.com/notoriouslab' },
    publisher: {
      '@type': 'Organization',
      name: 'TrailPaint 路小繪',
      url: 'https://trailpaint.org/',
      logo: { '@type': 'ImageObject', url: 'https://trailpaint.org/app/favicon.svg' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: 'zh-TW',
    hasPart: hasParts,
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'TrailPaint 路小繪', item: 'https://trailpaint.org/' },
      { '@type': 'ListItem', position: 2, name: 'Stories', item: 'https://trailpaint.org/stories/' },
      { '@type': 'ListItem', position: 3, name: story.title, item: url },
    ],
  };
  const seoSubs = story.stories
    .map((s) => `    <h3>${esc(s.title)}</h3>\n    <p>${esc(s.subtitle || s.description)}${s.description && s.description !== s.subtitle ? ` ${esc(s.description)}` : ''}</p>`)
    .join('\n\n');

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(story.title)} — TrailPaint Stories</title>
  <meta name="description" content="${esc(story.description)}" />
  <meta property="og:title" content="${esc(story.title)} — TrailPaint Stories" />
  <meta property="og:description" content="${esc(story.description)}" />
  <meta property="og:image" content="${ogImg}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="zh_TW" />
  <meta property="og:site_name" content="TrailPaint 路小繪" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(story.title)} — TrailPaint Stories" />
  <meta name="twitter:description" content="${esc(story.description)}" />
  <meta name="twitter:image" content="${ogImg}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="author" content="NotoriousLab" />
  <link rel="icon" type="image/svg+xml" href="/app/favicon.svg" />
  <link rel="canonical" href="${url}" />
  <link rel="stylesheet" href="../stories.css" />

  <script type="application/ld+json">
${jsonLdSafe(articleLd)}
  </script>
  <script type="application/ld+json">
${jsonLdSafe(breadcrumb)}
  </script>
</head>
<body>
  <div class="stories-page stories-page--fixed">
    <header class="stories-header stories-header--compact">
      <a class="stories-header__back" href="../">← 返回</a>
      <h1 class="stories-header__title">${esc(story.title)}</h1>
      <p class="stories-header__subtitle">${esc(story.subtitle)}</p>
    </header>

    <div id="tabs" class="story-tabs"></div>
    <div id="desc" class="story-desc"></div>
    <div class="story-content">
      <iframe id="player" class="story-iframe" title="TrailPaint Story Player"></iframe>
    </div>
  </div>

  <section class="story-seo-content" hidden>
    <h2>${esc(story.title)} 互動地圖介紹</h2>
    <p>${esc(story.description)}</p>

${seoSubs}

    <p>在 <a href="https://trailpaint.org/app/">TrailPaint 路小繪</a> 中建立你自己的故事地圖。</p>
  </section>

  <script src="../stories.js"></script>
  <script>
    renderStoryPage({
      tabsId: 'tabs',
      iframeId: 'player',
      descId: 'desc',
      playerBase: '/app/player/',
      storyBase: '/stories/${groupId}/',
      autoplay: true
    });
  </script>
</body>
</html>
`;
}

for (const gid of GROUPS) {
  const dir = join(STORIES, gid);
  const story = JSON.parse(await readFile(join(dir, 'story.json'), 'utf8'));
  const html = buildHtml(gid, story);
  await writeFile(join(dir, 'index.html'), html);
  // og.jpg: copy cover.jpg if no og.jpg yet
  const og = join(dir, 'og.jpg');
  const cover = join(dir, 'cover.jpg');
  if (!existsSync(og) && existsSync(cover)) await copyFile(cover, og);
  console.log(`✅ ${gid}/index.html (+ og.jpg)`);
}
