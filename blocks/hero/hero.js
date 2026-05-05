/**
 * AdobeSphere hero block.
 *
 * Variants (set via block class — `hero (video)`, `hero (search)`, etc.):
 *   • default / no variant  → centred heading + paragraph + buttons (e.g. About hero, generic hero).
 *   • video   → background video + heading + paragraph + buttons + scroll-down chevron (Home).
 *   • search  → heading + paragraph + search input (Explore).
 *   • media   → full-width banner image + badge + heading + meta (Event detail).
 *   • gradient → red→dark gradient hero with avatar + stats (Creator profile).
 *   • compact → low-profile hero used for Blog detail title row.
 *
 * Authoring contract (default + most variants):
 *   row 1: a picture (optional — used as background or banner)
 *   row 2: heading + paragraph + buttons authored as default content inside the block
 * For the `search` variant, an extra row authored as `Search | <placeholder text>` becomes the search input.
 * For `gradient` variant, an extra row `Avatar | <picture>` and `Stats | <ul>` are recognised.
 */

function nextOf(elem) {
  return elem ? elem.nextElementSibling : null;
}

function takePictureRow(block) {
  // First child cell that contains nothing but a picture is treated as the bg/banner.
  const first = block.firstElementChild;
  if (!first) return null;
  const cell = first.firstElementChild;
  if (cell && cell.children.length === 1 && cell.querySelector('picture')) {
    const picture = cell.querySelector('picture');
    first.remove();
    return picture;
  }
  return null;
}

function takeKeyedRows(block) {
  // Rows authored as `Key | Value` come through as 2-cell rows. We treat the
  // first cell (lowercased) as a key and stash the second cell's content.
  const map = {};
  const rows = [...block.children];
  rows.forEach((row) => {
    if (row.children.length !== 2) return;
    const key = row.children[0].textContent.trim().toLowerCase();
    const val = row.children[1];
    if (!key || !val) return;
    if (['search', 'placeholder', 'avatar', 'stats', 'meta'].includes(key)) {
      map[key] = val;
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
    const url = q ? `/explore?q=${encodeURIComponent(q)}` : '/explore';
    window.location.href = url;
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

function buildVideoLayer(picture) {
  const layer = document.createElement('div');
  layer.className = 'hero-bg';

  if (picture) {
    // If the picture's <source> or <img> src ends in a video extension (mp4/webm), promote to <video>.
    const img = picture.querySelector('img');
    const src = img && img.getAttribute('src');
    if (src && /\.(mp4|webm)(\?|$)/i.test(src)) {
      const video = document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('aria-hidden', 'true');
      video.innerHTML = `<source src="${src}" type="video/${src.match(/\.(mp4|webm)/i)[1].toLowerCase()}">`;
      layer.append(video);
    } else {
      layer.append(picture);
    }
  }

  const grad = document.createElement('div');
  grad.className = 'hero-gradient';
  grad.setAttribute('aria-hidden', 'true');
  layer.append(grad);

  const overlay = document.createElement('div');
  overlay.className = 'hero-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  layer.append(overlay);

  return layer;
}

function buildBannerLayer(picture) {
  // Used by the `media` variant — full-width image banner without darkening.
  const layer = document.createElement('div');
  layer.className = 'hero-banner';
  if (picture) layer.append(picture);
  const overlay = document.createElement('div');
  overlay.className = 'hero-banner-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  layer.append(overlay);
  return layer;
}

export default function decorate(block) {
  const variants = [...block.classList].filter((c) => c !== 'hero' && c !== 'block');
  const isVideo = variants.includes('video');
  const isSearch = variants.includes('search');
  const isMedia = variants.includes('media');
  const isGradient = variants.includes('gradient');
  const isCompact = variants.includes('compact');

  const picture = takePictureRow(block);
  const keyed = takeKeyedRows(block);

  // Whatever's left is the textual content (heading + paragraphs + button-wrappers).
  const content = document.createElement('div');
  content.className = 'hero-content';
  while (block.firstElementChild) {
    const row = block.firstElementChild;
    while (row.firstElementChild) content.append(row.firstElementChild);
    row.remove();
  }

  // Avatar (gradient variant) — positioned above the heading.
  if (isGradient && keyed.avatar) {
    const avatar = document.createElement('div');
    avatar.className = 'hero-avatar';
    while (keyed.avatar.firstElementChild) avatar.append(keyed.avatar.firstElementChild);
    content.prepend(avatar);
  }

  // Meta (media variant) — date / location lines below the heading.
  if (isMedia && keyed.meta) {
    const meta = document.createElement('div');
    meta.className = 'hero-meta';
    while (keyed.meta.firstElementChild) meta.append(keyed.meta.firstElementChild);
    content.append(meta);
  }

  // Search bar.
  if (isSearch) {
    const placeholder = (keyed.placeholder || keyed.search)
      ? (keyed.placeholder || keyed.search).textContent.trim()
      : 'Search events, blogs, creators…';
    content.append(renderSearch(placeholder));
  }

  // Stats row (gradient variant).
  if (isGradient && keyed.stats) {
    const stats = document.createElement('div');
    stats.className = 'hero-stats';
    while (keyed.stats.firstElementChild) stats.append(keyed.stats.firstElementChild);
    content.append(stats);
  }

  // Background layer.
  block.textContent = '';
  if (isMedia) {
    block.append(buildBannerLayer(picture));
  } else if (isVideo || (picture && !isCompact && !isMedia)) {
    block.append(buildVideoLayer(picture));
  }

  block.append(content);

  if (isVideo) block.append(renderScrollChevron());

  // Variant flag → CSS hooks.
  if (isVideo) block.classList.add('hero-video');
  if (isSearch) block.classList.add('hero-search-variant');
  if (isMedia) block.classList.add('hero-media');
  if (isGradient) block.classList.add('hero-gradient-variant');
  if (isCompact) block.classList.add('hero-compact');
  if (variants.length === 0) block.classList.add('hero-default');
}
