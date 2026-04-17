/**
 * TrailPaint Stories — Shared JS
 * Handles catalog rendering (Level 0) and story page rendering (Level 1).
 */

/* ── Level 0: Catalog page ── */

async function renderCatalog(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  try {
    var res = await fetch('catalog.json');
    if (!res.ok) throw new Error('Failed to load catalog');
    var catalog = await res.json();

    container.innerHTML = catalog.stories.map(function (s) {
      return '<a class="catalog-card" href="' + s.path + '">' +
        '<img class="catalog-card__img" src="' + s.thumbnail + '" alt="' + s.title + '" />' +
        '<div class="catalog-card__body">' +
          '<h2 class="catalog-card__title">' + s.title + '</h2>' +
          '<p class="catalog-card__subtitle">' + s.subtitle + '</p>' +
          '<p class="catalog-card__desc">' + s.description + '</p>' +
          '<span class="catalog-card__count">' + s.count + ' 條路線</span>' +
        '</div>' +
      '</a>';
    }).join('');
  } catch (e) {
    container.innerHTML = '<p class="stories-loading">無法載入故事列表</p>';
  }
}

/* ── Level 1: Story page ── */

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

    var useAutoplay = opts.autoplay ? '&autoplay=1' : '';
    var musicParam = story.music && story.music.src
      ? '&music=' + encodeURIComponent(storyBase + story.music.src)
      : '';

    function activate(index) {
      var s = stories[index];
      var src = playerBase + '?embed=1&src=' + storyBase + s.data + useAutoplay + musicParam;
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
          '<img class="story-tab__thumb" src="' + s.thumbnail + '" alt="" />' +
          '<span>' + s.title + '</span>' +
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
