const VIDEO_RE = /\.(mp4|webm)(\?[^\s]*)?$/i;
const IMAGE_RE = /\.(jpe?g|png|webp|gif|svg)(\?[^\s]*)?$/i;
const URL_LIKE = /^(https?:\/\/|\/)\S+$/i;

const SOURCE_FILE = { events: 'campaigns', blogs: 'blogs', creators: 'creators' };

// Extracts the entity ID from the URL query string or last path segment.
function getUrlId() {
  const fromQuery = new URLSearchParams(window.location.search).get('id');
  if (fromQuery) return fromQuery;
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments.length >= 2) return decodeURIComponent(segments[segments.length - 1]);
  return null;
}

// Fetches the entity matching the current URL for the given data source.
async function fetchEntity(source) {
  const file = SOURCE_FILE[source];
  if (!file) return null;
  const id = getUrlId();
  if (!id) return null;
  const data = await window.AdobeSphere.Utils.fetchData(file);
  return Array.isArray(data) ? (data.find((it) => it.id === id) || null) : null;
}

// Extracts the first row as a media descriptor (picture, video, or image).
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

// Extracts allowed key-value rows (search, avatar, stats, meta, id source) from the block.
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

// Renders a debounced search input that dispatches or navigates to the Explore page.
function renderSearch(placeholder) {
  const wrap = document.createElement('div');
  wrap.className = 'hero-search';
  const initialQ = new URLSearchParams(window.location.search).get('q') || '';
  const escapeHtml = window.AdobeSphere?.Utils?.escapeHtml || ((s) => s);
  wrap.innerHTML = `
    <input type="search" class="form-input hero-search-input" placeholder="${escapeHtml(placeholder || 'Search…')}" aria-label="Search" value="${escapeHtml(initialQ)}">
    <button type="button" class="hero-search-btn" aria-label="Run search">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"></circle>
        <path d="M20 20L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
      </svg>
    </button>`;
  const input = wrap.querySelector('.hero-search-input');
  const isExplore = window.location.pathname.includes('/explore');

  // Dispatches a search event on /explore or navigates with ?q= otherwise.
  const submit = () => {
    const q = input.value.trim();
    if (isExplore) {
      const url = new URL(window.location);
      if (q) url.searchParams.set('q', q);
      else url.searchParams.delete('q');
      window.history.replaceState({}, '', url);
      window.dispatchEvent(new CustomEvent('adobesphere:search', { detail: q }));
    } else {
      window.location.href = q ? `/explore?q=${encodeURIComponent(q)}` : '/explore';
    }
  };

  wrap.querySelector('.hero-search-btn').addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(submit, 250);
  });

  return wrap;
}

