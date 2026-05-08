import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  getMetadata,
} from './aem.js';

/* ─────────────────────────────────────────────────────────────
 * AdobeSphere global app state — initialised on first import.
 * ─────────────────────────────────────────────────────────────
 */
const STORAGE_KEYS = {
  USERS: 'adobesphere_users',
  SESSION: 'adobesphere_session',
  SAVED: 'adobesphere_saved',
  REGISTRATIONS: 'adobesphere_registrations',
  USER_BLOGS: 'adobesphere_user_blogs',
  COMMENTS: 'adobesphere_comments',
  PROFILE: 'adobesphere_profile_',
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Storage — thin localStorage wrapper used by every block that needs persistence.
 * Exposed at `window.AdobeSphere.Storage`.
 */
const Storage = {
  getSession() { return readJSON(STORAGE_KEYS.SESSION, null); },
  setSession(session) { return writeJSON(STORAGE_KEYS.SESSION, session); },
  clearSession() { localStorage.removeItem(STORAGE_KEYS.SESSION); },

  isLoggedIn() {
    const s = this.getSession();
    return !!(s && s.email);
  },

  getCurrentUser() {
    const s = this.getSession();
    if (!s || !s.email) return null;
    const users = readJSON(STORAGE_KEYS.USERS, {});
    return users[s.email] || null;
  },

  upsertUser(user) {
    if (!user || !user.email) return false;
    const users = readJSON(STORAGE_KEYS.USERS, {});
    users[user.email] = { ...users[user.email], ...user };
    return writeJSON(STORAGE_KEYS.USERS, users);
  },

  getSaved(type) {
    const session = this.getSession();
    if (!session) return [];
    const all = readJSON(STORAGE_KEYS.SAVED, {});
    const userSaved = all[session.email] || { events: [], blogs: [] };
    return userSaved[type] || [];
  },

  toggleSaved(type, id) {
    const session = this.getSession();
    if (!session) return false;
    const all = readJSON(STORAGE_KEYS.SAVED, {});
    const userSaved = all[session.email] || { events: [], blogs: [] };
    const list = userSaved[type] || [];
    const idx = list.indexOf(id);
    if (idx === -1) list.push(id); else list.splice(idx, 1);
    userSaved[type] = list;
    all[session.email] = userSaved;
    writeJSON(STORAGE_KEYS.SAVED, all);
    return idx === -1; // true = saved, false = removed
  },

  isSaved(type, id) {
    return this.getSaved(type).indexOf(id) !== -1;
  },

  getRegistrations() {
    const session = this.getSession();
    if (!session) return [];
    const all = readJSON(STORAGE_KEYS.REGISTRATIONS, {});
    return all[session.email] || [];
  },

  registerForEvent(eventId, details) {
    const session = this.getSession();
    if (!session) return false;
    const all = readJSON(STORAGE_KEYS.REGISTRATIONS, {});
    const list = all[session.email] || [];
    if (list.find((r) => r.eventId === eventId)) return false;
    list.push({ eventId, registeredAt: new Date().toISOString(), ...details });
    all[session.email] = list;
    return writeJSON(STORAGE_KEYS.REGISTRATIONS, all);
  },

  cancelRegistration(eventId) {
    const session = this.getSession();
    if (!session) return false;
    const all = readJSON(STORAGE_KEYS.REGISTRATIONS, {});
    const list = (all[session.email] || []).filter((r) => r.eventId !== eventId);
    all[session.email] = list;
    return writeJSON(STORAGE_KEYS.REGISTRATIONS, all);
  },

  getUserBlogs() {
    const session = this.getSession();
    if (!session) return [];
    const all = readJSON(STORAGE_KEYS.USER_BLOGS, {});
    return all[session.email] || [];
  },

  addUserBlog(blog) {
    const session = this.getSession();
    if (!session) return false;
    const all = readJSON(STORAGE_KEYS.USER_BLOGS, {});
    const list = all[session.email] || [];
    list.push(blog);
    all[session.email] = list;
    return writeJSON(STORAGE_KEYS.USER_BLOGS, all);
  },

  deleteUserBlog(blogId) {
    const session = this.getSession();
    if (!session) return false;
    const all = readJSON(STORAGE_KEYS.USER_BLOGS, {});
    all[session.email] = (all[session.email] || []).filter((b) => b.id !== blogId);
    return writeJSON(STORAGE_KEYS.USER_BLOGS, all);
  },

  getComments(blogId) {
    const all = readJSON(STORAGE_KEYS.COMMENTS, {});
    return all[blogId] || [];
  },

  addComment(blogId, comment) {
    const all = readJSON(STORAGE_KEYS.COMMENTS, {});
    const list = all[blogId] || [];
    list.push(comment);
    all[blogId] = list;
    return writeJSON(STORAGE_KEYS.COMMENTS, all);
  },

  // Every new sign-up creates a matching local creator entry so that the
  // "Creators" stat counter equals the "Registered Users" counter.
  upsertLocalCreator(user) {
    if (!user || !user.email) return false;
    const key = 'adobesphere_local_creators';
    const creators = readJSON(key, {});
    creators[user.email] = {
      ...creators[user.email],
      email: user.email,
      name: user.name || '',
      createdAt: user.createdAt || new Date().toISOString(),
    };
    return writeJSON(key, creators);
  },

  getLocalCreatorsCount() {
    try {
      return Object.keys(JSON.parse(localStorage.getItem('adobesphere_local_creators') || '{}')).length;
    } catch { return 0; }
  },

  // Build a creator-shaped object for a registered user from their stored profile.
  // id = the user's email (used as their creator profile URL slug).
  getLocalCreator(id) {
    const users = readJSON(STORAGE_KEYS.USERS, {});
    const user = users[id];
    if (!user) return null;
    const userBlogs = readJSON(STORAGE_KEYS.USER_BLOGS, {})[id] || [];
    return {
      id,
      name: user.name || '',
      email: user.email || id,
      designation: user.designation || '',
      bio: user.bio || '',
      fullBio: user.bio || '',
      avatar: user.avatarSrc || user.avatar || '/assets/images/profiles/default-user.jpg',
      socials: user.socials || {},
      stats: {
        blogsPublished: userBlogs.length,
        eventsHosted: 0,
        testimonialsGiven: 0,
      },
      blogIds: userBlogs.map((b) => b.id),
      eventIds: [],
      featuredQuote: '',
    };
  },

  // Returns all registered users who have a name as creator-shaped objects.
  getAllLocalCreators() {
    const users = readJSON(STORAGE_KEYS.USERS, {});
    const userBlogs = readJSON(STORAGE_KEYS.USER_BLOGS, {});
    return Object.entries(users)
      .filter(([, u]) => u.name)
      .map(([email, u]) => {
        const blogs = userBlogs[email] || [];
        return {
          id: email,
          name: u.name || '',
          email,
          designation: u.designation || '',
          bio: u.bio || '',
          fullBio: u.bio || '',
          avatar: u.avatarSrc || u.avatar || '/assets/images/profiles/default-user.jpg',
          socials: u.socials || {},
          stats: { blogsPublished: blogs.length, eventsHosted: 0, testimonialsGiven: 0 },
          blogIds: blogs.map((b) => b.id),
          eventIds: [],
          featuredQuote: '',
        };
      });
  },

  // Returns user-authored blogs for a given email (accessible on their own device).
  getLocalUserBlogs(email) {
    return readJSON(STORAGE_KEYS.USER_BLOGS, {})[email] || [];
  },

  // Convenience wrappers for blog save/unsave (delegates to generic toggleSaved).
  isBlogSaved(id) { return this.isSaved('blogs', String(id)); },
  saveBlog(id) { if (!this.isBlogSaved(id)) this.toggleSaved('blogs', String(id)); },
  unsaveBlog(id) { if (this.isBlogSaved(id)) this.toggleSaved('blogs', String(id)); },

  // Contact submissions — stored locally (no server in this demo).
  addContactSubmission(submission) {
    const KEY = 'adobesphere_contact_submissions';
    const list = readJSON(KEY, []);
    list.push(submission);
    writeJSON(KEY, list);
  },

  getUserBlogById(blogId) {
    const all = readJSON(STORAGE_KEYS.USER_BLOGS, {});
    for (const blogs of Object.values(all)) {
      const found = (blogs || []).find((b) => b.id === blogId);
      if (found) return found;
    }
    return null;
  },

  updateUserBlog(blog) {
    const session = this.getSession();
    if (!session) return false;
    const all = readJSON(STORAGE_KEYS.USER_BLOGS, {});
    const list = all[session.email] || [];
    const idx = list.findIndex((b) => b.id === blog.id);
    if (idx === -1) { list.push(blog); } else { list[idx] = blog; }
    all[session.email] = list;
    return writeJSON(STORAGE_KEYS.USER_BLOGS, all);
  },

  getAllUserBlogs() {
    const all = readJSON(STORAGE_KEYS.USER_BLOGS, {});
    return Object.values(all).flat();
  },

  getBlogCategories() {
    return readJSON('adobesphere_blog_categories', []);
  },

  addBlogCategory(name) {
    const v = String(name || '').trim();
    if (!v) return;
    const list = this.getBlogCategories();
    if (!list.some((c) => String(c).trim().toLowerCase() === v.toLowerCase())) {
      list.push(v);
      writeJSON('adobesphere_blog_categories', list);
    }
  },
};

/* ─── Helpers shared across blocks (avatars, dates, escaping, etc.) ─── */
const Utils = {
  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  formatDate(iso, opts) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', opts || {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }).format(d);
  },

  formatShortDate(iso) {
    return Utils.formatDate(iso, { month: 'short', day: 'numeric', year: 'numeric' });
  },

  truncate(text, max) {
    const s = String(text ?? '');
    return s.length <= max ? s : `${s.slice(0, max)}…`;
  },

  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  },

  /**
   * Resolves an asset path. Supports:
   *  - data: URIs (returned as-is)
   *  - absolute http(s) URLs (returned as-is)
   *  - paths from the legacy site like "assets/images/..." (left alone — author copies the assets folder)
   *  - paths with backslashes (normalised to forward slashes)
   */
  normaliseAsset(src, fallback) {
    if (!src || typeof src !== 'string') return fallback || '';
    const v = src.trim().replace(/\\/g, '/');
    if (!v) return fallback || '';
    if (v.startsWith('data:') || v.startsWith('http')) return v;
    return v.startsWith('/') ? v : `/${v}`;
  },

  toast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.append(container);
    }
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = String(message ?? '');
    container.append(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 250);
    }, duration);
  },

  /**
   * Loads JSON data files. Searches /drafts/data first (local dev) then /data.
   * The author publishes JSON in da.live → /data/{name}.json.
   */
  async fetchData(name) {
    const candidates = [`/drafts/data/${name}.json`, `/data/${name}.json`];
    for (const url of candidates) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await fetch(url);
        if (res.ok) return res.json();
      } catch {
        /* try next */
      }
    }
    return null;
  },

  initRevealObserver() {
    const nodes = document.querySelectorAll('.reveal:not(.visible)');
    if (!nodes.length) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    nodes.forEach((n) => obs.observe(n));
  },

  async showAuthModal({ redirect } = {}) {
    const redirectUrl = encodeURIComponent(redirect || (window.location.pathname + window.location.search));

    // Fetch authored heading / message / buttons from DA.live (no hardcoded copy).
    let heading = 'Sign in to continue';
    let msgText = 'Join the AdobeSphere community to participate.';
    const authoredBtns = [];
    try {
      const res = await fetch('/modals/auth-prompt.plain.html');
      if (res.ok) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(await res.text(), 'text/html');
        const h2 = doc.querySelector('h2');
        if (h2) heading = h2.textContent.trim();
        const p = doc.querySelector('p');
        if (p) msgText = p.textContent.trim();
        doc.querySelectorAll('a[href]').forEach((a) => {
          authoredBtns.push({ text: a.textContent.trim(), href: a.getAttribute('href') });
        });
      }
    } catch { /* use fallback strings */ }

    // Remove any prior instance so event listeners don't accumulate.
    document.getElementById('auth-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'auth-modal';
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'auth-modal-title');
    overlay.setAttribute('aria-hidden', 'true');

    const box = document.createElement('div');
    box.className = 'modal-box auth-modal-box';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close';
    closeBtn.setAttribute('aria-label', 'Close dialog');
    closeBtn.textContent = '×';

    // Lock icon via createElementNS (no innerHTML).
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const iconWrap = document.createElement('div');
    iconWrap.className = 'auth-modal-icon';
    iconWrap.setAttribute('aria-hidden', 'true');
    const lockSvg = document.createElementNS(SVG_NS, 'svg');
    [['width', '40'], ['height', '40'], ['viewBox', '0 0 24 24'], ['fill', 'none'],
      ['stroke', 'currentColor'], ['stroke-width', '1.5'], ['stroke-linecap', 'round'],
      ['stroke-linejoin', 'round'], ['aria-hidden', 'true'],
    ].forEach(([k, v]) => lockSvg.setAttribute(k, v));
    const lockRect = document.createElementNS(SVG_NS, 'rect');
    [['x', '3'], ['y', '11'], ['width', '18'], ['height', '11'], ['rx', '2']].forEach(([k, v]) => lockRect.setAttribute(k, v));
    const lockPath = document.createElementNS(SVG_NS, 'path');
    lockPath.setAttribute('d', 'M7 11V7a5 5 0 0 1 10 0v4');
    lockSvg.append(lockRect, lockPath);
    iconWrap.append(lockSvg);

    const h2El = document.createElement('h2');
    h2El.className = 'auth-modal-heading';
    h2El.id = 'auth-modal-title';
    h2El.textContent = heading;

    const pEl = document.createElement('p');
    pEl.className = 'auth-modal-message';
    pEl.textContent = msgText;

    const actions = document.createElement('div');
    actions.className = 'auth-modal-actions';
    const defaults = [
      { text: 'Sign In', href: '/login', cls: 'primary' },
      { text: 'Sign Up', href: '/signup', cls: 'ghost' },
    ];
    const btnDefs = authoredBtns.length >= 2
      ? authoredBtns.map((b, i) => ({ ...b, cls: defaults[i]?.cls || '' }))
      : defaults;
    btnDefs.forEach((btn) => {
      const a = document.createElement('a');
      a.className = `button ${btn.cls || ''}`.trim();
      a.href = btn.href.includes('?') ? `${btn.href}&redirect=${redirectUrl}` : `${btn.href}?redirect=${redirectUrl}`;
      a.textContent = btn.text;
      actions.append(a);
    });

    box.append(closeBtn, iconWrap, h2El, pEl, actions);
    overlay.append(box);
    document.body.append(overlay);

    const prevFocus = document.activeElement;
    const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const close = () => {
      overlay.classList.remove('open');
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
      document.removeEventListener('keydown', onKey);
      if (prevFocus?.focus) prevFocus.focus();
    };

    const onKey = (e) => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      const els = [...overlay.querySelectorAll(FOCUSABLE)];
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);

    requestAnimationFrame(() => {
      overlay.removeAttribute('aria-hidden');
      overlay.classList.add('open');
      closeBtn.focus();
    });
  },
};

