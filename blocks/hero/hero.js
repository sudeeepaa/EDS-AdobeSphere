/**
 * AdobeSphere hero block (FIXED: supports text-based video paths)
 */

function nextOf(elem) {
  return elem ? elem.nextElementSibling : null;
}

/**
 * NEW: Handles BOTH picture + text video paths
 */
function takeMediaRow(block) {
  const first = block.firstElementChild;
  if (!first) return null;

  const cell = first.firstElementChild;
  if (!cell) return null;

  // ✅ Case 1: picture/image
  if (cell.children.length === 1 && cell.querySelector('picture')) {
    const picture = cell.querySelector('picture');
    first.remove();
    return { type: 'image', value: picture };
  }

  // ✅ Case 2: TEXT (video path)
  const text = cell.textContent.trim();

  if (/\.(mp4|webm)(\?|$)/i.test(text)) {
    first.remove();
    return { type: 'video', value: text };
  }

  return null;
}

function takeKeyedRows(block) {
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
    <input type="search" class="form-input hero-search-input" placeholder="${placeholder || 'Search…'}">
    <button type="button" class="hero-search-btn">
      🔍
    </button>`;

  const input = wrap.querySelector('input');

  const submit = () => {
    const q = input.value.trim();
    const url = q ? `/explore?q=${encodeURIComponent(q)}` : '/explore';
    window.location.href = url;
  };

  wrap.querySelector('button').addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });

  return wrap;
}

function renderScrollChevron() {
  const a = document.createElement('a');
  a.className = 'hero-scroll';
  a.href = '#main-content';

  a.innerHTML = `↓`;

  return a;
}

/**
 * UPDATED: Handles both image + video
 */
function buildVideoLayer(media) {
  const layer = document.createElement('div');
  layer.className = 'hero-bg';

  if (media) {
    // ✅ TEXT VIDEO
    if (media.type === 'video') {
      const video = document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;

      video.innerHTML = `<source src="${media.value}" type="video/${media.value.match(/\.(mp4|webm)/i)[1]}">`;

      layer.append(video);
    }

    // ✅ IMAGE / PICTURE
    else if (media.type === 'image') {
      const picture = media.value;
      const img = picture.querySelector('img');
      const src = img && img.getAttribute('src');

      if (src && /\.(mp4|webm)/i.test(src)) {
        const video = document.createElement('video');
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;

        video.innerHTML = `<source src="${src}">`;
        layer.append(video);
      } else {
        layer.append(picture);
      }
    }
  }

  const grad = document.createElement('div');
  grad.className = 'hero-gradient';
  layer.append(grad);

  const overlay = document.createElement('div');
  overlay.className = 'hero-overlay';
  layer.append(overlay);

  return layer;
}

function buildBannerLayer(picture) {
  const layer = document.createElement('div');
  layer.className = 'hero-banner';

  if (picture) layer.append(picture);

  const overlay = document.createElement('div');
  overlay.className = 'hero-banner-overlay';
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

  // ✅ NEW media handler
  const media = takeMediaRow(block);
  const keyed = takeKeyedRows(block);

  const content = document.createElement('div');
  content.className = 'hero-content';

  while (block.firstElementChild) {
    const row = block.firstElementChild;
    while (row.firstElementChild) content.append(row.firstElementChild);
    row.remove();
  }

  // Avatar
  if (isGradient && keyed.avatar) {
    const avatar = document.createElement('div');
    avatar.className = 'hero-avatar';
    while (keyed.avatar.firstElementChild) avatar.append(keyed.avatar.firstElementChild);
    content.prepend(avatar);
  }

  // Meta
  if (isMedia && keyed.meta) {
    const meta = document.createElement('div');
    meta.className = 'hero-meta';
    while (keyed.meta.firstElementChild) meta.append(keyed.meta.firstElementChild);
    content.append(meta);
  }

  // Search
  if (isSearch) {
    const placeholder = (keyed.placeholder || keyed.search)
      ? (keyed.placeholder || keyed.search).textContent.trim()
      : 'Search events, blogs, creators…';

    content.append(renderSearch(placeholder));
  }

  // Stats
  if (isGradient && keyed.stats) {
    const stats = document.createElement('div');
    stats.className = 'hero-stats';
    while (keyed.stats.firstElementChild) stats.append(keyed.stats.firstElementChild);
    content.append(stats);
  }

  // Clear block
  block.textContent = '';

  // ✅ UPDATED rendering logic
  if (isMedia && media?.type === 'image') {
    block.append(buildBannerLayer(media.value));
  } else if (isVideo || media) {
    block.append(buildVideoLayer(media));
  }

  block.append(content);

  if (isVideo) block.append(renderScrollChevron());

  // Variant classes
  if (isVideo) block.classList.add('hero-video');
  if (isSearch) block.classList.add('hero-search-variant');
  if (isMedia) block.classList.add('hero-media');
  if (isGradient) block.classList.add('hero-gradient-variant');
  if (isCompact) block.classList.add('hero-compact');
  if (variants.length === 0) block.classList.add('hero-default');
}