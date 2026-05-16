const FALLBACK_AVATAR = '/icons/user-default.svg';
const FALLBACK_THUMB = '/icons/card-fallback.svg';

// Extracts variant flags from the block's class list.
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

// Reads source, filter, limit, and other config rows from the block.
function readConfig(block) {
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

// Delegates HTML escaping to the shared Utils helper.
function escapeHtml(value) {
  return window.AdobeSphere.Utils.escapeHtml(value);
}

// Normalises an asset path with a fallback via Utils.
function asAsset(src, fallback) {
  return window.AdobeSphere.Utils.normaliseAsset(src, fallback);
}

// Parses an id list that may be a real array (local JSON) or a bracket-comma
// string like "[blog-001,blog-009]" (AEM EDS flattens arrays in spreadsheets).
function parseIdList(v) {
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string') return null;
  const stripped = v.trim().replace(/^\[|\]$/g, '').trim();
  if (!stripped) return null;
  const ids = stripped.split(',').map((s) => s.trim()).filter(Boolean);
  return ids.length ? ids : null;
}

// Filters items by a key=value expression string.
function applyFilter(items, filter) {
  if (!filter) return items;
  const [k, v] = filter.split('=').map((s) => s.trim());
  if (!k) return items;
  return items.filter((it) => {
    const actual = it && it[k];
    if (v === 'true') return actual === true || String(actual).toUpperCase() === 'TRUE';
    if (v === 'false') return actual === false || String(actual).toUpperCase() === 'FALSE';
    return String(actual) === v;
  });
}

// Returns the SVG markup string for the bookmark icon.
function bookmarkSvg() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 3H18C18.55 3 19 3.45 19 4V21L12 17L5 21V4C5 3.45 5.45 3 6 3Z" stroke="currentColor" stroke-width="1.7" fill="none"></path>
  </svg>`;
}

// Creates a toggleable save/unsave bookmark button for a card item.
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

// Builds an event article card element.
function buildEventCard(event, opts) {
  const { withSave, withActions } = opts;
  const article = document.createElement('article');
  article.className = 'card card-event reveal';

  const id = event.id || '';
  const href = `/events/template?id=${encodeURIComponent(id)}`;
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

// Builds a blog article card element.
function buildBlogCard(blog, opts) {
  const { withSave, withActions } = opts;
  const article = document.createElement('article');
  article.className = 'card card-blog reveal';

  const id = blog.id || '';
  const href = `/blog/template?id=${encodeURIComponent(id)}`;
  const cover = asAsset(blog.coverImage, FALLBACK_THUMB);
  const author = blog.author || {
    id: blog.author_id || '',
    name: blog.author_name || '',
    avatar: blog.author_avatar || '',
    designation: blog.author_designation || '',
  };
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
          ${author.id
    ? `<a href="/creator-profile/template?id=${escapeHtml(encodeURIComponent(author.id))}" class="card-author-link" aria-label="View author profile"><img src="${escapeHtml(avatar)}" alt="${escapeHtml(author.name || 'Author')}">${escapeHtml(author.name || 'Author')}</a>`
    : `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(author.name || 'Author')}">${escapeHtml(author.name || 'Author')}`}
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
      if (confirm('Delete this blog? This cannot be undone.')) { // eslint-disable-line no-restricted-globals, no-alert
        window.AdobeSphere.Storage.deleteUserBlog(id);
        window.AdobeSphere.Utils.toast('Blog deleted.', 'success');
        article.remove();
      }
    });
    actions.append(edit, del);
  }

  return article;
}

