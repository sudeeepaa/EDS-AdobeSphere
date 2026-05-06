/**
 * AdobeSphere detail-section block — the reusable sub-section for detail pages.
 *
 * Variants (block class):
 *   • overview  → header + 1-3 fact rows + body paragraph (event/blog overview).
 *   • agenda    → time | activity | description timeline (event schedule).
 *   • people    → presenter/speaker/host avatar grid (event detail).
 *   • quote     → centred blockquote (event closing / creator featured).
 *   • comments  → discussion section with composer + thread (blog detail).
 *   • bio       → author/creator bio strip with avatar + paragraphs.
 *   • reach-out → email + LinkedIn link buttons (creator contact zone).
 *
 * Author writes a minimal table; the block hydrates dynamic fields from the
 * data layer when an `Id Source | events|blogs|creators` row is present.
 */

function readConfig(block) {
  const cfg = {};
  [...block.children].forEach((row) => {
    if (row.children.length !== 2) return;
    const k = row.children[0].textContent.trim().toLowerCase();
    const v = row.children[1].textContent.trim();
    if (['title', 'id source', 'id', 'empty'].includes(k)) {
      cfg[k.replace(' ', '_')] = v;
      row.remove();
    }
  });
  return cfg;
}

function escapeHtml(v) { return window.AdobeSphere.Utils.escapeHtml(v); }

/* Pull the entity id from URL (?id=…), the last URL segment, or a meta tag. */
function getEntityId() {
  const fromQuery = new URLSearchParams(window.location.search).get('id');
  if (fromQuery) return fromQuery;
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments.length >= 2) return decodeURIComponent(segments[segments.length - 1]);
  const meta = document.querySelector('meta[name="entity-id"]');
  return meta ? meta.content : null;
}

async function loadEntity(source, id) {
  const file = source === 'events' ? 'campaigns' : source;
  const data = await window.AdobeSphere.Utils.fetchData(file);
  if (!Array.isArray(data)) return null;
  return data.find((it) => it.id === id) || null;
}

/* ─── overview ─── */

