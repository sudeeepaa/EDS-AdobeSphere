/**
 * AdobeSphere explore block.
 *
 * Renders three tabs (Events / Blogs / Creators) with their own filter UIs,
 * grids, and pagination. Driven entirely by the JSON data layer:
 *   /data/campaigns.json, /data/blogs.json, /data/creators.json
 *
 * URL params honoured: ?tab=events|blogs|creators, ?q=text, ?category=name
 *
 * Authoring contract:
 *   The block has zero authored content. The author writes a single row with
 *   `Page Size | 9` (optional). Everything else is configured here.
 */

const PAGE_SIZE_DEFAULT = 9;
const TABS = ['events', 'blogs', 'creators'];

function urlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function setUrlParam(name, value) {
  const params = new URLSearchParams(window.location.search);
  if (value) params.set(name, value); else params.delete(name);
  const newUrl = `${window.location.pathname}?${params.toString()}`.replace(/\?$/, '');
  window.history.replaceState({}, '', newUrl);
}

function escapeHtml(v) { return window.AdobeSphere.Utils.escapeHtml(v); }

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
  const lower = q.toLowerCase();
  const haystack = JSON.stringify(item).toLowerCase();
  return haystack.includes(lower);
}

function filterEvents(items, f) {
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

function filterBlogs(items, f) {
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

function filterCreators(items, f) {
  return items.filter((c) => {
    if (!matchesText(c, f.q)) return false;
    if (f.designation && f.designation.length && !f.designation.includes(c.designation)) return false;
    return true;
  }).sort((a, b) => {
    if (f.sort === 'name-desc') return String(b.name).localeCompare(String(a.name));
    if (f.sort === 'testimonials') {
      return ((b.stats && b.stats.testimonialsGiven) || 0) - ((a.stats && a.stats.testimonialsGiven) || 0);
    }
    return String(a.name).localeCompare(String(b.name));
  });
}

/* ─── card builders (lightweight, mirror /blocks/cards) ─── */

function eventCardHtml(e) {
  const Utils = window.AdobeSphere.Utils;
  const thumb = Utils.normaliseAsset(e.thumbnail, '/icons/card-fallback.svg');
  const loc = [e.location && e.location.city, e.location && e.location.state].filter(Boolean).join(', ');
  return `<article class="card card-event reveal">
    <a class="card-link" href="/events/${encodeURIComponent(e.id)}" aria-label="${escapeHtml(e.title)}"></a>
    <img class="card-image" src="${escapeHtml(thumb)}" alt="${escapeHtml(e.title)}" loading="lazy">
    <div class="card-body">
      <span class="badge">${escapeHtml(e.category || 'Event')}</span>
      <h3 class="card-title">${escapeHtml(e.title || '')}</h3>
      <div class="card-meta">
        <span>${escapeHtml(Utils.formatShortDate(e.date))}</span>
        <span>${escapeHtml(loc || 'TBD')}</span>
      </div>
      <p class="card-excerpt">${escapeHtml(e.shortDescription || '')}</p>
    </div>
  </article>`;
}

function blogCardHtml(b) {
  const Utils = window.AdobeSphere.Utils;
  const cover = Utils.normaliseAsset(b.coverImage, '/icons/card-fallback.svg');
  const avatar = Utils.normaliseAsset(b.author && b.author.avatar, '/icons/user-default.svg');
  const author = (b.author && b.author.name) || 'Author';
  return `<article class="card card-blog reveal">
    <a class="card-link" href="/blog/${encodeURIComponent(b.id)}" aria-label="${escapeHtml(b.title)}"></a>
    <img class="card-image" src="${escapeHtml(cover)}" alt="${escapeHtml(b.title)}" loading="lazy">
    <div class="card-body">
      <span class="badge outline">${escapeHtml(b.category || 'Article')}</span>
      <h3 class="card-title">${escapeHtml(b.title || '')}</h3>
      <div class="card-meta">
        <span class="card-author"><img src="${escapeHtml(avatar)}" alt="${escapeHtml(author)}">${escapeHtml(author)}</span>
        <span>${escapeHtml(Utils.formatShortDate(b.publishedDate))}</span>
      </div>
      <p class="card-excerpt">${escapeHtml(b.excerpt || '')}</p>
    </div>
  </article>`;
}

function creatorCardHtml(c) {
  const Utils = window.AdobeSphere.Utils;
  const avatar = Utils.normaliseAsset(c.avatar, '/icons/user-default.svg');
  const bio = Utils.truncate(c.bio || c.fullBio || '', 100);
  return `<article class="card card-creator reveal">
    <a class="card-link" href="/creator-profile/${encodeURIComponent(c.id)}" aria-label="${escapeHtml(c.name)}"></a>
    <div class="card-body">
      <img class="card-avatar" src="${escapeHtml(avatar)}" alt="${escapeHtml(c.name)}" loading="lazy">
      <h3 class="card-title">${escapeHtml(c.name || '')}</h3>
      <p class="text-muted">${escapeHtml(c.designation || '')}</p>
      <p class="card-excerpt">${escapeHtml(bio)}</p>
    </div>
  </article>`;
}

/* ─── main decoration ─── */

export default async function decorate(block) {
  // Read optional Page Size config row.
  let pageSize = PAGE_SIZE_DEFAULT;
  [...block.children].forEach((row) => {
    if (row.children.length === 2 && row.children[0].textContent.trim().toLowerCase() === 'page size') {
      pageSize = parseInt(row.children[1].textContent.trim(), 10) || PAGE_SIZE_DEFAULT;
      row.remove();
    }
  });
  // Drop everything else — explore renders its own UI.
  block.textContent = '';

  // Skeleton.
  block.innerHTML = `
    <div class="explore-tabs" role="tablist" aria-label="Explore content tabs">
      <button type="button" class="explore-tab active" data-tab="events" role="tab" aria-selected="true">Events &amp; Campaigns</button>
      <button type="button" class="explore-tab" data-tab="blogs" role="tab" aria-selected="false">Blogs &amp; Articles</button>
      <button type="button" class="explore-tab" data-tab="creators" role="tab" aria-selected="false">Creators</button>
    </div>
    <div class="explore-search-row">
      <input type="search" id="explore-q" class="form-input" placeholder="Search across events, blogs, creators…" aria-label="Search">
      <button type="button" class="button ghost" id="explore-clear">Clear</button>
    </div>
    <div class="explore-filters" data-filters></div>
    <div class="explore-grid cards-grid" data-grid></div>
    <div class="explore-pagination" data-pagination></div>`;

  // State.
  const state = {
    tab: TABS.includes(urlParam('tab')) ? urlParam('tab') : 'events',
    q: urlParam('q') || '',
    category: urlParam('category') || '',
    page: 1,
    pageSize,
    data: { events: [], blogs: [], creators: [] },
    filter: {
      events: { q: '', category: '', location: [], date: 'all' },
      blogs: { q: '', category: '', author: '', sort: 'newest' },
      creators: { q: '', designation: [], sort: 'name-asc' },
    },
  };

  // Hydrate URL params into the active tab's filter.
  state.filter[state.tab].q = state.q;
  if (state.category) state.filter[state.tab].category = state.category;

  // Load all three datasets in parallel.
  const Utils = window.AdobeSphere.Utils;
  const [campaigns, blogs, creators] = await Promise.all([
    Utils.fetchData('campaigns'),
    Utils.fetchData('blogs'),
    Utils.fetchData('creators'),
  ]);
  state.data.events = Array.isArray(campaigns) ? campaigns : [];
  state.data.blogs = Array.isArray(blogs) ? blogs : [];
  state.data.creators = Array.isArray(creators) ? creators : [];

  const grid = block.querySelector('[data-grid]');
  const pagi = block.querySelector('[data-pagination]');
  const filterHost = block.querySelector('[data-filters]');
  const qInput = block.querySelector('#explore-q');
  qInput.value = state.q;

  function renderFilters() {
    const tab = state.tab;
    const f = state.filter[tab];
    let html = '';

    if (tab === 'events') {
      const cats = uniqueValues(state.data.events, (e) => e.category);
      const cities = uniqueValues(state.data.events, (e) => e.location && e.location.city);
      html += `
        <select class="form-input" data-events-cat>
          <option value="">All Categories</option>
          ${cats.map((c) => `<option value="${escapeHtml(c)}"${f.category === c ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('')}
        </select>
        <fieldset class="explore-radios" aria-label="Date">
          <label><input type="radio" name="evt-date" value="all"${f.date === 'all' ? ' checked' : ''}> All</label>
          <label><input type="radio" name="evt-date" value="upcoming"${f.date === 'upcoming' ? ' checked' : ''}> Upcoming</label>
          <label><input type="radio" name="evt-date" value="past"${f.date === 'past' ? ' checked' : ''}> Past</label>
        </fieldset>
        <fieldset class="explore-checkboxes" aria-label="Location">
          <legend>Location</legend>
          ${cities.map((c) => `<label><input type="checkbox" value="${escapeHtml(c)}"${f.location.includes(c) ? ' checked' : ''}> ${escapeHtml(c)}</label>`).join('')}
        </fieldset>`;
    } else if (tab === 'blogs') {
      const cats = uniqueValues(state.data.blogs, (b) => b.category);
      html += `
        <select class="form-input" data-blogs-cat>
          <option value="">All Categories</option>
          ${cats.map((c) => `<option value="${escapeHtml(c)}"${f.category === c ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('')}
        </select>
        <input type="text" class="form-input" placeholder="Search by author" data-blogs-author value="${escapeHtml(f.author)}">
        <select class="form-input" data-blogs-sort>
          <option value="newest"${f.sort === 'newest' ? ' selected' : ''}>Newest</option>
          <option value="oldest"${f.sort === 'oldest' ? ' selected' : ''}>Oldest</option>
        </select>`;
    } else {
      const designations = uniqueValues(state.data.creators, (c) => c.designation);
      html += `
        <select class="form-input" data-creators-sort>
          <option value="name-asc"${f.sort === 'name-asc' ? ' selected' : ''}>Name A–Z</option>
          <option value="name-desc"${f.sort === 'name-desc' ? ' selected' : ''}>Name Z–A</option>
          <option value="testimonials"${f.sort === 'testimonials' ? ' selected' : ''}>Testimonials</option>
        </select>
        <fieldset class="explore-checkboxes" aria-label="Designation">
          <legend>Designation</legend>
          ${designations.map((d) => `<label><input type="checkbox" value="${escapeHtml(d)}"${f.designation.includes(d) ? ' checked' : ''}> ${escapeHtml(d)}</label>`).join('')}
        </fieldset>`;
    }

    filterHost.innerHTML = html;
    bindFilterEvents();
  }

  function bindFilterEvents() {
    const tab = state.tab;
    const f = state.filter[tab];

    if (tab === 'events') {
      filterHost.querySelector('[data-events-cat]').addEventListener('change', (e) => {
        f.category = e.target.value;
        state.page = 1;
        render();
      });
      filterHost.querySelectorAll('[name="evt-date"]').forEach((r) => r.addEventListener('change', (e) => {
        f.date = e.target.value;
        state.page = 1;
        render();
      }));
      filterHost.querySelectorAll('.explore-checkboxes input').forEach((c) => c.addEventListener('change', () => {
        f.location = [...filterHost.querySelectorAll('.explore-checkboxes input:checked')].map((x) => x.value);
        state.page = 1;
        render();
      }));
    } else if (tab === 'blogs') {
      filterHost.querySelector('[data-blogs-cat]').addEventListener('change', (e) => { f.category = e.target.value; state.page = 1; render(); });
      filterHost.querySelector('[data-blogs-author]').addEventListener('input', (e) => { f.author = e.target.value; state.page = 1; render(); });
      filterHost.querySelector('[data-blogs-sort]').addEventListener('change', (e) => { f.sort = e.target.value; state.page = 1; render(); });
    } else {
      filterHost.querySelector('[data-creators-sort]').addEventListener('change', (e) => { f.sort = e.target.value; state.page = 1; render(); });
      filterHost.querySelectorAll('.explore-checkboxes input').forEach((c) => c.addEventListener('change', () => {
        f.designation = [...filterHost.querySelectorAll('.explore-checkboxes input:checked')].map((x) => x.value);
        state.page = 1;
        render();
      }));
    }
  }

  function getFilteredItems() {
    const tab = state.tab;
    const f = { ...state.filter[tab], q: state.q };
    if (tab === 'events') return filterEvents(state.data.events, f);
    if (tab === 'blogs') return filterBlogs(state.data.blogs, f);
    return filterCreators(state.data.creators, f);
  }

  function render() {
    setUrlParam('tab', state.tab);
    setUrlParam('q', state.q);
    setUrlParam('category', state.filter[state.tab].category || '');

    const items = getFilteredItems();
    const totalPages = Math.max(1, Math.ceil(items.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * state.pageSize;
    const slice = items.slice(start, start + state.pageSize);

    if (!slice.length) {
      grid.innerHTML = '<p class="cards-empty">No results match your filters.</p>';
    } else {
      const builder = state.tab === 'events' ? eventCardHtml : state.tab === 'blogs' ? blogCardHtml : creatorCardHtml;
      grid.innerHTML = slice.map(builder).join('');
    }
    grid.classList.remove('grid-events', 'grid-blogs', 'grid-creators');
    grid.classList.add(`grid-${state.tab}`);

    pagi.innerHTML = `
      <button type="button" class="button ghost" data-prev ${state.page === 1 ? 'disabled' : ''}>Prev</button>
      <span class="explore-page">Page ${state.page} of ${totalPages} (${items.length} result${items.length === 1 ? '' : 's'})</span>
      <button type="button" class="button ghost" data-next ${state.page >= totalPages ? 'disabled' : ''}>Next</button>`;
    pagi.querySelector('[data-prev]').addEventListener('click', () => { if (state.page > 1) { state.page -= 1; render(); } });
    pagi.querySelector('[data-next]').addEventListener('click', () => { if (state.page < totalPages) { state.page += 1; render(); } });

    block.querySelectorAll('.explore-tab').forEach((t) => {
      const active = t.dataset.tab === state.tab;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  // Tab clicks.
  block.querySelectorAll('.explore-tab').forEach((t) => {
    t.addEventListener('click', () => {
      state.tab = t.dataset.tab;
      state.page = 1;
      renderFilters();
      render();
    });
  });

  // Search input — global filter, applies to whichever tab is active.
  let searchTimer = null;
  qInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = qInput.value.trim();
      state.page = 1;
      render();
    }, 200);
  });

  block.querySelector('#explore-clear').addEventListener('click', () => {
    qInput.value = '';
    state.q = '';
    state.filter.events = { q: '', category: '', location: [], date: 'all' };
    state.filter.blogs = { q: '', category: '', author: '', sort: 'newest' };
    state.filter.creators = { q: '', designation: [], sort: 'name-asc' };
    state.page = 1;
    renderFilters();
    render();
  });

  renderFilters();
  render();
}