// Builds a creator article card element.
function buildCreatorCard(creator) {
  const article = document.createElement('article');
  article.className = 'card card-creator reveal';

  const id = creator.id || '';
  const href = `/creator-profile/template?id=${encodeURIComponent(id)}`;
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

// Builds a testimonial article card element.
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

// Wraps an authored block row as a static card element.
function buildStaticCard(row, variants) {
  const card = document.createElement('article');
  card.className = 'card card-static reveal';
  if (variants.horizontal) card.classList.add('horizontal');

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

// Collects unique non-null values from items using a picker function.
function uniqueValues(items, picker) {
  const seen = new Set();
  items.forEach((it) => {
    const v = picker(it);
    if (Array.isArray(v)) v.forEach((x) => x && seen.add(x));
    else if (v) seen.add(v);
  });
  return [...seen].sort((a, b) => String(a).localeCompare(String(b)));
}

// Returns true if the item matches the query against the allowed fields only.
function matchesText(type, item, q) {
  if (!q) return true;
  const lq = q.toLowerCase();
  if (type === 'events') {
    return (item.title || '').toLowerCase().includes(lq)
      || (item.category || '').toLowerCase().includes(lq);
  }
  if (type === 'blogs') {
    const authorName = item.author_name || (item.author && item.author.name) || '';
    return (item.title || '').toLowerCase().includes(lq)
      || (item.category || '').toLowerCase().includes(lq)
      || authorName.toLowerCase().includes(lq)
      || (item.excerpt || '').toLowerCase().includes(lq);
  }
  if (type === 'creators') {
    return (item.name || '').toLowerCase().includes(lq)
      || (item.designation || '').toLowerCase().includes(lq);
  }
  return false;
}

// Counts how many filtered items match on primary fields (same as matchesText — kept
// as a named helper so tabs.js can use quality vs count separately if needed).
function qualityScore(type, filteredItems, q) {
  if (!q) return 0;
  return filteredItems.filter((item) => matchesText(type, item, q)).length;
}

// Returns a reliable timestamp for a blog item, falling back to 0 if missing/invalid.
// Handles ISO (YYYY-MM-DD) and DD-MM-YYYY / DD/MM/YYYY shapes from AEM spreadsheets.
function blogTs(b) {
  const raw = b.publishedDate || b.date || 0;
  let d = new Date(raw);
  if (Number.isNaN(d.getTime()) && typeof raw === 'string') {
    const m = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (m) d = new Date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
  }
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

// Filters and sorts items by the given filter state for the source type.
function getFilteredItems(type, items, f) {
  if (type === 'events') {
    const today = new Date();
    const filtered = items.filter((e) => {
      if (!matchesText('events', e, f.q)) return false;
      if (f.category && e.category !== f.category) return false;
      if (f.location && f.location.length) {
        const city = e.location && e.location.city;
        if (!city || !f.location.includes(city)) return false;
      }
      if (f.date && f.date !== 'all') {
        const ev = new Date(e.date);
        if (f.date === 'upcoming' && ev < today) return false;
        if (f.date === 'past' && ev >= today) return false;
      }
      return true;
    });
    if (f.date === 'upcoming') {
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (f.date === 'past') {
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    return filtered;
  }
  if (type === 'blogs') {
    return items.filter((b) => {
      if (!matchesText('blogs', b, f.q)) return false;
      if (f.category && b.category !== f.category) return false;
      if (f.author) {
        const name = b.author_name || (b.author && b.author.name) || '';
        if (!name.toLowerCase().includes(f.author.toLowerCase())) return false;
      }
      return true;
    }).sort((a, b) => (f.sort === 'oldest' ? blogTs(a) - blogTs(b) : blogTs(b) - blogTs(a)));
  }
  if (type === 'creators') {
    return items.filter((c) => {
      if (!matchesText('creators', c, f.q)) return false;
      if (f.designation && f.designation.length && !f.designation.includes(c.designation)) return false;
      if (f.sort === 'testimonials' && !((c.stats && c.stats.testimonialsGiven) > 0)) return false;
      return true;
    }).sort((a, b) => {
      if (f.sort === 'name-desc') return String(b.name).localeCompare(String(a.name));
      if (f.sort === 'testimonials') return ((b.stats && b.stats.testimonialsGiven) || 0) - ((a.stats && a.stats.testimonialsGiven) || 0);
      return String(a.name).localeCompare(String(b.name));
    });
  }
  return items;
}

// Returns the appropriate card builder function for the given source type.
function dispatchBuilder(type) {
  switch (type) {
    case 'events': return buildEventCard;
    case 'blogs': return buildBlogCard;
    case 'creators': return buildCreatorCard;
    case 'testimonials': return buildTestimonialCard;
    default: return null;
  }
}

// Fetches data and renders the card grid with optional filtering and pagination.
async function hydrateFromData(block, type, cfg, opts) {
  const { Utils } = window.AdobeSphere;
  const data = await Utils.fetchData(type === 'events' ? 'campaigns' : type);

  let items = Array.isArray(data) ? data.slice() : [];

  if (type === 'creators') {
    const localCreators = window.AdobeSphere.Storage.getAllLocalCreators?.() || [];
    const existingIds = new Set(items.map((c) => c.id));
    localCreators.forEach((lc) => { if (!existingIds.has(lc.id)) items.push(lc); });
  }

  if (type === 'blogs') {
    const userBlogs = window.AdobeSphere.Storage.getAllUserBlogs?.() || [];
    const existingIds = new Set(items.map((b) => b.id));
    userBlogs.forEach((ub) => { if (!existingIds.has(ub.id)) items.push(ub); });
  }

  if (!items.length) {
    block.innerHTML = `<p class="cards-empty">${escapeHtml(cfg.empty || `No ${type} available.`)}</p>`;
    return;
  }

  let idsFromList = null;
  if (cfg.ids_from) {
    const [refSource, refField] = cfg.ids_from.split('.').map((s) => s.trim());
    const refFile = refSource === 'events' ? 'campaigns' : refSource;
    const refData = await Utils.fetchData(refFile);
    const urlId = (() => {
      const q = new URLSearchParams(window.location.search).get('id');
      if (q) return q;
      const seg = window.location.pathname.split('/').filter(Boolean);
      return seg.length >= 2 ? decodeURIComponent(seg[seg.length - 1]) : null;
    })();
    let refEntity = urlId && Array.isArray(refData) && refData.find((it) => it.id === urlId);
    if (!refEntity && refSource === 'creators' && urlId) {
      refEntity = window.AdobeSphere.Storage.getLocalCreator?.(urlId) || null;
    }
    if (refEntity) idsFromList = parseIdList(refEntity[refField]);
  }

  if (cfg.ids) {
    const ids = cfg.ids.split(',').map((s) => s.trim()).filter(Boolean);
    items = ids.map((id) => items.find((it) => it.id === id)).filter(Boolean);
  } else if (idsFromList) {
    const remoteItems = idsFromList.map((id) => items.find((it) => it.id === id)).filter(Boolean);
    if (type === 'blogs') {
      const foundIds = new Set(remoteItems.map((b) => b.id));
      const missing = idsFromList.filter((id) => !foundIds.has(id));
      if (missing.length) {
        const urlId2 = (() => {
          const q = new URLSearchParams(window.location.search).get('id');
          if (q) return q;
          const seg = window.location.pathname.split('/').filter(Boolean);
          return seg.length >= 2 ? decodeURIComponent(seg[seg.length - 1]) : null;
        })();
        const localBlogs = window.AdobeSphere.Storage.getLocalUserBlogs?.(urlId2) || [];
        missing.forEach((id) => {
          const lb = localBlogs.find((b) => b.id === id);
          if (lb) remoteItems.push(lb);
        });
      }
    }
    items = remoteItems;
  } else {
    items = applyFilter(items, cfg.filter);
  }

  const pageSize = parseInt(cfg.pagination, 10) || 0;
  const builder = dispatchBuilder(type);

  if (!pageSize && !cfg.pagination) {
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

  const grid = document.createElement('div');
  grid.className = `cards-grid grid-${type}`;
  if (opts.horizontal) grid.classList.add('horizontal');

  const pagiHost = document.createElement('div');
  pagiHost.className = 'explore-pagination';

  block.append(grid);
  if (pageSize) block.append(pagiHost);

  const urlParams = new URLSearchParams(window.location.search);
  const state = {
    page: 1,
    q: urlParams.get('q') || '',
    f: type === 'events'
      ? { category: urlParams.get('category') || '', location: [], date: urlParams.get('date') || 'all' }
      : type === 'blogs'
        ? { category: urlParams.get('category') || '', author: '', sort: urlParams.get('sort') || 'newest' }
        : { designation: [], sort: urlParams.get('sort') || 'name-asc' },
  };

  let isActive = false;

  // Finds the tab panel section that contains this block.
  const findTabPanel = () => {
    let parent = block.closest('.section');
    while (parent) {
      if (parent.id && parent.id.startsWith('tabpanel-')) {
        return parent;
      }
      parent = parent.nextElementSibling;
    }
    return null;
  };

  const tabPanel = findTabPanel();

  // Returns the active tab id from the tab panel's id attribute.
  const getActiveTab = () => {
    if (tabPanel) {
      return tabPanel.id.replace('tabpanel-', '');
    }
    return null;
  };

  // Updates whether this block's tab is currently active.
  const updateVisibility = () => {
    isActive = getActiveTab() === type;
  };

  updateVisibility();

  // Re-renders the card grid from the current filter and pagination state.
  function renderGrid() {
    const filtered = getFilteredItems(type, items, { q: state.q, ...state.f });

    let slice = filtered;
    if (pageSize) {
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      if (state.page > totalPages) state.page = totalPages;
      const start = (state.page - 1) * pageSize;
      slice = filtered.slice(start, start + pageSize);

      pagiHost.innerHTML = '';
      if (state.page > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'button ghost';
        prevBtn.textContent = 'Previous';
        prevBtn.addEventListener('click', () => { state.page -= 1; renderGrid(); });
        pagiHost.append(prevBtn);
      }
      const pageLabel = document.createElement('span');
      pageLabel.className = 'explore-page';
      pageLabel.textContent = `Page ${state.page} of ${totalPages} (${filtered.length} result${filtered.length === 1 ? '' : 's'})`;
      pagiHost.append(pageLabel);
      if (state.page < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'button ghost';
        nextBtn.textContent = 'Next';
        nextBtn.addEventListener('click', () => { state.page += 1; renderGrid(); });
        pagiHost.append(nextBtn);
      }
    } else if (cfg.limit) {
      slice = filtered.slice(0, parseInt(cfg.limit, 10));
    }

    grid.innerHTML = '';
    if (!slice.length) {
      grid.innerHTML = `<p class="cards-empty">${escapeHtml(cfg.empty || 'No results match your filters.')}</p>`;
    } else {
      slice.forEach((item) => {
        const card = builder(item, opts);
        card.classList.add('revealed');
        grid.append(card);
      });
    }

    window.dispatchEvent(new CustomEvent('adobesphere:search:results', {
      detail: { type, count: filtered.length, quality: qualityScore(type, filtered, state.q), q: state.q },
    }));
  }

  window.addEventListener('adobesphere:filter', (e) => {
    if (e.detail.source !== type) return;
    state.f = { ...e.detail.state };
    state.page = 1;
    renderGrid();
  });

  window.addEventListener('adobesphere:switchtab', (e) => {
    const newTab = e.detail;
    if (newTab === type && !isActive) {
      isActive = true;
      renderGrid();
    } else if (newTab !== type && isActive) {
      isActive = false;
    }
  });

  let searchDebounce;
  window.addEventListener('adobesphere:search', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      state.q = e.detail || '';
      state.page = 1;
      renderGrid();
    }, 50);
  });

  renderGrid();
}

// Wraps authored block rows into a static card grid.
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

const USER_EMPTY = {
  'user-blogs': "You haven't published any blogs yet.",
  'saved-blogs': "You haven't saved any blogs yet.",
  'saved-events': "You haven't saved any events yet.",
  'registered-events': "You haven't registered for any events yet.",
};

// Gets or creates the .card-actions element inside a card body.
function getOrCreateActions(article) {
  const body = article.querySelector('.card-body');
  if (!body) return null;
  let actions = article.querySelector('.card-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'card-actions';
    body.append(actions);
  } else {
    actions.textContent = '';
  }
  return actions;
}

// Creates a button element with the given class and text.
function makeBtn(cls, text) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = cls;
  btn.textContent = text;
  return btn;
}

// Creates an anchor element with the given class, href, and text.
function makeLink(cls, href, text) {
  const a = document.createElement('a');
  a.className = cls;
  a.href = href;
  a.textContent = text;
  return a;
}

// Renders the user's own saved, registered, or published item cards.
async function hydrateUserSource(block, source, cfg, opts) {
  const { Storage, Utils } = window.AdobeSphere;

  if (!Storage.isLoggedIn()) {
    const p = document.createElement('p');
    p.className = 'cards-empty';
    p.textContent = 'Please sign in to view this section.';
    block.append(p);
    return;
  }

  const gridClass = { 'user-blogs': 'blogs', 'saved-blogs': 'blogs', 'saved-events': 'events', 'registered-events': 'events' }[source] || 'items';
  const grid = document.createElement('div');
  grid.className = `cards-grid grid-${gridClass}`;
  if (opts.horizontal) grid.classList.add('horizontal');
  block.append(grid);

  const emptyMsg = cfg.empty || USER_EMPTY[source] || 'Nothing here yet.';

  // Renders the empty state message into the grid.
  function showEmpty() {
    grid.textContent = '';
    const p = document.createElement('p');
    p.className = 'cards-empty';
    p.textContent = emptyMsg;
    grid.append(p);
  }

  // Shows the empty state if no cards remain in the grid.
  function checkEmpty() {
    if (!grid.querySelector('.card')) showEmpty();
  }

  if (source === 'user-blogs') {
    const blogs = Storage.getUserBlogs();
    if (!blogs.length) { showEmpty(); return; }

    blogs.forEach((b) => {
      const article = buildBlogCard(b, { withSave: false, withActions: false });
      const actions = getOrCreateActions(article);
      if (actions) {
        const editLink = makeLink('button ghost', `/blog-editor?id=${encodeURIComponent(b.id)}`, 'Edit');
        const delBtn = makeBtn('button danger', 'Delete');
        delBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (confirm('Delete this blog? This cannot be undone.')) { // eslint-disable-line no-restricted-globals, no-alert
            Storage.deleteUserBlog(b.id);
            Utils.toast('Blog deleted.', 'success');
            article.remove();
            checkEmpty();
          }
        });
        actions.append(editLink, delBtn);
      }
      grid.append(article);
    });
    return;
  }

  if (source === 'saved-blogs') {
    const ids = Storage.getSaved('blogs');
    if (!ids.length) { showEmpty(); return; }

    const data = await Utils.fetchData('blogs').catch(() => []);
    ids.forEach((id) => {
      const found = data.find((b) => String(b.id) === String(id))
        || Storage.getUserBlogs().find((b) => String(b.id) === String(id));
      if (!found) return;
      const article = buildBlogCard(found, { withSave: false, withActions: false });
      const actions = getOrCreateActions(article);
      if (actions) {
        const unsaveBtn = makeBtn('button ghost', 'Unsave');
        unsaveBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          Storage.toggleSaved('blogs', String(id));
          Utils.toast('Removed from saved.', 'success');
          article.remove();
          checkEmpty();
        });
        actions.append(unsaveBtn);
      }
      grid.append(article);
    });
    if (!grid.querySelector('.card')) showEmpty();
    return;
  }

  if (source === 'saved-events') {
    const ids = Storage.getSaved('events');
    if (!ids.length) { showEmpty(); return; }

    const data = await Utils.fetchData('campaigns').catch(() => []);
    ids.forEach((id) => {
      const found = data.find((e) => String(e.id) === String(id));
      if (!found) return;
      const article = buildEventCard(found, { withSave: false, withActions: false });
      const actions = getOrCreateActions(article);
      if (actions) {
        const unsaveBtn = makeBtn('button ghost', 'Unsave');
        unsaveBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          Storage.toggleSaved('events', String(id));
          Utils.toast('Event removed from saved.', 'success');
          article.remove();
          checkEmpty();
        });
        actions.append(unsaveBtn);
      }
      grid.append(article);
    });
    if (!grid.querySelector('.card')) showEmpty();
    return;
  }

  if (source === 'registered-events') {
    const regs = Storage.getRegistrations();
    if (!regs.length) { showEmpty(); return; }

    const data = await Utils.fetchData('campaigns').catch(() => []);
    regs.forEach((reg) => {
      const found = data.find((e) => String(e.id) === String(reg.eventId));
      if (!found) return;
      const article = buildEventCard(found, { withSave: false, withActions: false });
      const actions = getOrCreateActions(article);
      if (actions) {
        const cancelBtn = makeBtn('button ghost', 'Cancel Registration');
        cancelBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          Storage.cancelRegistration(reg.eventId);
          Utils.toast('Registration cancelled.', 'success');
          article.remove();
          checkEmpty();
        });
        actions.append(cancelBtn);
      }
      grid.append(article);
    });
    if (!grid.querySelector('.card')) showEmpty();
  }
}

