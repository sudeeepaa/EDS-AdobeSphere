/**
 * AdobeSphere detail-section block — reusable sub-section for detail pages.
 * All rendering uses DOM methods. All authored copy comes from DA.live config rows.
 *
 * Variants: overview · agenda · people · quote · comments · bio · reach-out ·
 *           blog-header · article-body
 */

function readConfig(block) {
  const cfg = {};
  [...block.children].forEach((row) => {
    if (row.children.length !== 2) return;
    const k = row.children[0].textContent.trim().toLowerCase();
    const v = row.children[1].textContent.trim();
    if (['title', 'id source', 'id', 'empty', 'placeholder'].includes(k)) {
      cfg[k.replace(' ', '_')] = v;
      row.remove();
    }
  });
  return cfg;
}

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
  if (Array.isArray(data)) {
    const found = data.find((it) => it.id === id);
    if (found) return found;
  }
  if (source === 'creators') return window.AdobeSphere.Storage.getLocalCreator?.(id) || null;
  if (source === 'blogs') return window.AdobeSphere.Storage.getUserBlogById?.(id) || null;
  return null;
}

/* ── SVG helper (no innerHTML) ── */
const SVG_NS = 'http://www.w3.org/2000/svg';
function makeSvg(svgAttrs, ...children) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  Object.entries(svgAttrs).forEach(([k, v]) => svg.setAttribute(k, v));
  children.forEach(({ tag, attrs }) => {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
    svg.append(el);
  });
  return svg;
}

/* ── Shared DOM helpers ── */
function emptyP(text) {
  const p = document.createElement('p');
  p.textContent = text;
  return p;
}

function sectionH2(text) {
  const h2 = document.createElement('h2');
  h2.className = 'section-heading';
  h2.textContent = text;
  return h2;
}

/* ─── overview ─── */

function renderOverview(block, cfg, entity, headingText) {
  block.append(sectionH2(headingText || cfg.title || 'Overview'));
  const root = document.createElement('div');
  root.className = 'detail-overview';
  block.append(root);

  if (!entity) { root.append(emptyP(cfg.empty || 'Details unavailable.')); return; }

  const { Utils } = window.AdobeSphere;
  const facts = [];
  if (entity.date || entity.time) {
    facts.push(['Date & Time', `${Utils.formatDate(entity.date)}${entity.time ? ` at ${entity.time}` : ''}`]);
  }
  if (entity.venue) facts.push(['Venue', entity.venue]);
  if (entity.category) facts.push(['Category', entity.category]);
  if (entity.publishedDate) facts.push(['Published', Utils.formatDate(entity.publishedDate)]);

  if (facts.length) {
    const dl = document.createElement('dl');
    dl.className = 'detail-facts';
    facts.forEach(([k, v]) => {
      const div = document.createElement('div');
      div.className = 'detail-fact';
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      div.append(dt, dd);
      dl.append(div);
    });
    root.append(dl);
  }

  const body = entity.fullDescription || entity.shortDescription || '';
  if (body) {
    const p = document.createElement('p');
    p.className = 'detail-body';
    p.textContent = body;
    root.append(p);
  }
}

/* ─── blog-header ─── */