// Expose for blocks that prefer a global handle (legacy parity).
window.AdobeSphere = { Storage, Utils };

/* ─────────────────────────────────────────────────────────────
 * Auto-blocking — promote the first H1+picture pair into a hero
 * UNLESS the page already authors an explicit hero block.
 * ─────────────────────────────────────────────────────────────
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    if (h1.closest('.hero') || picture.closest('.hero')) return;
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

function buildAutoBlocks(main) {
  try {
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')]
      .filter((a) => !a.closest('.fragment'));
    if (fragments.length) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (link) => {
          try {
            const { pathname } = new URL(link.href);
            const frag = await loadFragment(pathname);
            link.parentElement.replaceWith(...frag.children);
          } catch (e) { /* noop */ }
        });
      });
    }
    buildHeroBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto-blocking failed', error);
  }
}

/**
 * Button decoration. Three rules:
 *   1. <strong><a/></strong>            → .button.primary
 *   2. <em><a/></em>                    → .button.secondary
 *   3. <strong><em><a/></em></strong>   → .button.accent (and the reverse)
 *
 * Unlike the boilerplate, this version permits multiple buttons inside one
 * paragraph. Authoring `**Explore All** *Join the Community*` on a single
 * line gives you two side-by-side buttons.
 */
function decorateOneButton(a) {
  a.title = a.title || a.textContent;
  if (a.querySelector('img')) return false;
  const text = a.textContent.trim();
  try {
    if (new URL(a.href).href === new URL(text, window.location).href) return false;
  } catch { /* relative link — continue */ }

  const strong = a.closest('strong');
  const em = a.closest('em');
  if (!strong && !em) return false;

  a.className = 'button';
  if (strong && em) {
    a.classList.add('accent');
    const outer = strong.contains(em) ? strong : em;
    outer.replaceWith(a);
  } else if (strong) {
    a.classList.add('primary');
    strong.replaceWith(a);
  } else {
    a.classList.add('secondary');
    em.replaceWith(a);
  }
  return true;
}

