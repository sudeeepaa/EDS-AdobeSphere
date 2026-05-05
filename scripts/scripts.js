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

async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
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