function renderBlogHeader(block, cfg, entity) {
  const { Utils, Storage } = window.AdobeSphere;

  if (!entity) { block.append(emptyP(cfg.empty || 'Article not found.')); return; }

  const author = entity.author || {};
  const avatarSrc = Utils.normaliseAsset(author.avatar, '/assets/images/profiles/default-user.jpg');
  const coverSrc = Utils.normaliseAsset(entity.coverImage, '/assets/images/blogs/blog-card-fallback.jpg');
  const rawAuthorId = author.id || '';
  const profileId = rawAuthorId.startsWith('user:') ? rawAuthorId.slice(5) : rawAuthorId;
  const profileUrl = profileId ? `/creator-profile?id=${encodeURIComponent(profileId)}` : '';
  const saved = Storage.isLoggedIn() && entity.id ? Storage.isBlogSaved?.(String(entity.id)) : false;

  /* inner wrapper */
  const inner = document.createElement('div');
  inner.className = 'blog-header-inner';

  /* meta row */
  const metaRow = document.createElement('div');
  metaRow.className = 'article-meta-row';
  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = entity.category || 'Article';
  const dateSpan = document.createElement('span');
  dateSpan.className = 'text-muted';
  dateSpan.textContent = Utils.formatShortDate(entity.publishedDate) || '';
  metaRow.append(badge, dateSpan);

  /* title */
  const h1 = document.createElement('h1');
  h1.className = 'article-title';
  h1.textContent = entity.title || 'Untitled';

  /* author row */
  const authorRow = document.createElement('div');
  authorRow.className = 'author-row';

  const avatarImg = document.createElement('img');
  avatarImg.className = 'author-avatar';
  avatarImg.src = avatarSrc;
  avatarImg.alt = author.name || 'Author';

  if (profileUrl) {
    const avatarLink = document.createElement('a');
    avatarLink.href = profileUrl;
    avatarLink.className = 'author-avatar-link';
    avatarLink.setAttribute('aria-label', 'View author profile');
    avatarLink.append(avatarImg);
    authorRow.append(avatarLink);
  } else {
    authorRow.append(avatarImg);
  }

  const authorInfo = document.createElement('div');
  authorInfo.className = 'author-row-info';
  const nameP = document.createElement('p');
  nameP.className = 'author-name';
  nameP.textContent = author.name || 'Adobe Team';
  if (profileUrl) {
    const nameLink = document.createElement('a');
    nameLink.href = profileUrl;
    nameLink.className = 'author-name-link';
    nameLink.setAttribute('aria-label', 'View author profile');
    nameLink.append(nameP);
    authorInfo.append(nameLink);
  } else {
    authorInfo.append(nameP);
  }
  const designP = document.createElement('p');
  designP.className = 'author-designation text-muted';
  designP.textContent = author.designation || 'Contributor';
  authorInfo.append(designP);
  authorRow.append(authorInfo);

  const socials = author.socials || {};
  const socialEntries = Object.entries(socials).filter(([, v]) => v);
  if (socialEntries.length) {
    const socialsDiv = document.createElement('div');
    socialsDiv.className = 'author-socials';
    socialEntries.forEach(([platform, url]) => {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('aria-label', platform.charAt(0).toUpperCase() + platform.slice(1));
      a.textContent = platform.charAt(0).toUpperCase() + platform.slice(1);
      socialsDiv.append(a);
    });
    authorRow.append(socialsDiv);
  }

  /* actions */
  const actions = document.createElement('div');
  actions.className = 'article-actions';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = `button ghost blog-save-btn${saved ? ' saved' : ''}`;
  saveBtn.dataset.id = String(entity.id || '');
  const saveSvg = makeSvg(
    { width: '16', height: '16', viewBox: '0 0 24 24', fill: saved ? 'currentColor' : 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'aria-hidden': 'true' },
    { tag: 'path', attrs: { d: 'M6 3H18C18.55 3 19 3.45 19 4V21L12 17L5 21V4C5 3.45 5.45 3 6 3Z' } }
  );
  const saveLabel = document.createElement('span');
  saveLabel.className = 'blog-save-label';
  saveLabel.textContent = saved ? 'Saved' : 'Save Article';
  saveBtn.append(saveSvg, saveLabel);

  const writeBtn = document.createElement('button');
  writeBtn.type = 'button';
  writeBtn.className = 'button ghost blog-write-btn';
  writeBtn.textContent = 'Write Your Own Blog →';

  actions.append(saveBtn, writeBtn);
  inner.append(metaRow, h1, authorRow, actions);

  /* cover */
  const coverWrap = document.createElement('div');
  coverWrap.className = 'article-cover-wrap';
  const coverImg = document.createElement('img');
  coverImg.className = 'article-cover';
  coverImg.src = coverSrc;
  coverImg.alt = entity.title || 'Article cover';
  coverWrap.append(coverImg);

  block.append(inner, coverWrap);

  writeBtn.addEventListener('click', () => {
    if (!Storage.isLoggedIn()) { window.location.href = '/login?redirect=/blog-editor'; return; }
    window.location.href = '/blog-editor';
  });

  saveBtn.addEventListener('click', () => {
    if (!Storage.isLoggedIn()) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }
    const id = saveBtn.dataset.id;
    const isSaved = Storage.isBlogSaved?.(id);
    if (isSaved) {
      Storage.unsaveBlog?.(id);
      saveBtn.classList.remove('saved');
      saveLabel.textContent = 'Save Article';
      saveSvg.setAttribute('fill', 'none');
      Utils.toast('Article removed from saved.', 'info');
    } else {
      Storage.saveBlog?.(id);
      saveBtn.classList.add('saved');
      saveLabel.textContent = 'Saved';
      saveSvg.setAttribute('fill', 'currentColor');
      Utils.toast('Article saved to your profile.', 'success');
    }
  });
}