// Renders a chevron anchor that smooth-scrolls to the next section.
function renderScrollChevron() {
  const a = document.createElement('a');
  a.className = 'hero-scroll';
  a.href = '#';
  a.setAttribute('aria-label', 'Scroll to next section');
  a.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>
  </svg>`;
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const next = a.closest('.section')?.nextElementSibling;
    if (next) next.scrollIntoView({ behavior: 'smooth' });
  });
  return a;
}

// Builds the background layer for video or image media.
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

// Builds the banner image layer for the media variant.
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

// Promotes the first plain-text paragraph to an h1 if no heading exists.
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

// Injects entity title, category badge, and meta into the media variant content.
function hydrateMediaFromEntity(entity, content, media) {
  const { Utils } = window.AdobeSphere;

  let resolvedMedia = media;
  if (entity.thumbnail) {
    const url = Utils.normaliseAsset(entity.thumbnail, '');
    if (url) resolvedMedia = { kind: 'image', url };
  }

  if (entity.category) {
    const badge = document.createElement('span');
    badge.className = 'hero-category-badge';
    badge.textContent = entity.category;
    content.prepend(badge);
  }

  if (entity.title) {
    const existing = content.querySelector('h1, h2');
    if (existing) {
      existing.textContent = entity.title;
    } else {
      const h1 = document.createElement('h1');
      h1.textContent = entity.title;
      const badge = content.querySelector('.hero-category-badge');
      if (badge) badge.after(h1);
      else content.prepend(h1);
    }
  }

  if (!content.querySelector('.hero-meta')) {
    const meta = document.createElement('div');
    meta.className = 'hero-meta';
    if (entity.date) {
      const dateLine = document.createElement('p');
      dateLine.textContent = Utils.formatDate(entity.date);
      meta.append(dateLine);
    }
    if (entity.location) {
      const loc = [entity.location.city, entity.location.state, entity.location.country].filter(Boolean).join(', ');
      if (loc) {
        const locLine = document.createElement('p');
        locLine.textContent = loc;
        meta.append(locLine);
      }
    }
    if (meta.children.length) content.append(meta);
  }

  return resolvedMedia;
}

// Injects entity title and compact meta (category, date, author) into the compact variant.
function hydrateCompactFromEntity(entity, content) {
  const { Utils } = window.AdobeSphere;

  if (!content.querySelector('h1, h2') && entity.title) {
    const h1 = document.createElement('h1');
    h1.textContent = entity.title;
    content.prepend(h1);
  }

  if (!content.querySelector('.hero-compact-meta')) {
    const parts = [];
    if (entity.category) parts.push(`<span class="badge outline">${Utils.escapeHtml(entity.category)}</span>`);
    if (entity.publishedDate) parts.push(`<span>${Utils.escapeHtml(Utils.formatShortDate(entity.publishedDate))}</span>`);
    const authorName = entity.author && entity.author.name;
    const authorId = entity.author && entity.author.id;
    if (authorName) {
      const link = authorId
        ? `<a href="/creator-profile?id=${encodeURIComponent(authorId.replace(/^user:/, ''))}">${Utils.escapeHtml(authorName)}</a>`
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

// Renders the creator variant hero with avatar, name, designation, and stats.
async function renderCreatorVariant(block) {
  const { Utils, Storage } = window.AdobeSphere;

  const cfg = {};
  [...block.children].forEach((row) => {
    if (row.children.length !== 2) return;
    const key = row.children[0].textContent.trim().toLowerCase().replace(/\s+/g, '-');
    cfg[key] = row.children[1].textContent.trim();
    row.remove();
  });

  const source = cfg['id-source'] || 'creators';
  const entityId = cfg['id'] || getUrlId();
  let entity = null;
  if (entityId) {
    try {
      const file = source === 'events' ? 'campaigns' : source;
      const data = await Utils.fetchData(file);
      if (Array.isArray(data)) entity = data.find((c) => c.id === entityId) || null;
    } catch {}
    if (!entity && source === 'creators') entity = Storage.getLocalCreator?.(entityId) || null;
  }

  block.textContent = '';
  block.classList.add('hero-creator');

  if (!entity) {
    const p = document.createElement('p');
    p.className = 'hero-creator-empty';
    p.textContent = cfg['empty'] || '';
    block.append(p);
    return;
  }

  if (entity.name) document.title = `${entity.name} — AdobeSphere`;

  const DEFAULT_AVATAR = '/assets/images/profiles/default-user.jpg';
  const avatar = Utils.normaliseAsset(entity.avatar, DEFAULT_AVATAR);
  const stats = entity.stats || {};

  const inner = document.createElement('div');
  inner.className = 'hero-creator-inner';

  const heroRow = document.createElement('div');
  heroRow.className = 'hero-creator-hero';

  const img = document.createElement('img');
  img.className = 'hero-creator-avatar';
  img.src = avatar;
  img.alt = `${entity.name || 'Creator'} avatar`;
  img.loading = 'eager';

  const textDiv = document.createElement('div');
  textDiv.className = 'hero-creator-text';
  const h1 = document.createElement('h1');
  h1.textContent = entity.name || '';
  const desig = document.createElement('p');
  desig.textContent = entity.designation || '';
  textDiv.append(h1, desig);
  heroRow.append(img, textDiv);

  const statItems = [
    [stats.blogsPublished ?? 0, cfg['stat-blogs'] || 'Blogs Published'],
    [stats.eventsHosted ?? 0, cfg['stat-events'] || 'Events Hosted'],
    [stats.testimonialsGiven ?? 0, cfg['stat-testimonials'] || 'Testimonials'],
  ];

  const ul = document.createElement('ul');
  ul.className = 'hero-creator-stats';
  statItems.forEach(([value, label]) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = String(value);
    const span = document.createElement('span');
    span.textContent = label;
    li.append(strong, span);
    ul.append(li);
  });

  inner.append(heroRow, ul);
  block.append(inner);
}

// Decorates the hero block, dispatching to the correct variant renderer.
export default async function decorate(block) {
  const variants = [...block.classList].filter((c) => c !== 'hero' && c !== 'block');
  const isCreator = variants.includes('creator');

  if (isCreator) {
    await renderCreatorVariant(block);
    return;
  }

  const isSearch = variants.includes('search');
  const isMedia = variants.includes('media');
  const isGradient = variants.includes('gradient');
  const isCompact = variants.includes('compact');

  let media = takeMediaRow(block);
  const keyed = takeKeyedRows(block);
  const isVideo = variants.includes('video') || (media && media.kind === 'video');

  const content = document.createElement('div');
  content.className = 'hero-content';
  while (block.firstElementChild) {
    const row = block.firstElementChild;
    while (row.firstElementChild) content.append(row.firstElementChild);
    row.remove();
  }

  ensureHeading(content);

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
        if (entity.title || entity.name) {
          document.title = `${entity.title || entity.name} — AdobeSphere`;
        }
      }
    } catch {}
  }

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

  block.textContent = '';
  if (isMedia) block.append(buildBannerLayer(media));
  else if (isVideo || (media && !isCompact && !isMedia)) block.append(buildBgLayer(media));
  block.append(content);
  if (isVideo) block.append(renderScrollChevron());

  if (isSearch) {
    const focusInput = () => {
      const inp = block.querySelector('.hero-search-input');
      if (inp) inp.focus();
    };
    if (sessionStorage.getItem('adobesphere:focus-search')) {
      sessionStorage.removeItem('adobesphere:focus-search');
      requestAnimationFrame(focusInput);
    }
    window.addEventListener('adobesphere:focus-search', focusInput, { once: true });
  }

  if (isVideo) block.classList.add('hero-video');
  if (isSearch) block.classList.add('hero-search-variant');
  if (isMedia) block.classList.add('hero-media');
  if (isGradient) block.classList.add('hero-gradient-variant');
  if (isCompact) block.classList.add('hero-compact');
  if (variants.length === 0 && !isVideo) block.classList.add('hero-default');
}
