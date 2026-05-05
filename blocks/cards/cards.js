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
  // `Title | Featured Events`, `Empty | No events available`.
  const cfg = {};
  const rows = [...block.children];
  rows.forEach((row) => {
    if (row.children.length !== 2) return;
    const key = row.children[0].textContent.trim().toLowerCase();
    const value = row.children[1].textContent.trim();
    if (['source', 'filter', 'limit', 'title', 'empty', 'ids'].includes(key)) {
      cfg[key] = value;
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

  const grid = document.createElement('div');
  grid.className = `cards-grid grid-${type}`;
  if (opts.horizontal) grid.classList.add('horizontal');
  block.append(grid);

  if (!Array.isArray(data) || !data.length) {
    grid.innerHTML = `<p class="cards-empty">${escapeHtml(cfg.empty || `No ${type} available.`)}</p>`;
    return;
  }

  let items = data.slice();

  // explicit ID list wins over filter+limit.
  if (cfg.ids) {
    const ids = cfg.ids.split(',').map((s) => s.trim()).filter(Boolean);
    items = ids.map((id) => items.find((it) => it.id === id)).filter(Boolean);
  } else {
    items = applyFilter(items, cfg.filter);
    if (cfg.limit) items = items.slice(0, parseInt(cfg.limit, 10) || items.length);
  }

  if (!items.length) {
    grid.innerHTML = `<p class="cards-empty">${escapeHtml(cfg.empty || `No ${type} match.`)}</p>`;
    return;
  }

  const builder = dispatchBuilder(type);
  if (!builder) return;
  items.forEach((item) => grid.append(builder(item, opts)));
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