/* ─── agenda ─── */

function renderAgenda(block, cfg, entity) {
  block.append(sectionH2(cfg.title || 'Schedule & Agenda'));
  const ol = document.createElement('ol');
  ol.className = 'detail-agenda';
  block.append(ol);

  const items = (entity && entity.agenda) || [];
  if (!items.length) { ol.append(emptyP(cfg.empty || 'Agenda will be published soon.')); return; }

  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'detail-agenda-item reveal';
    const timeDiv = document.createElement('div');
    timeDiv.className = 'detail-agenda-time';
    timeDiv.textContent = item.time || '';
    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'detail-agenda-body';
    const h3 = document.createElement('h3');
    h3.textContent = item.activity || '';
    const p = document.createElement('p');
    p.textContent = item.description || '';
    bodyDiv.append(h3, p);
    li.append(timeDiv, bodyDiv);
    ol.append(li);
  });
}

/* ─── people (presenters / speakers / hosts) ─── */

async function renderPeople(block, cfg, entity) {
  const group = (() => {
    const ids = ['presenters', 'speakers', 'hosts', 'guests', 'authors'];
    const flat = [...block.classList].flatMap((c) => c.split('-'));
    return ids.find((g) => flat.includes(g)) || 'presenters';
  })();
  const dataKey = group === 'speakers' ? 'guestSpeakers' : group;

  block.append(sectionH2(cfg.title || group.charAt(0).toUpperCase() + group.slice(1)));
  const grid = document.createElement('div');
  grid.className = 'detail-people';
  block.append(grid);

  const people = (entity && entity[dataKey]) || [];
  if (!people.length) { grid.append(emptyP(cfg.empty || 'No people listed yet.')); return; }

  let creatorMap = {};
  try {
    const creators = await window.AdobeSphere.Utils.fetchData('creators');
    if (Array.isArray(creators)) {
      creators.forEach((c) => { if (c.name && c.id) creatorMap[c.name.toLowerCase()] = c.id; });
    }
  } catch { /* noop */ }

  const { Utils } = window.AdobeSphere;
  people.forEach((person) => {
    const avatar = Utils.normaliseAsset(person.avatar, '/icons/user-default.svg');
    const creatorId = creatorMap[(person.name || '').toLowerCase()];
    const href = creatorId ? `/creator-profile?id=${encodeURIComponent(creatorId)}` : '';

    const img = document.createElement('img');
    img.src = avatar;
    img.alt = person.name || 'Person';
    img.loading = 'lazy';

    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'detail-person-body';
    const h3 = document.createElement('h3');
    h3.textContent = person.name || '';
    const desigP = document.createElement('p');
    desigP.className = 'text-muted';
    desigP.textContent = person.designation || '';
    const bioP = document.createElement('p');
    bioP.textContent = person.bio || '';
    bodyDiv.append(h3, desigP, bioP);

    if (href) {
      const a = document.createElement('a');
      a.href = href;
      a.className = 'detail-person detail-person-link reveal';
      a.append(img, bodyDiv);
      grid.append(a);
    } else {
      const article = document.createElement('article');
      article.className = 'detail-person reveal';
      article.append(img, bodyDiv);
      grid.append(article);
    }
  });
}

/* ─── quote ─── */

function renderQuote(block, cfg, entity) {
  const text = (entity && (entity.closingQuote || entity.featuredQuote)) || cfg.title || '';
  if (!text) { block.style.display = 'none'; return; }
  const bq = document.createElement('blockquote');
  bq.className = 'detail-quote';
  bq.textContent = text;
  block.append(bq);
}

/* ─── bio ─── */