function decorateButtons(main) {
  // Process one paragraph at a time so we can detect button-only paragraphs.
  main.querySelectorAll('p').forEach((p) => {
    const links = [...p.querySelectorAll('a[href]')];
    if (!links.length) return;

    // Decorate each eligible link.
    let decoratedCount = 0;
    links.forEach((a) => { if (decorateOneButton(a)) decoratedCount += 1; });
    if (!decoratedCount) return;

    // If the paragraph now contains only buttons (and whitespace), tag it.
    const stripped = p.textContent.replace(/\s+/g, ' ').trim();
    const buttonText = [...p.querySelectorAll('a.button')]
      .map((a) => a.textContent.trim()).join(' ').replace(/\s+/g, ' ').trim();
    if (stripped === buttonText) p.className = 'button-wrapper';
  });
}

export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
}

async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) {
      sessionStorage.setItem('fonts-loaded', 'true');
    }
  } catch { /* private mode */ }
}

/* ─────────────────────────────────────────────────────────────
 * Dynamic route handler for template-based detail pages.
 *
 * EDS requires a real document for every URL. Pages like
 * /events/event-003 don't exist individually — only the template
 * at /events/template does. When the URL matches a dynamic pattern,
 * we fetch the template's .plain.html, inject it into <main>, and
 * let EDS decorate it normally. The block JS then reads the entity
 * id from the URL slug as usual.
 * ─────────────────────────────────────────────────────────────
 */
