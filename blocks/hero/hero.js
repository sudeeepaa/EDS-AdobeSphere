/**
 * AdobeSphere hero block.
 *
 * Variants (set via block class — `hero (video)`, `hero (search)`, etc.):
 *   • default / no variant  → centred heading + paragraph + buttons.
 *   • video   → background video + heading + paragraph + buttons + scroll chevron.
 *   • search  → heading + paragraph + search input.
 *   • media   → full-width banner image + badge + heading + meta.
 *   • gradient → red→dark gradient hero with avatar + stats.
 *   • compact → low-profile hero used for Blog detail title row.
 *
 * Forgiving authoring:
 *   • The first row may be a <picture>, an <a href="..."> link, OR plain text
 *     containing a URL. If it points to .mp4/.webm, the block auto-promotes
 *     itself to the `video` variant (no need to set it explicitly).
 *   • If no <h1>/<h2> is present in the body, the first text-only paragraph
 *     is promoted to <h1>. Authors can write plain text and still get a hero.
 *   • Authors can put both buttons in one paragraph (`**Explore** *Join*`);
 *     decorateButtons in scripts.js handles that.
 */

const VIDEO_RE = /\.(mp4|webm)(\?[^\s]*)?$/i;
const IMAGE_RE = /\.(jpe?g|png|webp|gif|svg)(\?[^\s]*)?$/i;
const URL_LIKE = /^(https?:\/\/|\/)\S+$/i;

/**
 * Inspect the first row and lift it into a media descriptor:
 *   { kind: 'picture', node }  |  { kind: 'video', url }  |  { kind: 'image', url }
 * Returns null if the first row isn't recognisably media.
 */
function takeMediaRow(block) {
  const first = block.firstElementChild;
  if (!first) return null;
  const cell = first.firstElementChild;
  if (!cell) return null;

  // Case 1 — cell contains a <picture>.
  const picture = cell.querySelector('picture');
  if (picture) {
    first.remove();
    return { kind: 'picture', node: picture };
  }

  // Case 2 — cell contains a single <a href="..."> with no extra text.
  const anchor = cell.querySelector('a[href]');
  if (anchor && cell.textContent.trim() === anchor.textContent.trim()) {
    const href = anchor.getAttribute('href') || '';
    if (VIDEO_RE.test(href)) { first.remove(); return { kind: 'video', url: href }; }
    if (IMAGE_RE.test(href)) { first.remove(); return { kind: 'image', url: href }; }
  }

  // Case 3 — cell content is just a URL string (no link, no picture).
  const text = cell.textContent.trim();
  if (text && URL_LIKE.test(text) && !cell.querySelector('a, img, picture')) {
    if (VIDEO_RE.test(text)) { first.remove(); return { kind: 'video', url: text }; }
    if (IMAGE_RE.test(text)) { first.remove(); return { kind: 'image', url: text }; }
  }

  return null;
}

function takeKeyedRows(block) {
  const map = {};
  [...block.children].forEach((row) => {
    if (row.children.length !== 2) return;
    const key = row.children[0].textContent.trim().toLowerCase();
    const val = row.children[1];
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
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.setAttribute('aria-hidden', 'true');
      video.innerHTML = `<source src="${media.url}" type="video/${ext}">`;
      layer.append(video);
      // Some browsers ignore inline autoplay attrs until user interaction —
      // explicitly call play() once metadata loads to maximise chances.
      video.addEventListener('loadedmetadata', () => {
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => { /* autoplay blocked */ });
      });
    } else if (media.kind === 'image') {
      const img = document.createElement('img');
      img.src = media.url;
      img.alt = '';
      img.loading = 'eager';
      layer.append(img);
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

function buildBannerLayer(media) {
  const layer = document.createElement('div');
  layer.className = 'hero-banner';
  if (media) {
    if (media.kind === 'picture') layer.append(media.node);
    else if (media.kind === 'image') {
      const img = document.createElement('img');
      img.src = media.url;
      img.alt = '';
      layer.append(img);
    }
  }
  const overlay = document.createElement('div');
  overlay.className = 'hero-banner-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  layer.append(overlay);
  return layer;
}

/**
 * If the author wrote a hero with no markdown heading, the body shows up as
 * one or more <p> elements. Promote the first non-link, non-image paragraph
 * into an <h1> so the page reads like a hero.
 */
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

export default function decorate(block) {
  const variants = [...block.classList].filter((c) => c !== 'hero' && c !== 'block');
  const isSearch = variants.includes('search');
  const isMedia = variants.includes('media');
  const isGradient = variants.includes('gradient');
  const isCompact = variants.includes('compact');

  const media = takeMediaRow(block);
  const keyed = takeKeyedRows(block);

  // Auto-detect video variant from the media itself.
  const isVideo = variants.includes('video') || (media && media.kind === 'video');

  // Whatever's left is the textual content (heading + paragraphs + button-wrappers).
  const content = document.createElement('div');
  content.className = 'hero-content';
  while (block.firstElementChild) {
    const row = block.firstElementChild;
    while (row.firstElementChild) content.append(row.firstElementChild);
    row.remove();
  }

  ensureHeading(content);

  if (isGradient && keyed.avatar) {
    const avatar = document.createElement('div');
    avatar.className = 'hero-avatar';
    while (keyed.avatar.firstElementChild) avatar.append(keyed.avatar.firstElementChild);
    content.prepend(avatar);
  }

  if (isMedia && keyed.meta) {
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

  block.textContent = '';
  if (isMedia) {
    block.append(buildBannerLayer(media));
  } else if (isVideo || (media && !isCompact && !isMedia)) {
    block.append(buildBgLayer(media));
  }

  block.append(content);

  if (isVideo) block.append(renderScrollChevron());

  if (isVideo) block.classList.add('hero-video');
  if (isSearch) block.classList.add('hero-search-variant');
  if (isMedia) block.classList.add('hero-media');
  if (isGradient) block.classList.add('hero-gradient-variant');
  if (isCompact) block.classList.add('hero-compact');
  if (variants.length === 0 && !isVideo) block.classList.add('hero-default');
}