function renderBio(block, cfg, entity) {
  if (!entity) { block.style.display = 'none'; return; }
  const { Utils } = window.AdobeSphere;
  const bio = entity.fullBio || entity.bio || '';

  if (block.classList.contains('text')) {
    if (!bio) { block.style.display = 'none'; return; }
    bio.split(/\n\n+/).filter((para) => para.trim()).forEach((para) => {
      const p = document.createElement('p');
      p.textContent = para;
      block.append(p);
    });
    return;
  }

  if (cfg.title) block.append(sectionH2(cfg.title));
  const article = document.createElement('article');
  article.className = 'detail-bio';
  const img = document.createElement('img');
  img.className = 'detail-bio-avatar';
  img.src = Utils.normaliseAsset(entity.avatar, '/icons/user-default.svg');
  img.alt = entity.name || 'Author';
  img.loading = 'lazy';
  const bioBody = document.createElement('div');
  bioBody.className = 'detail-bio-body';
  const h3 = document.createElement('h3');
  h3.textContent = entity.name || '';
  const designP = document.createElement('p');
  designP.className = 'text-muted';
  designP.textContent = entity.designation || '';
  bioBody.append(h3, designP);
  bio.split(/\n\n+/).filter((para) => para.trim()).forEach((para) => {
    const p = document.createElement('p');
    p.textContent = para;
    bioBody.append(p);
  });
  article.append(img, bioBody);
  block.append(article);
}

/* ─── reach-out ─── */

