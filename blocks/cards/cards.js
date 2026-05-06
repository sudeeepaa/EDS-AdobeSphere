/**
 * AdobeSphere universal cards block.
 *
 * The cards block has TWO authoring modes:
 *
 * 1. STATIC mode — author writes the cards directly as block rows.
 *    Each row is one card. Cell contents become the card body. Supports
 *    `cards (testimonials)`, `cards (horizontal)`, etc. Useful for hand-curated
 *    content like the "What Creators Are Saying" testimonials section.
 *
 * 2. DATA mode — first cell of the first row is `Source | events|blogs|creators`
 *    and the rest of the rows are filter/limit hints (e.g. `Filter | featured=true`,
 *    `Limit | 6`). The block hydrates from /data/{events|blogs|creators}.json.
 *    Used for everything dynamic (home grids, "you might also like", etc.).
 *
 * Variants (block class — multiple allowed, space-separated in da.live):
 *   • events / blogs / creators / testimonials → card type
 *   • horizontal → side-by-side image+body layout (e.g. user-profile saved items)
 *   • with-save → toggleable bookmark button
 *   • with-actions → register/cancel/delete/edit buttons
 *
 * `data-source` is the canonical signal — the first row of the block sets it.
 */

const FALLBACK_AVATAR = '/icons/user-default.svg';
const FALLBACK_THUMB = '/icons/card-fallback.svg';

function classify(block) {
  const variants = [...block.classList].filter((c) => c !== 'cards' && c !== 'block');
  return {
    list: variants,
    type: ['events', 'blogs', 'creators', 'testimonials'].find((t) => variants.includes(t)),
    horizontal: variants.includes('horizontal'),
    withSave: variants.includes('with-save'),
    withActions: variants.includes('with-actions'),
  };
}

function readConfig(block) {
  // Recognises rows like `Source | events`, `Filter | featured=true`, `Limit | 6`,
  // `Title | Featured Events`, `Empty | No events available`, `Ids From | creators.eventIds`.
  // Also supports `Filters | true` and `Pagination | 6`
  const cfg = {};
  const rows = [...block.children];
  rows.forEach((row) => {
    if (row.children.length !== 2) return;
    const key = row.children[0].textContent.trim().toLowerCase();
    const value = row.children[1].textContent.trim();
    if (['source', 'filter', 'filters', 'limit', 'title', 'empty', 'ids', 'ids from', 'pagination'].includes(key)) {
      cfg[key.replace(/\s/g, '_')] = value;
      row.remove();
    }
  });
  return cfg;
}

function escapeHtml(value) {
  return window.AdobeSphere.Utils.escapeHtml(value);
}

function asAsset(src, fallback) {
  return window.AdobeSphere.Utils.normaliseAsset(src, fallback);
}

function applyFilter(items, filter) {
  if (!filter) return items;
  const [k, v] = filter.split('=').map((s) => s.trim());
  if (!k) return items;
  return items.filter((it) => {
    const actual = it && it[k];
    if (v === 'true') return actual === true;
    if (v === 'false') return actual === false;
    return String(actual) === v;
  });
}

