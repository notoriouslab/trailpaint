/**
 * TrailPaint Stories — Shared JS
 * Handles catalog rendering (Level 0) and story page rendering (Level 1).
 */

/* ── Security helpers ── */

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  // Attribute values: escape same chars + block javascript: scheme on href/src callers
  return escapeHtml(str);
}

/* ── Level 0: Catalog page ── */

async function renderCatalog(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  try {
    var res = await fetch('catalog.json');
    if (!res.ok) throw new Error('Failed to load catalog');
    var catalog = await res.json();

    var stories = catalog.stories || [];
    var collections = Array.isArray(catalog.collections) ? catalog.collections.slice() : [];
    collections.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

    // Group stories by collection id (keeps only non-empty groups)
    var grouped = collections
      .map(function (c) {
        return { id: c.id, title: c.title, href: c.href, description: c.description, items: stories.filter(function (s) { return s.collection === c.id; }) };
      })
      .filter(function (g) { return g.items.length > 0; });

    // Uncategorized (stories without a collection, or collection not defined in collections[])
    var definedIds = collections.map(function (c) { return c.id; });
    var uncategorized = stories.filter(function (s) {
      return !s.collection || definedIds.indexOf(s.collection) === -1;
    });
    if (uncategorized.length > 0) {
      grouped.push({ id: '_uncategorized', title: '其他', items: uncategorized });
    }

    // Fallback: ≤ 1 effective group → flat layout (matches 008 behaviour)
    if (grouped.length <= 1) {
      container.className = 'catalog-grid';
      container.innerHTML = renderCards(stories);
      return;
    }

    // Grouped layout: swap container to block (stack sections vertically),
    // nested grids hold cards inside each group
    container.className = 'catalog-groups';
    container.innerHTML = grouped.map(function (g) {
      return '<section class="catalog-group">' +
        '<h2 class="catalog-group__title">' + escapeHtml(g.title) + '</h2>' +
        '<div class="catalog-grid catalog-grid--nested">' + (g.href ? renderEntryCard(g) : renderCards(g.items)) + '</div>' +
      '</section>';
    }).join('');
  } catch (e) {
    container.innerHTML = '<p class="stories-loading">無法載入故事列表</p>';
  }
}

function renderCards(items) {
  return items.map(function (s) {
    return '<a class="catalog-card" href="' + escapeAttr(s.path) + '">' +
      '<img class="catalog-card__img" src="' + escapeAttr(s.thumbnail) + '" alt="' + escapeAttr(s.title) + '" />' +
      '<div class="catalog-card__body">' +
        '<h2 class="catalog-card__title">' + escapeHtml(s.title) + '</h2>' +
        '<p class="catalog-card__subtitle">' + escapeHtml(s.subtitle) + '</p>' +
        '<p class="catalog-card__desc">' + escapeHtml(s.description) + '</p>' +
        '<span class="catalog-card__count">' + escapeHtml(s.count) + ' 條路線</span>' +
      '</div>' +
    '</a>';
  }).join('');
}

// A collection with its own curated section (e.g. 台灣百年 /taiwan/) shows one entry card instead of its stories
function renderEntryCard(g) {
  return '<a class="catalog-card catalog-card--entry" href="' + escapeAttr(g.href) + '">' +
    '<img class="catalog-card__img" src="' + escapeAttr(g.items[0].thumbnail) + '" alt="' + escapeAttr(g.title) + '" />' +
    '<div class="catalog-card__body">' +
      '<h2 class="catalog-card__title">' + escapeHtml(g.title) + ' 專區 →</h2>' +
      '<p class="catalog-card__desc">' + escapeHtml(g.description || '') + '</p>' +
      '<span class="catalog-card__count">' + g.items.length + ' 個故事</span>' +
    '</div>' +
  '</a>';
}

/* ── Level 1: Story page ── */

/**
 * Visible "made with TrailPaint" hand-off in the compact story header.
 * story.json footer.url is the editor link; only same-site paths or https URLs are used.
 */
function renderMadeWith(footer) {
  var header = document.querySelector('.stories-header--compact');
  if (!header || !footer || typeof footer.url !== 'string') return;
  if (!/^(https:\/\/|\/)/.test(footer.url)) return;
  var a = document.createElement('a');
  a.className = 'stories-header__cta';
  a.href = footer.url;
  a.innerHTML = '<span class="stories-header__cta-made">用 TrailPaint 製作</span><span class="stories-header__cta-go">自己做一張 →</span>';
  header.appendChild(a);
}

async function renderStoryPage(opts) {
  var tabsId = opts.tabsId;
  var iframeId = opts.iframeId;
  var descId = opts.descId;
  var playerBase = opts.playerBase || '/app/player/';
  var storyBase = opts.storyBase || '';

  var tabsEl = document.getElementById(tabsId);
  var iframe = document.getElementById(iframeId);
  var descEl = document.getElementById(descId);
  if (!iframe) return;

  try {
    var res = await fetch('story.json');
    if (!res.ok) throw new Error('Failed to load story');
    var story = await res.json();
    var stories = story.stories || [];
    if (stories.length === 0) return;

    renderMadeWith(story.footer);

    var useAutoplay = opts.autoplay ? '&autoplay=1' : '';
    var defaultMusic = story.music && story.music.src ? story.music.src : '';

    function getMusicParam(s) {
      // Story-level music overrides collection-level default
      var musicSrc = s.music || defaultMusic;
      if (!musicSrc) return '';
      // Absolute URLs pass through, relative URLs resolve from storyBase
      var url = musicSrc.startsWith('http') ? musicSrc : storyBase + musicSrc;
      return '&music=' + encodeURIComponent(url);
    }

    function activate(index) {
      var s = stories[index];
      var src = playerBase + '?embed=1&src=' + storyBase + s.data + useAutoplay + getMusicParam(s);
      iframe.src = src;

      // Update description (collapse when switching)
      if (descEl) {
        descEl.textContent = s.description;
        descEl.classList.remove('story-desc--expanded');
      }

      // Update tabs active state
      if (tabsEl) {
        var btns = tabsEl.querySelectorAll('.story-tab');
        btns.forEach(function (el, i) {
          el.classList.toggle('story-tab--active', i === index);
        });
      }
    }

    // Render tabs
    if (tabsEl) {
      tabsEl.innerHTML = stories.map(function (s, i) {
        return '<button class="story-tab' + (i === 0 ? ' story-tab--active' : '') + '" data-index="' + i + '">' +
          '<img class="story-tab__thumb" src="' + escapeAttr(s.thumbnail) + '" alt="" />' +
          '<span>' + escapeHtml(s.title) + '</span>' +
        '</button>';
      }).join('');

      tabsEl.addEventListener('click', function (e) {
        var btn = e.target.closest('.story-tab');
        if (btn) activate(Number(btn.dataset.index));
      });
    }

    // Description click to expand/collapse
    if (descEl) {
      descEl.addEventListener('click', function () {
        descEl.classList.toggle('story-desc--expanded');
      });
    }

    // Load first story
    activate(0);

    // Music is now handled by Player via ?music= parameter

  } catch (e) {
    if (descEl) descEl.textContent = '無法載入故事資料';
  }
}