function makeReachOutIcon(type) {
  const base = { width: '18', height: '18', 'aria-hidden': 'true' };
  if (type === 'email') {
    return makeSvg(
      { ...base, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
      { tag: 'rect', attrs: { x: '2', y: '4', width: '20', height: '16', rx: '2' } },
      { tag: 'path', attrs: { d: 'M2 7l10 7 10-7' } }
    );
  }
  if (type === 'linkedin') {
    return makeSvg(
      { ...base, viewBox: '0 0 24 24', fill: 'currentColor' },
      { tag: 'path', attrs: { d: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z' } },
      { tag: 'rect', attrs: { x: '2', y: '9', width: '4', height: '12' } },
      { tag: 'circle', attrs: { cx: '4', cy: '4', r: '2' } }
    );
  }
  return null;
}

function renderReachOut(block, cfg, entity) {
  if (!entity) { block.style.display = 'none'; return; }
  const links = [];
  if (entity.email) links.push({ label: entity.email, href: `mailto:${entity.email}`, type: 'email' });
  if (entity.socials && entity.socials.linkedin) links.push({ label: 'LinkedIn', href: entity.socials.linkedin, type: 'linkedin' });
  if (!links.length) { block.style.display = 'none'; return; }

  if (cfg.title) block.append(sectionH2(cfg.title));
  const container = document.createElement('div');
  container.className = 'detail-reach-out';
  links.forEach((l) => {
    const a = document.createElement('a');
    a.className = 'reach-out-pill';
    a.href = l.href;
    a.target = '_blank';
    a.rel = 'noopener';
    const iconSpan = document.createElement('span');
    iconSpan.className = 'reach-out-icon';
    const icon = makeReachOutIcon(l.type);
    if (icon) iconSpan.append(icon);
    const textSpan = document.createElement('span');
    textSpan.textContent = l.label;
    a.append(iconSpan, textSpan);
    container.append(a);
  });
  block.append(container);
}

/* ─── default comment seeds ─── */

const BLOG_COMMENT_SEEDS = [
  'Really insightful piece — this is exactly the kind of content that keeps me coming back to Adobesphere.',
  'Great breakdown! I\'ve been looking for a clear explanation of this for a while. Sharing with my team.',
  'Loved reading this. The perspective here is spot on and the writing makes complex ideas accessible.',
  'Such a well-structured article. The community needs more content like this — keep it coming!',
  'This hit close to home. Really appreciated the practical takeaways woven throughout.',
];

const EVENT_COMMENT_SEEDS = [
  'Already registered — this is exactly the kind of event I\'ve been waiting for. The agenda looks fantastic.',
  'The lineup here is incredible. Can\'t wait to connect with everyone and hear these sessions live.',
  'Love that Adobe keeps bringing the community together like this. Events like this are unmissable.',
  'Just signed up! The format looks really well thought out — looking forward to the networking too.',
  'This is going to be one of the highlights of the year. See you all there!',
];

function detectCommentSource(cfg, id) {
  if (cfg.id_source) return cfg.id_source;
  const path = window.location.pathname.toLowerCase();
  if (path.includes('/blog')) return 'blogs';
  if (id && id.startsWith('user-blog-')) return 'blogs';
  return 'events';
}

async function seedDefaultComments(id, source, entity) {
  const { Storage, Utils } = window.AdobeSphere;
  if (!id || Storage.getComments(id).length > 0) return;

  // Only seed curated content — never user-submitted blogs.
  if ((entity && entity.userSubmitted) || id.startsWith('user-blog-')) return;

  const creators = await Utils.fetchData('creators').catch(() => null);
  if (!Array.isArray(creators) || !creators.length) return;

  // Exclude the content author so they don't comment on their own work.
  const authorName = ((entity && entity.author && entity.author.name) || '').toLowerCase();
  const authorId = ((entity && (entity.ownerIdentity || (entity.author && entity.author.id))) || '')
    .replace(/^user:/, '').toLowerCase();

  const templates = source === 'blogs' ? BLOG_COMMENT_SEEDS : EVENT_COMMENT_SEEDS;
  const picks = creators.slice()
    .filter((c) => {
      if (authorName && (c.name || '').toLowerCase() === authorName) return false;
      if (authorId && (c.id || '').toLowerCase() === authorId) return false;
      return true;
    })
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  // Anchor timestamps to the content's publish date so comments feel contextual.
  const publishedAt = entity && (entity.publishedDate || entity.date)
    ? new Date(entity.publishedDate || entity.date)
    : new Date(Date.now() - 60 * 86_400_000);
  const now = new Date();

  picks.forEach((creator, i) => {
    // Comments land 3, 7, 14 days after publish — capped at today.
    const daysAfter = [3, 7, 14][i];
    const commentDate = new Date(publishedAt.getTime() + daysAfter * 86_400_000);
    const ts = (commentDate > now ? now : commentDate).toISOString();
    Storage.addComment(id, {
      author: creator.name || 'Adobe Community',
      authorId: creator.id || '',
      avatar: Utils.normaliseAsset(creator.avatar, '/icons/user-default.svg'),
      text: templates[i % templates.length],
      timestamp: ts,
    });
  });
}

/* ─── comments ─── */

async function renderComments(block, cfg, source, entity) {
  const id = getEntityId();
  const { Storage, Utils } = window.AdobeSphere;

  await seedDefaultComments(id, source || detectCommentSource(cfg, id), entity);

  if (cfg.title) block.append(sectionH2(cfg.title));

  const countP = document.createElement('p');
  countP.className = 'detail-comments-count text-muted';
  block.append(countP);

  const composer = document.createElement('div');
  composer.className = 'detail-comments-composer';

  const textarea = document.createElement('textarea');
  textarea.className = 'form-input detail-comments-input';
  textarea.rows = 3;
  textarea.maxLength = 500;
  textarea.placeholder = cfg.placeholder || 'Share your thoughts…';

  const charCounter = document.createElement('small');
  charCounter.className = 'text-muted detail-comments-counter';
  charCounter.textContent = '0 / 500';

  const postBtn = document.createElement('button');
  postBtn.type = 'button';
  postBtn.className = 'button primary detail-comments-post';
  postBtn.textContent = 'Post Comment';

  const errP = document.createElement('p');
  errP.className = 'form-error detail-comments-error';

  composer.append(textarea, charCounter, postBtn, errP);
  block.append(composer);

  const list = document.createElement('div');
  list.className = 'detail-comments-list';
  block.append(list);

  function refresh() {
    const comments = id ? Storage.getComments(id) : [];
    countP.textContent = `${comments.length} comment${comments.length === 1 ? '' : 's'}`;
    list.textContent = '';
    comments.forEach((c) => {
      const article = document.createElement('article');
      article.className = 'detail-comment';

      const profileUrl = c.authorId
        ? `/creator-profile?id=${encodeURIComponent(c.authorId)}`
        : '';

      const img = document.createElement('img');
      img.src = Utils.normaliseAsset(c.avatar, '/icons/user-default.svg');
      img.alt = c.author || '';
      img.className = 'detail-comment-avatar';

      if (profileUrl) {
        const avatarLink = document.createElement('a');
        avatarLink.href = profileUrl;
        avatarLink.className = 'detail-comment-avatar-link';
        avatarLink.setAttribute('aria-label', `View ${c.author || 'commenter'}'s profile`);
        avatarLink.append(img);
        article.append(avatarLink);
      } else {
        article.append(img);
      }

      const div = document.createElement('div');
      const metaP = document.createElement('p');
      metaP.className = 'detail-comment-meta';

      const strong = document.createElement('strong');
      if (profileUrl) {
        const nameLink = document.createElement('a');
        nameLink.href = profileUrl;
        nameLink.className = 'detail-comment-name-link';
        nameLink.textContent = c.author || 'Anonymous';
        strong.append(nameLink);
      } else {
        strong.textContent = c.author || 'Anonymous';
      }

      metaP.append(strong, ` · ${Utils.formatShortDate(c.timestamp || '')}`);
      const textP = document.createElement('p');
      textP.textContent = c.text || '';
      div.append(metaP, textP);
      article.append(div);
      list.append(article);
    });
  }

  textarea.addEventListener('input', () => { charCounter.textContent = `${textarea.value.length} / 500`; });

  postBtn.addEventListener('click', () => {
    errP.textContent = '';
    if (!Storage.isLoggedIn()) {
      Utils.showAuthModal({ redirect: window.location.pathname + window.location.search });
      return;
    }
    const text = textarea.value.trim();
    if (!text) { errP.textContent = 'Comment cannot be empty.'; return; }
    if (!id) { errP.textContent = 'Cannot identify the article.'; return; }
    const user = Storage.getCurrentUser() || {};
    Storage.addComment(id, {
      author: user.name || 'Anonymous',
      authorId: user.email || '',
      avatar: user.avatarSrc || user.avatar || '',
      text,
      timestamp: new Date().toISOString(),
    });
    textarea.value = '';
    charCounter.textContent = '0 / 500';
    refresh();
    Utils.toast('Comment posted!', 'success');
  });

  refresh();
}

/* ─── article-body ─── */

function renderArticleBody(block, cfg, entity) {
  if (!entity || !Array.isArray(entity.content) || !entity.content.length) {
    block.append(emptyP(cfg.empty || 'Article content is unavailable.'));
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
    } else if (blk.type === 'image' && (blk.src || blk.url)) {
      const fig = document.createElement('figure');
      const img = document.createElement('img');
      img.src = window.AdobeSphere.Utils.normaliseAsset(blk.src || blk.url, '');
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
  const flatVariants = variants.flatMap((c) => c.split('-'));

  const variant = ['blog-header', 'overview', 'agenda', 'people', 'quote', 'comments', 'bio', 'reach-out',
    'presenters', 'speakers', 'hosts', 'article-body'].find((v) =>
    variants.includes(v) || flatVariants.includes(v)
  ) || 'overview';

  const source = cfg.id_source
    || (['blog-header', 'article-body'].includes(variant) ? 'blogs' : null)
    || (variant === 'comments' ? detectCommentSource(cfg, cfg.id || getEntityId()) : null)
    || 'events';

  let entity = null;
  if (['blog-header', 'overview', 'agenda', 'people', 'presenters', 'speakers', 'hosts', 'quote', 'bio', 'reach-out', 'article-body', 'comments'].includes(variant)) {
    const id = cfg.id || getEntityId();
    if (id) entity = await loadEntity(source, id);
  }

  if (variant === 'bio' && entity && entity.author && entity.author.id) {
    try {
      const rawId = entity.author.id;
      const lookupId = rawId.startsWith('user:') ? rawId.slice(5) : rawId;
      const creator = await loadEntity('creators', lookupId);
      if (creator) entity = creator;
    } catch { /* fall back to blog.author inline fields */ }
  }

  block.textContent = '';

  if (variant === 'blog-header') renderBlogHeader(block, cfg, entity);
  else if (variant === 'overview') renderOverview(block, cfg, entity, cfg.title || 'Overview');
  else if (variant === 'agenda') renderAgenda(block, cfg, entity);
  else if (['people', 'presenters', 'speakers', 'hosts'].includes(variant)) await renderPeople(block, cfg, entity);
  else if (variant === 'quote') renderQuote(block, cfg, entity);
  else if (variant === 'bio') renderBio(block, cfg, entity);
  else if (variant === 'reach-out') renderReachOut(block, cfg, entity);
  else if (variant === 'comments') await renderComments(block, cfg, source, entity);
  else if (variant === 'article-body') renderArticleBody(block, cfg, entity);
}