const DYNAMIC_ROUTES = [
  { pattern: /^\/events\/(?!template\b)[^/]+\/?$/, template: '/events/template' },
  { pattern: /^\/blog\/(?!template\b)[^/]+\/?$/, template: '/blog/template' },
  { pattern: /^\/creator-profile\/(?!template\b)[^/]+\/?$/, template: '/creator-profile/template' },
  { pattern: /^\/creator-profile\/?$/, template: '/creator-profile/template' },
];

async function applyDynamicRoute(doc) {
  const { pathname } = window.location;
  const route = DYNAMIC_ROUTES.find((r) => r.pattern.test(pathname));
  if (!route) return false;

  try {
    const resp = await fetch(`${route.template}.plain.html`);
    if (!resp.ok) return false;
    const html = await resp.text();
    const main = doc.querySelector('main');
    if (main) {
      main.innerHTML = html;
      // Remove the error-page flag if the 404 shell set it.
      window.isErrorPage = false;
      // Fix the page title — replace "Page not found" with something reasonable.
      // The actual entity title will be set later by the hero block once it hydrates.
      const slug = decodeURIComponent(pathname.split('/').filter(Boolean).pop() || '');
      const label = slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      document.title = `${label} — AdobeSphere`;
    }
    return true;
  } catch {
    return false;
  }
}

async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();

  // Handle dynamic routes BEFORE decoration — template content must be in
  // <main> before decorateSections / decorateBlocks runs.
  await applyDynamicRoute(doc);

  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }
  try {
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) loadFonts();
  } catch { /* noop */ }
}

async function loadLazy(doc) {
  loadHeader(doc.querySelector('header'));
  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const el = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && el) el.scrollIntoView();

  loadFooter(doc.querySelector('footer'));
  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();

  // Reveal-on-scroll for any block that opted into the .reveal class.
  Utils.initRevealObserver();

  // Hide any authored "Join Community" buttons/links when the user is logged in.
  if (Storage.isLoggedIn()) {
    doc.querySelectorAll('main a, main button').forEach((el) => {
      if (/join\b.*\bcommunity/i.test(el.textContent.trim())) {
        el.closest('p, li') ? el.closest('p, li').remove() : el.remove();
      }
    });
  }
}

function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();

// Re-export getMetadata for blocks that need page-level metadata (e.g. event id).
export { getMetadata };