// Reads label, source, href, and CTA text from each row of a stats block.
function readStatsRows(block) {
  const rows = [];
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    rows.push({
      label: cells[0] ? cells[0].textContent.trim() : '',
      source: cells[1] ? cells[1].textContent.trim() : '',
      href: cells[2] ? cells[2].textContent.trim() : '',
      cta: cells[3] ? cells[3].textContent.trim() : '',
    });
  });
  return rows;
}

// Resolves a stat count from a data source name, literal number, or localStorage.
async function resolveStatTarget(source) {
  if (!source) return 0;
  const literal = parseInt(source, 10);
  if (!Number.isNaN(literal) && /^\d+$/.test(source.trim())) return literal;

  if (source === 'users') {
    try { return Object.keys(JSON.parse(localStorage.getItem('adobesphere_users') || '{}')).length; }
    catch { return 0; }
  }

  if (source === 'creators') {
    const data = await window.AdobeSphere.Utils.fetchData('creators');
    const jsonCount = Array.isArray(data) ? data.length : 0;
    const localCount = window.AdobeSphere.Storage.getLocalCreatorsCount
      ? window.AdobeSphere.Storage.getLocalCreatorsCount()
      : 0;
    return jsonCount + localCount;
  }

  if (source === 'testimonials') {
    const urlId = new URLSearchParams(window.location.search).get('id')
      || decodeURIComponent(window.location.pathname.split('/').filter(Boolean).pop() || '');
    if (!urlId) return 0;
    const data = await window.AdobeSphere.Utils.fetchData('creators');
    if (!Array.isArray(data)) return 0;
    const creator = data.find((c) => c.id === urlId);
    const stats = (creator && creator.stats) || {};
    return parseInt(stats.testimonialsGiven || (creator && creator.stats_testimonialsGiven) || 0, 10) || 0;
  }

  if (source === 'blogs') {
    const data = await window.AdobeSphere.Utils.fetchData('blogs');
    const jsonCount = Array.isArray(data) ? data.length : 0;
    const userBlogsCount = window.AdobeSphere.Storage.getAllUserBlogs?.()?.length || 0;
    return jsonCount + userBlogsCount;
  }

  const file = source === 'events' ? 'campaigns' : source;
  const data = await window.AdobeSphere.Utils.fetchData(file);
  return Array.isArray(data) ? data.length : 0;
}

