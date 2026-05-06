/**
 * AdobeSphere hero block.
 *
 * Variants (set via block class — `hero (video)`, `hero (search)`, etc.):
 *   • default / no variant  → centred heading + paragraph + buttons.
 *   • video   → background video + heading + paragraph + buttons + scroll chevron.
 *   • search  → heading + paragraph + search input.
 *   • media   → full-width banner image + heading + meta. DYNAMIC if `Id Source` set.
 *   • gradient → red→dark gradient hero with avatar + stats.
 *   • compact → low-profile hero used for Blog detail title row. DYNAMIC if `Id Source` set.
 *
 * Forgiving authoring:
 *   • The first row may be a <picture>, an <a href="..."> link, OR plain text URL.
 *     If it points to .mp4/.webm, the block auto-promotes itself to `video` variant.
 *   • If no <h1>/<h2> is present, the first text-only paragraph is promoted to <h1>.
 *   • Authors can put both buttons in one paragraph; scripts.js handles that.
 *
 * Dynamic mode:
 *   When the author writes `Id Source | events|blogs|creators`, the block looks up
 *   the entity by the current URL's id (last URL segment or ?id=…) and hydrates
 *   the title, banner image, and meta line for media/compact variants.
 */

const VIDEO_RE = /\.(mp4|webm)(\?[^\s]*)?$/i;
const IMAGE_RE = /\.(jpe?g|png|webp|gif|svg)(\?[^\s]*)?$/i;
const URL_LIKE = /^(https?:\/\/|\/)\S+$/i;

const SOURCE_FILE = { events: 'campaigns', blogs: 'blogs', creators: 'creators' };

function getUrlId() {
  const fromQuery = new URLSearchParams(window.location.search).get('id');
  if (fromQuery) return fromQuery;
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments.length >= 2) return decodeURIComponent(segments[segments.length - 1]);
  return null;
}

async function fetchEntity(source) {
  const file = SOURCE_FILE[source];
  if (!file) return null;
  const id = getUrlId();
  if (!id) return null;
  const data = await window.AdobeSphere.Utils.fetchData(file);
  return Array.isArray(data) ? (data.find((it) => it.id === id) || null) : null;
}

function takeMediaRow(block) {
  const first = block.firstElementChild;
  if (!first) return null;
  const cell = first.firstElementChild;
  if (!cell) return null;

  const picture = cell.querySelector('picture');
  if (picture) {
    first.remove();
    return { kind: 'picture', node: picture };
  }
  const anchor = cell.querySelector('a[href]');
  if (anchor && cell.textContent.trim() === anchor.textContent.trim()) {
    const href = anchor.getAttribute('href') || '';
    if (VIDEO_RE.test(href)) { first.remove(); return { kind: 'video', url: href }; }
    if (IMAGE_RE.test(href)) { first.remove(); return { kind: 'image', url: href }; }
  }
  const text = cell.textContent.trim();
  if (text && URL_LIKE.test(text) && !cell.querySelector('a, img, picture')) {
    if (VIDEO_RE.test(text)) { first.remove(); return { kind: 'video', url: text }; }
    if (IMAGE_RE.test(text)) { first.remove(); return { kind: 'image', url: text }; }
  }
  return null;
}

function takeKeyedRows(block) {
  const map = {};
  const allowed = ['search', 'placeholder', 'avatar', 'stats', 'meta', 'id source'];
  [...block.children].forEach((row) => {
    if (row.children.length !== 2) return;
    const key = row.children[0].textContent.trim().toLowerCase();
    const val = row.children[1];
    if (allowed.includes(key)) {
      map[key.replace(/\s/g, '_')] = val;
      row.remove();
    }
  });
  return map;
}

function renderSearch(placeholder) {
  const wrap = document.createElement('div');
  wrap.className = 'hero-search';
  wrap.innerHTML = `
    <input type="search" class="form-input hero-search-input" placeholder="${placeholder || 'Search…'}" aria-label="Search">
    <button type="button" class="hero-search-btn" aria-label="Run search">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"></circle>
        <path d="M20 20L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
      </svg>
    </button>`;
  const input = wrap.querySelector('.hero-search-input');
  const submit = () => {
    const q = input.value.trim();
    window.location.href = q ? `/explore?q=${encodeURIComponent(q)}` : '/explore';
  };
  wrap.querySelector('.hero-search-btn').addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  return wrap;
}