function renderOverview(block, cfg, entity, headingText) {
  block.innerHTML = `
    <h2 class="section-heading">${escapeHtml(headingText || cfg.title || 'Overview')}</h2>
    <div class="detail-overview"></div>`;
  const root = block.querySelector('.detail-overview');
  if (!entity) { root.innerHTML = `<p>${escapeHtml(cfg.empty || 'Details unavailable.')}</p>`; return; }

  const facts = [];
  if (entity.date || entity.time) {
    const Utils = window.AdobeSphere.Utils;
    const date = Utils.formatDate(entity.date);
    facts.push(['Date & Time', `${date}${entity.time ? ` · ${entity.time}` : ''}`]);
  }
  if (entity.venue) facts.push(['Venue', entity.venue]);
  if (entity.category) facts.push(['Category', entity.category]);
  if (entity.publishedDate) facts.push(['Published', window.AdobeSphere.Utils.formatDate(entity.publishedDate)]);

  const factsHtml = facts.map(([k, v]) => `<div class="detail-fact"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join('');
  const body = entity.fullDescription || entity.shortDescription || '';

  root.innerHTML = `
    ${factsHtml ? `<dl class="detail-facts">${factsHtml}</dl>` : ''}
    ${body ? `<p class="detail-body">${escapeHtml(body)}</p>` : ''}`;
}

/* ─── agenda ─── */

function renderAgenda(block, cfg, entity) {
  block.innerHTML = `
    <h2 class="section-heading">${escapeHtml(cfg.title || 'Schedule & Agenda')}</h2>
    <ol class="detail-agenda"></ol>`;
  const ol = block.querySelector('.detail-agenda');
  const items = (entity && entity.agenda) || [];
  if (!items.length) { ol.innerHTML = `<p>${escapeHtml(cfg.empty || 'Agenda will be published soon.')}</p>`; return; }

  ol.innerHTML = items.map((item) => `
    <li class="detail-agenda-item reveal">
      <div class="detail-agenda-time">${escapeHtml(item.time || '')}</div>
      <div class="detail-agenda-body">
        <h3>${escapeHtml(item.activity || '')}</h3>
        <p>${escapeHtml(item.description || '')}</p>
      </div>
    </li>`).join('');
}

/* ─── people (presenters / speakers / hosts) ─── */

function renderPeople(block, cfg, entity) {
  // The people variant reads its sub-section (presenters / guestSpeakers / hosts) from
  // a `Group | presenters|guestSpeakers|hosts` config row, defaulting to presenters.
  const group = (() => {
    const ids = ['presenters', 'speakers', 'hosts', 'guests', 'authors'];
    return ids.find((g) => block.classList.contains(g)) || 'presenters';
  })();
  const dataKey = group === 'speakers' ? 'guestSpeakers' : group;

  const people = (entity && entity[dataKey]) || [];
  block.innerHTML = `<h2 class="section-heading">${escapeHtml(cfg.title || group.charAt(0).toUpperCase() + group.slice(1))}</h2>
    <div class="detail-people"></div>`;
  const grid = block.querySelector('.detail-people');
  if (!people.length) { grid.innerHTML = `<p>${escapeHtml(cfg.empty || 'No people listed yet.')}</p>`; return; }

  const Utils = window.AdobeSphere.Utils;
  grid.innerHTML = people.map((p) => {
    const avatar = Utils.normaliseAsset(p.avatar, '/icons/user-default.svg');
    return `<article class="detail-person reveal">
      <img src="${escapeHtml(avatar)}" alt="${escapeHtml(p.name || 'Person')}" loading="lazy">
      <div class="detail-person-body">
        <h3>${escapeHtml(p.name || '')}</h3>
        <p class="text-muted">${escapeHtml(p.designation || '')}</p>
        <p>${escapeHtml(p.bio || '')}</p>
      </div>
    </article>`;
  }).join('');
}

/* ─── quote ─── */

function renderQuote(block, cfg, entity) {
  const text = (entity && (entity.closingQuote || entity.featuredQuote)) || cfg.title || '';
  block.innerHTML = text ? `<blockquote class="detail-quote">${escapeHtml(text)}</blockquote>` : '';
  if (!text) block.style.display = 'none';
}

/* ─── bio ─── */

function renderBio(block, cfg, entity) {
  if (!entity) { block.style.display = 'none'; return; }
  const Utils = window.AdobeSphere.Utils;
  const avatar = Utils.normaliseAsset(entity.avatar, '/icons/user-default.svg');
  const bio = entity.fullBio || entity.bio || '';
  const paragraphs = bio.split(/\n\n+/).map((p) => `<p>${escapeHtml(p)}</p>`).join('');

  block.innerHTML = `
    ${cfg.title ? `<h2 class="section-heading">${escapeHtml(cfg.title)}</h2>` : ''}
    <article class="detail-bio">
      <img class="detail-bio-avatar" src="${escapeHtml(avatar)}" alt="${escapeHtml(entity.name || 'Author')}" loading="lazy">
      <div class="detail-bio-body">
        <h3>${escapeHtml(entity.name || '')}</h3>
        <p class="text-muted">${escapeHtml(entity.designation || '')}</p>
        ${paragraphs}
      </div>
    </article>`;
}

/* ─── reach-out ─── */

function renderReachOut(block, cfg, entity) {
  if (!entity) { block.style.display = 'none'; return; }
  const links = [];
  if (entity.email) links.push({ label: 'Email', href: `mailto:${entity.email}` });
  if (entity.socials && entity.socials.linkedin) links.push({ label: 'LinkedIn', href: entity.socials.linkedin });
  if (!links.length) { block.style.display = 'none'; return; }

  block.innerHTML = `
    <h2 class="section-heading">${escapeHtml(cfg.title || 'Reach Out')}</h2>
    <div class="detail-reach-out">
      ${links.map((l) => `<a class="button secondary" href="${escapeHtml(l.href)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`).join('')}
    </div>`;
}

/* ─── comments ─── */

function renderComments(block, cfg) {
  const id = getEntityId();
  block.innerHTML = `
    <h2 class="section-heading">${escapeHtml(cfg.title || 'Discussion')}</h2>
    <p class="detail-comments-count text-muted"></p>
    <div class="detail-comments-composer">
      <textarea class="form-input detail-comments-input" rows="3" maxlength="500" placeholder="Share your thoughts…"></textarea>
      <small class="text-muted detail-comments-counter">0 / 500</small>
      <button type="button" class="button primary detail-comments-post">Post Comment</button>
      <p class="form-error detail-comments-error"></p>
    </div>
    <div class="detail-comments-list"></div>`;

  const Storage = window.AdobeSphere.Storage;
  const Utils = window.AdobeSphere.Utils;
  const list = block.querySelector('.detail-comments-list');
  const count = block.querySelector('.detail-comments-count');
  const input = block.querySelector('.detail-comments-input');
  const counter = block.querySelector('.detail-comments-counter');
  const errEl = block.querySelector('.detail-comments-error');

  function refresh() {
    const comments = id ? Storage.getComments(id) : [];
    count.textContent = `${comments.length} comment${comments.length === 1 ? '' : 's'}`;
    list.innerHTML = comments.map((c) => {
      const avatar = Utils.normaliseAsset(c.avatar, '/icons/user-default.svg');
      return `<article class="detail-comment">
        <img src="${escapeHtml(avatar)}" alt="">
        <div>
          <p class="detail-comment-meta"><strong>${escapeHtml(c.author || 'Anonymous')}</strong> · ${escapeHtml(Utils.formatShortDate(c.timestamp || ''))}</p>
          <p>${escapeHtml(c.text || '')}</p>
        </div>
      </article>`;
    }).join('');
  }

  input.addEventListener('input', () => { counter.textContent = `${input.value.length} / 500`; });

  block.querySelector('.detail-comments-post').addEventListener('click', () => {
    errEl.textContent = '';
    if (!Storage.isLoggedIn()) {
      errEl.textContent = 'Sign in to comment.';
      return;
    }
    const text = input.value.trim();
    if (!text) { errEl.textContent = 'Comment cannot be empty.'; return; }
    if (!id) { errEl.textContent = 'Cannot identify the article.'; return; }
    const user = Storage.getCurrentUser() || {};
    Storage.addComment(id, {
      author: user.name || 'Anonymous',
      avatar: user.avatar || '',
      text,
      timestamp: new Date().toISOString(),
    });
    input.value = '';
    counter.textContent = '0 / 500';
    refresh();
    Utils.toast('Comment posted!', 'success');
  });

  refresh();
}

/* ─── article-body (blog content array) ─── */

function renderArticleBody(block, cfg, entity) {
  if (!entity || !Array.isArray(entity.content) || !entity.content.length) {
    block.innerHTML = `<p>${escapeHtml(cfg.empty || 'Article content is unavailable.')}</p>`;
    return;
  }

  const article = document.createElement('article');
  article.className = 'detail-article';

  entity.content.forEach((blk) => {
    if (!blk || !blk.text) return;
    const text = String(blk.text);
    if (blk.type === 'heading') {
      const h2 = document.createElement('h2');
      h2.textContent = text;
      article.append(h2);
    } else if (blk.type === 'image' && blk.url) {
      const fig = document.createElement('figure');
      const img = document.createElement('img');
      img.src = window.AdobeSphere.Utils.normaliseAsset(blk.url, '');
      img.alt = blk.alt || '';
      img.loading = 'lazy';
      fig.append(img);
      if (blk.caption) {
        const cap = document.createElement('figcaption');
        cap.textContent = blk.caption;
        fig.append(cap);
      }
      article.append(fig);
    } else {
      // Default: paragraph. Splits on \n\n to support multi-para text in one block.
      text.split(/\n\n+/).forEach((para) => {
        const p = document.createElement('p');
        p.textContent = para.trim();
        if (p.textContent) article.append(p);
      });
    }
  });

  block.append(article);
}

/* ─── dispatcher ─── */

export default async function decorate(block) {
  const cfg = readConfig(block);
  const variants = [...block.classList];

  // Determine which variant is active.
  const variant = ['overview', 'agenda', 'people', 'quote', 'comments', 'bio', 'reach-out',
    'presenters', 'speakers', 'hosts', 'article-body'].find((v) => variants.includes(v)) || 'overview';

  // Hydrate entity if needed.
  let entity = null;
  if (['overview', 'agenda', 'people', 'presenters', 'speakers', 'hosts', 'quote', 'bio', 'reach-out', 'article-body'].includes(variant)) {
    // Source priority: explicit Id Source > variant class hint > URL path > default 'events'.
    const source = cfg.id_source
      || (variants.includes('blog') ? 'blogs' : null)
      || (variants.includes('creator') ? 'creators' : null)
      || (() => {
        const p = window.location.pathname;
        if (/^\/blog\//.test(p)) return 'blogs';
        if (/^\/creator-profile\//.test(p)) return 'creators';
        return 'events';
      })();
    const id = cfg.id || getEntityId();
    if (id) entity = await loadEntity(source, id);
  }

  // Bio on a blog page: the loaded entity is the blog, but renderBio expects a
  // creator-shaped object.  Cross-reference blog.author.id → creators.json so
  // the bio strip shows the author's full profile (avatar, fullBio, socials).
  if (variant === 'bio' && entity && entity.author && entity.author.id) {
    const authorId = entity.author.id;
    try {
      const creator = await loadEntity('creators', authorId);
      if (creator) entity = creator;
    } catch { /* fall back to blog.author inline fields */ }
  }

  block.textContent = '';

  if (variant === 'overview') renderOverview(block, cfg, entity, cfg.title || 'Overview');
  else if (variant === 'agenda') renderAgenda(block, cfg, entity);
  else if (['people', 'presenters', 'speakers', 'hosts'].includes(variant)) renderPeople(block, cfg, entity);
  else if (variant === 'quote') renderQuote(block, cfg, entity);
  else if (variant === 'bio') renderBio(block, cfg, entity);
  else if (variant === 'reach-out') renderReachOut(block, cfg, entity);
  else if (variant === 'comments') renderComments(block, cfg);
  else if (variant === 'article-body') renderArticleBody(block, cfg, entity);
}