// Animates a number counter from 0 to target over ~1200ms with eased easing.
function countUp(el, target) {
  const duration = 1200;
  const start = performance.now();
  const from = 0;
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) ** 3;
    el.textContent = String(Math.round(from + (target - from) * eased));
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = String(target);
  };
  requestAnimationFrame(step);
}

// Renders the `stats` variant — a grid of animated counter boxes that trigger on scroll.
async function hydrateStats(block) {
  const rows = readStatsRows(block);

  // Resolve all targets first so DOM insertion preserves the authored row order.
  const targets = await Promise.all(rows.map((r) => resolveStatTarget(r.source)));

  block.textContent = '';
  const grid = document.createElement('div');
  grid.className = 'stats-grid';
  block.append(grid);

  const boxes = rows.map((r, i) => {
    const box = document.createElement('div');
    box.className = 'stats-box reveal';
    box.dataset.target = String(targets[i]);
    box.innerHTML = `
      <span class="stats-number">0</span>
      <p class="stats-label">${escapeHtml(r.label)}</p>
      ${r.href ? `<a class="stats-link" href="${escapeHtml(r.href)}">${escapeHtml(r.cta || 'View →')}</a>` : ''}`;
    grid.append(box);
    return box;
  });

  // Single observer drives both the fade-in (`.visible`) and the count-up animation.
  // Self-contained so visibility never depends on the global initRevealObserver
  // catching late-added elements.
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const box = e.target;
      box.classList.add('visible');
      const target = parseInt(box.dataset.target, 10) || 0;
      countUp(box.querySelector('.stats-number'), target);
      observer.unobserve(box);
    });
  }, { threshold: 0.2 });

  boxes.forEach((box) => observer.observe(box));
}