function renderScrollChevron() {
  const a = document.createElement('a');
  a.className = 'hero-scroll';
  a.href = '#main-content';
  a.setAttribute('aria-label', 'Scroll to next section');
  a.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>
  </svg>`;
  return a;
}

function buildBgLayer(media) {
  const layer = document.createElement('div');
  layer.className = 'hero-bg';
  if (media) {
    if (media.kind === 'picture') {
      layer.append(media.node);
    } else if (media.kind === 'video') {
      const ext = (media.url.match(/\.(mp4|webm)/i) || ['', 'mp4'])[1].toLowerCase();
      const video = document.createElement('video');
      video.autoplay = true; video.muted = true; video.loop = true;
      video.playsInline = true; video.preload = 'auto';
      video.setAttribute('aria-hidden', 'true');
      video.innerHTML = `<source src="${media.url}" type="video/${ext}">`;
      layer.append(video);
      video.addEventListener('loadedmetadata', () => {
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      });
    } else if (media.kind === 'image') {
      const img = document.createElement('img');
      img.src = media.url; img.alt = ''; img.loading = 'eager';
      layer.append(img);
    }
  }
  const grad = document.createElement('div');
  grad.className = 'hero-gradient'; grad.setAttribute('aria-hidden', 'true');
  layer.append(grad);
  const overlay = document.createElement('div');
  overlay.className = 'hero-overlay'; overlay.setAttribute('aria-hidden', 'true');
  layer.append(overlay);
  return layer;
}

function buildBannerLayer(media) {
  const layer = document.createElement('div');
  layer.className = 'hero-banner';
  if (media) {
    if (media.kind === 'picture') layer.append(media.node);
    else if (media.kind === 'image') {
      const img = document.createElement('img');
      img.src = media.url; img.alt = '';
      layer.append(img);
    }
  }
  const overlay = document.createElement('div');
  overlay.className = 'hero-banner-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  layer.append(overlay);
  return layer;
}

function ensureHeading(content) {
  if (content.querySelector('h1, h2')) return;
  const candidates = content.querySelectorAll('p');
  for (const p of candidates) {
    if (p.querySelector('a, img, picture')) continue;
    const text = p.textContent.trim();
    if (!text) continue;
    const h1 = document.createElement('h1');
    h1.textContent = text;
    p.replaceWith(h1);
    return;
  }
}

/* ─── dynamic hydration helpers ─── */

function hydrateMediaFromEntity(entity, content, media) {
  const { Utils } = window.AdobeSphere;

  // Banner: use entity thumbnail, falling back to what the author supplied.
  let resolvedMedia = media;
  if (entity.thumbnail) {
    const url = Utils.normaliseAsset(entity.thumbnail, '');
    if (url) resolvedMedia = { kind: 'image', url };
  }

  // Heading: replace the authored placeholder with the entity title.
  if (entity.title) {
    const existing = content.querySelector('h1, h2');
    if (existing) {
      existing.textContent = entity.title;
    } else {
      const h1 = document.createElement('h1');
      h1.textContent = entity.title;
      content.prepend(h1);
    }
  }

  // Meta line: date · venue · location.
  if (!content.querySelector('.hero-meta')) {
    const parts = [];
    if (entity.date) parts.push(Utils.formatDate(entity.date) + (entity.time ? ` · ${entity.time}` : ''));
    if (entity.venue) parts.push(entity.venue);
    if (entity.location) {
      const loc = [entity.location.city, entity.location.state, entity.location.country].filter(Boolean).join(', ');
      if (loc) parts.push(loc);
    }
    if (parts.length) {
      const meta = document.createElement('div');
      meta.className = 'hero-meta';
      meta.innerHTML = parts.map((p) => `<p>${Utils.escapeHtml(p)}</p>`).join('');
      content.append(meta);
    }
  }

  return resolvedMedia;
}

function hydrateCompactFromEntity(entity, content) {
  const { Utils } = window.AdobeSphere;

  // Heading.
  if (!content.querySelector('h1, h2') && entity.title) {
    const h1 = document.createElement('h1');
    h1.textContent = entity.title;
    content.prepend(h1);
  }

  // Meta line above heading: category · date · author.
  if (!content.querySelector('.hero-compact-meta')) {
    const parts = [];
    if (entity.category) parts.push(`<span class="badge outline">${Utils.escapeHtml(entity.category)}</span>`);
    if (entity.publishedDate) parts.push(`<span>${Utils.escapeHtml(Utils.formatShortDate(entity.publishedDate))}</span>`);
    const authorName = entity.author && entity.author.name;
    const authorId = entity.author && entity.author.id;
    if (authorName) {
      const link = authorId
        ? `<a href="/creator-profile/${encodeURIComponent(authorId.replace(/^user:/, ''))}">${Utils.escapeHtml(authorName)}</a>`
        : Utils.escapeHtml(authorName);
      parts.push(`<span>By ${link}</span>`);
    }
    if (parts.length) {
      const meta = document.createElement('p');
      meta.className = 'hero-compact-meta';
      meta.innerHTML = parts.join(' <span class="hero-compact-meta-sep">·</span> ');
      const heading = content.querySelector('h1, h2');
      if (heading) heading.before(meta); else content.prepend(meta);
    }
  }
}

export default async function decorate(block) {
  const variants = [...block.classList].filter((c) => c !== 'hero' && c !== 'block');
  const isSearch = variants.includes('search');
  const isMedia = variants.includes('media');
  const isGradient = variants.includes('gradient');
  const isCompact = variants.includes('compact');

  let media = takeMediaRow(block);
  const keyed = takeKeyedRows(block);
  const isVideo = variants.includes('video') || (media && media.kind === 'video');

  // Pull authored content into a stack we can manipulate.
  const content = document.createElement('div');
  content.className = 'hero-content';
  while (block.firstElementChild) {
    const row = block.firstElementChild;
    while (row.firstElementChild) content.append(row.firstElementChild);
    row.remove();
  }

  ensureHeading(content);

  // Dynamic hydration when `Id Source | …` is present, or auto-detected from
  // the URL path for media / compact variants on template-based detail pages.
  const autoSource = (() => {
    if (keyed.id_source) return keyed.id_source.textContent.trim().toLowerCase();
    if (!isMedia && !isCompact) return null;
    const p = window.location.pathname;
    if (/^\/events\//.test(p)) return 'events';
    if (/^\/blog\//.test(p)) return 'blogs';
    if (/^\/creator-profile\//.test(p)) return 'creators';
    return null;
  })();

  if (autoSource) {
    try {
      const entity = await fetchEntity(autoSource);
      if (entity) {
        if (isMedia) media = hydrateMediaFromEntity(entity, content, media);
        else if (isCompact) hydrateCompactFromEntity(entity, content);
        // Update the document title with the entity's real name.
        if (entity.title || entity.name) {
          document.title = `${entity.title || entity.name} — AdobeSphere`;
        }
      }
    } catch { /* fall back to authored content */ }
  }

  // Static keyed rows (gradient avatar/stats, media meta, search placeholder).
  if (isGradient && keyed.avatar) {
    const avatar = document.createElement('div');
    avatar.className = 'hero-avatar';
    while (keyed.avatar.firstElementChild) avatar.append(keyed.avatar.firstElementChild);
    content.prepend(avatar);
  }
  if (isMedia && keyed.meta && !content.querySelector('.hero-meta')) {
    const meta = document.createElement('div');
    meta.className = 'hero-meta';
    while (keyed.meta.firstElementChild) meta.append(keyed.meta.firstElementChild);
    content.append(meta);
  }
  if (isSearch) {
    const placeholder = (keyed.placeholder || keyed.search)
      ? (keyed.placeholder || keyed.search).textContent.trim()
      : 'Search events, blogs, creators…';
    content.append(renderSearch(placeholder));
  }
  if (isGradient && keyed.stats) {
    const stats = document.createElement('div');
    stats.className = 'hero-stats';
    while (keyed.stats.firstElementChild) stats.append(keyed.stats.firstElementChild);
    content.append(stats);
  }

  // Render.
  block.textContent = '';
  if (isMedia) block.append(buildBannerLayer(media));
  else if (isVideo || (media && !isCompact && !isMedia)) block.append(buildBgLayer(media));
  block.append(content);
  if (isVideo) block.append(renderScrollChevron());

  if (isVideo) block.classList.add('hero-video');
  if (isSearch) block.classList.add('hero-search-variant');
  if (isMedia) block.classList.add('hero-media');
  if (isGradient) block.classList.add('hero-gradient-variant');
  if (isCompact) block.classList.add('hero-compact');
  if (variants.length === 0 && !isVideo) block.classList.add('hero-default');
}