function bookmarkSvg() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 3H18C18.55 3 19 3.45 19 4V21L12 17L5 21V4C5 3.45 5.45 3 6 3Z" stroke="currentColor" stroke-width="1.7" fill="none"></path>
  </svg>`;
}

function buildSaveButton(type, id) {
  const { Storage, Utils } = window.AdobeSphere;
  const saved = Storage.isLoggedIn() && Storage.isSaved(type, id);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `card-save${saved ? ' saved' : ''}`;
  btn.setAttribute('aria-label', saved ? 'Remove from saved' : 'Save');
  btn.dataset.id = id;
  btn.dataset.type = type;
  btn.innerHTML = bookmarkSvg();
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!Storage.isLoggedIn()) {
      Utils.toast('Please sign in to save items.', 'info');
      return;
    }
    const isNowSaved = Storage.toggleSaved(type, id);
    btn.classList.toggle('saved', isNowSaved);
    btn.setAttribute('aria-label', isNowSaved ? 'Remove from saved' : 'Save');
    Utils.toast(isNowSaved ? 'Saved!' : 'Removed from saved.', 'success');
  });
  return btn;
}

/* ─────────── card builders (return an HTMLElement) ─────────── */

function buildEventCard(event, opts) {
  const { withSave, withActions } = opts;
  const article = document.createElement('article');
  article.className = 'card card-event reveal';

  const id = event.id || '';
  const href = `/events/${encodeURIComponent(id)}`;
  const thumb = asAsset(event.thumbnail, FALLBACK_THUMB);
  const location = [event.location && event.location.city, event.location && event.location.state]
    .filter(Boolean).join(', ');
  const date = window.AdobeSphere.Utils.formatShortDate(event.date || '');

  article.innerHTML = `
    <a class="card-link" href="${escapeHtml(href)}" aria-label="${escapeHtml(event.title || 'Event')}"></a>
    <img class="card-image" src="${escapeHtml(thumb)}" alt="${escapeHtml(event.title || 'Event')}" loading="lazy">
    <div class="card-body">
      <span class="badge">${escapeHtml(event.category || 'Event')}</span>
      <h3 class="card-title">${escapeHtml(event.title || 'Untitled Event')}</h3>
      <div class="card-meta">
        <span>${escapeHtml(date)}</span>
        <span>${escapeHtml(location || 'TBD')}</span>
      </div>
      <p class="card-excerpt">${escapeHtml(event.shortDescription || '')}</p>
      ${withActions ? `<div class="card-actions"></div>` : ''}
    </div>`;

  if (withSave) article.append(buildSaveButton('events', id));

  if (withActions) {
    const actions = article.querySelector('.card-actions');
    const { Storage } = window.AdobeSphere;
    const isRegistered = Storage.isLoggedIn() && Storage.getRegistrations().some((r) => r.eventId === id);
    if (isRegistered) {
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'button ghost card-cancel';
      cancel.textContent = 'Cancel Registration';
      cancel.addEventListener('click', (e) => {
        e.preventDefault();
        if (Storage.cancelRegistration(id)) {
          window.AdobeSphere.Utils.toast('Registration cancelled.', 'success');
          article.remove();
        }
      });
      actions.append(cancel);
    } else {
      const register = document.createElement('a');
      register.className = 'button primary';
      register.href = href;
      register.textContent = 'View & Register';
      actions.append(register);
    }
  }

  return article;
}

function buildBlogCard(blog, opts) {
  const { withSave, withActions } = opts;
  const article = document.createElement('article');
  article.className = 'card card-blog reveal';

  const id = blog.id || '';
  const href = `/blog/${encodeURIComponent(id)}`;
  const cover = asAsset(blog.coverImage, FALLBACK_THUMB);
  const author = blog.author || {};
  const avatar = asAsset(author.avatar, FALLBACK_AVATAR);
  const date = window.AdobeSphere.Utils.formatShortDate(blog.publishedDate || '');

  article.innerHTML = `
    <a class="card-link" href="${escapeHtml(href)}" aria-label="${escapeHtml(blog.title || 'Blog')}"></a>
    <img class="card-image" src="${escapeHtml(cover)}" alt="${escapeHtml(blog.title || 'Blog')}" loading="lazy">
    <div class="card-body">
      <span class="badge outline">${escapeHtml(blog.category || 'Article')}</span>
      <h3 class="card-title">${escapeHtml(blog.title || 'Untitled Article')}</h3>
      <div class="card-meta">
        <span class="card-author">
          <img src="${escapeHtml(avatar)}" alt="${escapeHtml(author.name || 'Author')}">
          ${escapeHtml(author.name || 'Author')}
        </span>
        <span>${escapeHtml(date)}</span>
      </div>
      <p class="card-excerpt">${escapeHtml(blog.excerpt || '')}</p>
      ${withActions ? `<div class="card-actions"></div>` : ''}
    </div>`;

  if (withSave) article.append(buildSaveButton('blogs', id));

  if (withActions) {
    const actions = article.querySelector('.card-actions');
    const edit = document.createElement('a');
    edit.className = 'button ghost';
    edit.href = `/blog-editor?id=${encodeURIComponent(id)}`;
    edit.textContent = 'Edit';
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'button ghost card-delete';
    del.textContent = 'Delete';
    del.addEventListener('click', (e) => {
      e.preventDefault();
      // eslint-disable-next-line no-restricted-globals, no-alert
      if (confirm('Delete this blog? This cannot be undone.')) {
        window.AdobeSphere.Storage.deleteUserBlog(id);
        window.AdobeSphere.Utils.toast('Blog deleted.', 'success');
        article.remove();
      }
    });
    actions.append(edit, del);
  }

  return article;
}

function buildCreatorCard(creator) {
  const article = document.createElement('article');
  article.className = 'card card-creator reveal';

  const id = creator.id || '';
  const href = `/creator-profile/${encodeURIComponent(id)}`;
  const avatar = asAsset(creator.avatar, FALLBACK_AVATAR);
  const bio = window.AdobeSphere.Utils.truncate(creator.bio || creator.fullBio || '', 100);

  article.innerHTML = `
    <a class="card-link" href="${escapeHtml(href)}" aria-label="${escapeHtml(creator.name || 'Creator')}"></a>
    <div class="card-body">
      <img class="card-avatar" src="${escapeHtml(avatar)}" alt="${escapeHtml(creator.name || 'Creator')}" loading="lazy">
      <h3 class="card-title">${escapeHtml(creator.name || 'Unnamed Creator')}</h3>
      <p class="text-muted">${escapeHtml(creator.designation || '')}</p>
      <p class="card-excerpt">${escapeHtml(bio)}</p>
    </div>`;

  return article;
}

function buildTestimonialCard(t) {
  const article = document.createElement('article');
  article.className = 'card card-testimonial reveal';
  const avatar = asAsset(t.avatar, FALLBACK_AVATAR);
  article.innerHTML = `
    <div class="card-body">
      <blockquote>${escapeHtml(t.quote || '')}</blockquote>
      <div class="card-byline">
        <img src="${escapeHtml(avatar)}" alt="${escapeHtml(t.name || 'Creator')}" loading="lazy">
        <div>
          <p class="card-byline-name">${escapeHtml(t.name || '')}</p>
          <p class="card-byline-role text-muted">${escapeHtml(t.designation || '')}</p>
        </div>
      </div>
    </div>`;
  return article;
}

function buildStaticCard(row, variants) {
  // Static-mode card: each row is a card. We drop the row's content into a shell.
  const card = document.createElement('article');
  card.className = 'card card-static reveal';
  if (variants.horizontal) card.classList.add('horizontal');

  // Move children into the card. If there's a picture, lift it to image slot.
  const cells = [...row.children];
  cells.forEach((cell) => {
    if (cell.querySelector('picture, img') && cell.children.length === 1) {
      cell.classList.add('card-image-wrap');
      card.append(cell);
    } else {
      cell.classList.add('card-body');
      card.append(cell);
    }
  });
  return card;
}

function uniqueValues(items, picker) {
  const seen = new Set();
  items.forEach((it) => {
    const v = picker(it);
    if (Array.isArray(v)) v.forEach((x) => x && seen.add(x));
    else if (v) seen.add(v);
  });
  return [...seen].sort((a, b) => String(a).localeCompare(String(b)));
}

function matchesText(item, q) {
  if (!q) return true;
  return JSON.stringify(item).toLowerCase().includes(q.toLowerCase());
}

function getFilteredItems(type, items, f) {
  if (type === 'events') {
    return items.filter((e) => {
      if (!matchesText(e, f.q)) return false;
      if (f.category && e.category !== f.category) return false;
      if (f.location && f.location.length) {
        const city = e.location && e.location.city;
        if (!city || !f.location.includes(city)) return false;
      }
      if (f.date && f.date !== 'all') {
        const today = new Date();
        const ev = new Date(e.date);
        if (f.date === 'upcoming' && ev < today) return false;
        if (f.date === 'past' && ev >= today) return false;
      }
      return true;
    });
  }
  if (type === 'blogs') {
    return items.filter((b) => {
      if (!matchesText(b, f.q)) return false;
      if (f.category && b.category !== f.category) return false;
      if (f.author) {
        const name = (b.author && b.author.name) || '';
        if (!name.toLowerCase().includes(f.author.toLowerCase())) return false;
      }
      return true;
    }).sort((a, b) => {
      if (f.sort === 'oldest') return new Date(a.publishedDate) - new Date(b.publishedDate);
      return new Date(b.publishedDate) - new Date(a.publishedDate);
    });
  }
  if (type === 'creators') {
    return items.filter((c) => {
      if (!matchesText(c, f.q)) return false;
      if (f.designation && f.designation.length && !f.designation.includes(c.designation)) return false;
      return true;
    }).sort((a, b) => {
      if (f.sort === 'name-desc') return String(b.name).localeCompare(String(a.name));
      if (f.sort === 'testimonials') return ((b.stats && b.stats.testimonialsGiven) || 0) - ((a.stats && a.stats.testimonialsGiven) || 0);
      return String(a.name).localeCompare(String(b.name));
    });
  }
  return items;
}

function dispatchBuilder(type) {
  switch (type) {
    case 'events': return buildEventCard;
    case 'blogs': return buildBlogCard;
    case 'creators': return buildCreatorCard;
    case 'testimonials': return buildTestimonialCard;
    default: return null;
  }
}

async function hydrateFromData(block, type, cfg, opts) {
  const { Utils } = window.AdobeSphere;
  const data = await Utils.fetchData(type === 'events' ? 'campaigns' : type);

  if (!Array.isArray(data) || !data.length) {
    block.innerHTML = `<p class="cards-empty">${escapeHtml(cfg.empty || `No ${type} available.`)}</p>`;
    return;
  }

  let items = data.slice();

  // Resolve Ids From
  let idsFromList = null;
  if (cfg.ids_from) {
    const [refSource, refField] = cfg.ids_from.split('.').map((s) => s.trim());
    const refFile = refSource === 'events' ? 'campaigns' : refSource;
    const refData = await Utils.fetchData(refFile);
    if (Array.isArray(refData)) {
      const urlId = (() => {
        const q = new URLSearchParams(window.location.search).get('id');
        if (q) return q;
        const seg = window.location.pathname.split('/').filter(Boolean);
        return seg.length >= 2 ? decodeURIComponent(seg[seg.length - 1]) : null;
      })();
      const refEntity = urlId && refData.find((it) => it.id === urlId);
      if (refEntity && Array.isArray(refEntity[refField])) idsFromList = refEntity[refField];
    }
  }

  // Pre-filter with Explicit IDs or `Filter | featured=true`
  if (cfg.ids) {
    const ids = cfg.ids.split(',').map((s) => s.trim()).filter(Boolean);
    items = ids.map((id) => items.find((it) => it.id === id)).filter(Boolean);
  } else if (idsFromList) {
    items = idsFromList.map((id) => items.find((it) => it.id === id)).filter(Boolean);
  } else {
    items = applyFilter(items, cfg.filter);
  }

  const enableFilters = cfg.filters === 'true';
  const pageSize = parseInt(cfg.pagination, 10) || 0;
  const builder = dispatchBuilder(type);

  // If no dynamic features, render static grid and exit early
  if (!enableFilters && !pageSize) {
    if (cfg.limit) items = items.slice(0, parseInt(cfg.limit, 10) || items.length);
    const grid = document.createElement('div');
    grid.className = `cards-grid grid-${type}`;
    if (opts.horizontal) grid.classList.add('horizontal');
    block.append(grid);
    if (!items.length) {
      grid.innerHTML = `<p class="cards-empty">${escapeHtml(cfg.empty || `No ${type} match.`)}</p>`;
    } else {
      items.forEach((item) => grid.append(builder(item, opts)));
    }
    return;
  }

  // --- Dynamic Mode (Filters and/or Pagination) ---
  const filterHost = document.createElement('div');
  filterHost.className = 'explore-filters';

  const grid = document.createElement('div');
  grid.className = `cards-grid grid-${type}`;
  if (opts.horizontal) grid.classList.add('horizontal');

  const pagiHost = document.createElement('div');
  pagiHost.className = 'explore-pagination';

  if (enableFilters) block.append(filterHost);
  block.append(grid);
  if (pageSize) block.append(pagiHost);

  const state = {
    page: 1,
    q: new URLSearchParams(window.location.search).get('q') || '',
    f: type === 'events' ? { category: '', location: [], date: 'all' }
      : type === 'blogs' ? { category: '', author: '', sort: 'newest' }
        : { designation: [], sort: 'name-asc' }
  };

  function renderGrid() {
    const filtered = getFilteredItems(type, items, { q: state.q, ...state.f });

    let slice = filtered;
    if (pageSize) {
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      if (state.page > totalPages) state.page = totalPages;
      const start = (state.page - 1) * pageSize;
      slice = filtered.slice(start, start + pageSize);

      pagiHost.innerHTML = `
        <button type="button" class="button ghost" data-prev ${state.page === 1 ? 'disabled' : ''}>Prev</button>
        <span class="explore-page">Page ${state.page} of ${totalPages} (${filtered.length} result${filtered.length === 1 ? '' : 's'})</span>
        <button type="button" class="button ghost" data-next ${state.page >= totalPages ? 'disabled' : ''}>Next</button>`;
      pagiHost.querySelector('[data-prev]').addEventListener('click', () => { if (state.page > 1) { state.page -= 1; renderGrid(); } });
      pagiHost.querySelector('[data-next]').addEventListener('click', () => { if (state.page < totalPages) { state.page += 1; renderGrid(); } });
    } else if (cfg.limit) {
      slice = filtered.slice(0, parseInt(cfg.limit, 10));
    }

    grid.innerHTML = '';
    if (!slice.length) {
      grid.innerHTML = `<p class="cards-empty">${escapeHtml(cfg.empty || 'No results match your filters.')}</p>`;
    } else {
      slice.forEach((item) => grid.append(builder(item, opts)));
    }
  }

  function renderFilters() {
    if (!enableFilters) return;
    let html = '';
    if (type === 'events') {
      const cats = uniqueValues(items, (e) => e.category);
      const cities = uniqueValues(items, (e) => e.location && e.location.city);
      html += `
        <div class="explore-filter-row explore-filter-row-full">
          <select class="form-input" data-filter="category">
            <option value="">All Categories</option>
            ${cats.map((c) => `<option value="${escapeHtml(c)}"${state.f.category === c ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
        </div>
        <div class="explore-filter-row explore-filter-row-split">
          <fieldset class="explore-radios" aria-label="Date">
            <label><input type="radio" name="evt-date-${type}" value="all"${state.f.date === 'all' ? ' checked' : ''}> All</label>
            <label><input type="radio" name="evt-date-${type}" value="upcoming"${state.f.date === 'upcoming' ? ' checked' : ''}> Upcoming</label>
            <label><input type="radio" name="evt-date-${type}" value="past"${state.f.date === 'past' ? ' checked' : ''}> Past</label>
          </fieldset>
          <button type="button" class="button ghost clear-filters">Clear Filters</button>
        </div>
        <div class="explore-filter-row explore-filter-row-full">
          <fieldset class="explore-checkboxes" aria-label="Location">
            <legend>Filter by location</legend>
            <div class="checkbox-grid">
              ${cities.map((c) => `<label><input type="checkbox" value="${escapeHtml(c)}"${state.f.location.includes(c) ? ' checked' : ''}> ${escapeHtml(c)}</label>`).join('')}
            </div>
          </fieldset>
        </div>`;
    } else if (type === 'blogs') {
      const cats = uniqueValues(items, (b) => b.category);
      html += `
        <div class="explore-filter-row explore-filter-row-split">
          <select class="form-input" data-filter="category">
            <option value="">All Categories</option>
            ${cats.map((c) => `<option value="${escapeHtml(c)}"${state.f.category === c ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
          <input type="text" class="form-input" placeholder="Search by author" data-filter="author" value="${escapeHtml(state.f.author)}">
          <select class="form-input" data-filter="sort">
            <option value="newest"${state.f.sort === 'newest' ? ' selected' : ''}>Newest</option>
            <option value="oldest"${state.f.sort === 'oldest' ? ' selected' : ''}>Oldest</option>
          </select>
          <button type="button" class="button ghost clear-filters">Clear Filters</button>
        </div>`;
    } else {
      const designations = uniqueValues(items, (c) => c.designation);
      html += `
        <div class="explore-filter-row explore-filter-row-split">
          <select class="form-input" data-filter="sort">
            <option value="name-asc"${state.f.sort === 'name-asc' ? ' selected' : ''}>Name A–Z</option>
            <option value="name-desc"${state.f.sort === 'name-desc' ? ' selected' : ''}>Name Z–A</option>
            <option value="testimonials"${state.f.sort === 'testimonials' ? ' selected' : ''}>Testimonials</option>
          </select>
          <button type="button" class="button ghost clear-filters">Clear Filters</button>
        </div>
        <div class="explore-filter-row explore-filter-row-full">
          <fieldset class="explore-checkboxes" aria-label="Designation">
            <legend>Filter by designation</legend>
            <div class="checkbox-grid">
              ${designations.map((d) => `<label><input type="checkbox" value="${escapeHtml(d)}"${state.f.designation.includes(d) ? ' checked' : ''}> ${escapeHtml(d)}</label>`).join('')}
            </div>
          </fieldset>
        </div>`;
    }
    filterHost.innerHTML = html;

    // Bind events
    if (type === 'events') {
      filterHost.querySelector('[data-filter="category"]').addEventListener('change', (e) => { state.f.category = e.target.value; state.page = 1; renderGrid(); });
      filterHost.querySelectorAll('[name="evt-date-' + type + '"]').forEach((r) => r.addEventListener('change', (e) => { state.f.date = e.target.value; state.page = 1; renderGrid(); }));
      filterHost.querySelectorAll('.explore-checkboxes input').forEach((c) => c.addEventListener('change', () => {
        state.f.location = [...filterHost.querySelectorAll('.explore-checkboxes input:checked')].map((x) => x.value);
        state.page = 1; renderGrid();
      }));
    } else if (type === 'blogs') {
      filterHost.querySelector('[data-filter="category"]').addEventListener('change', (e) => { state.f.category = e.target.value; state.page = 1; renderGrid(); });
      filterHost.querySelector('[data-filter="author"]').addEventListener('input', (e) => { state.f.author = e.target.value; state.page = 1; renderGrid(); });
      filterHost.querySelector('[data-filter="sort"]').addEventListener('change', (e) => { state.f.sort = e.target.value; state.page = 1; renderGrid(); });
    } else {
      filterHost.querySelector('[data-filter="sort"]').addEventListener('change', (e) => { state.f.sort = e.target.value; state.page = 1; renderGrid(); });
      filterHost.querySelectorAll('.explore-checkboxes input').forEach((c) => c.addEventListener('change', () => {
        state.f.designation = [...filterHost.querySelectorAll('.explore-checkboxes input:checked')].map((x) => x.value);
        state.page = 1; renderGrid();
      }));
    }

    const clearBtn = filterHost.querySelector('.clear-filters');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        state.f = type === 'events' ? { category: '', location: [], date: 'all' } 
                : type === 'blogs' ? { category: '', author: '', sort: 'newest' }
                : { designation: [], sort: 'name-asc' };
        state.page = 1;
        renderFilters();
        renderGrid();
      });
    }
  }

  window.addEventListener('adobesphere:search', (e) => {
    state.q = e.detail || '';
    state.page = 1;
    renderGrid();
  });

  renderFilters();
  renderGrid();
}

function hydrateStatic(block, opts) {
  const grid = document.createElement('div');
  grid.className = `cards-grid grid-static${opts.horizontal ? ' horizontal' : ''}`;
  const rows = [...block.children];
  rows.forEach((row) => {
    grid.append(buildStaticCard(row, opts));
    row.remove();
  });
  block.append(grid);
}

export default async function decorate(block) {
  const variants = classify(block);
  const cfg = readConfig(block);

  // Optional title row.
  if (cfg.title) {
    const h2 = document.createElement('h2');
    h2.className = 'section-heading';
    h2.textContent = cfg.title;
    block.parentElement.insertBefore(h2, block);
  }

  // Determine source. If `Source` cell explicitly set, use that. Otherwise infer from variant.
  const source = (cfg.source || variants.type || '').toLowerCase();
  const opts = { withSave: variants.withSave, withActions: variants.withActions, horizontal: variants.horizontal };

  if (['events', 'blogs', 'creators'].includes(source)) {
    block.dataset.source = source;
    await hydrateFromData(block, source, cfg, opts);
  } else if (variants.type === 'testimonials' || block.children.length > 0) {
    // Testimonials usually authored statically (4-cell rows: name|designation|quote|picture).
    if (variants.type === 'testimonials' && block.children.length) {
      // Each row → testimonial card. Pull cells into an item object.
      const grid = document.createElement('div');
      grid.className = 'cards-grid grid-testimonials';
      [...block.children].forEach((row) => {
        const cells = [...row.children];
        const item = {
          name: (cells[0] && cells[0].textContent.trim()) || '',
          designation: (cells[1] && cells[1].textContent.trim()) || '',
          quote: (cells[2] && cells[2].textContent.trim()) || '',
          avatar: (cells[3] && (cells[3].querySelector('img') ? cells[3].querySelector('img').src : cells[3].textContent.trim())) || '',
        };
        grid.append(buildTestimonialCard(item));
        row.remove();
      });
      block.append(grid);
    } else {
      hydrateStatic(block, opts);
    }
  } else {
    block.innerHTML = '<p class="cards-empty">No source configured.</p>';
  }
}