// Dispatches to the correct hydration path based on the source configuration.
export default async function decorate(block) {
  // Stats variant uses a different row schema (label | source | href | cta) and
  // its own renderer — short-circuit before readConfig and the normal cards flow.
  if (block.classList.contains('stats')) {
    await hydrateStats(block);
    return;
  }

  const variants = classify(block);
  const cfg = readConfig(block);

  if (cfg.title) {
    const h2 = document.createElement('h2');
    h2.className = 'section-heading';
    h2.textContent = cfg.title;
    block.parentElement.insertBefore(h2, block);
  }

  const source = (cfg.source || variants.type || '').toLowerCase();
  const opts = { withSave: variants.withSave, withActions: variants.withActions, horizontal: variants.horizontal };

  const USER_SOURCES = ['saved-events', 'saved-blogs', 'registered-events', 'user-blogs'];

  if (USER_SOURCES.includes(source)) {
    block.dataset.source = source;
    await hydrateUserSource(block, source, cfg, opts);
  } else if (['events', 'blogs', 'creators'].includes(source)) {
    block.dataset.source = source;
    await hydrateFromData(block, source, cfg, opts);
  } else if (variants.type === 'testimonials' || block.children.length > 0) {
    if (variants.type === 'testimonials' && block.children.length) {
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
