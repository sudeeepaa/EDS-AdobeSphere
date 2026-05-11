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

const STORAGE_KEYS = {
  USERS: 'adobesphere_users',
  SESSION: 'adobesphere_session',
  SAVED: 'adobesphere_saved',
  REGISTRATIONS: 'adobesphere_registrations',
  USER_BLOGS: 'adobesphere_user_blogs',
  COMMENTS: 'adobesphere_comments',
  PROFILE: 'adobesphere_profile_',
};

// Safely reads and parses a JSON value from localStorage.
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// Safely serialises and writes a value to localStorage.
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const Storage = {
  // Returns the current session object from localStorage.
  getSession() { return readJSON(STORAGE_KEYS.SESSION, null); },
  // Saves the session object to localStorage.
  setSession(session) { return writeJSON(STORAGE_KEYS.SESSION, session); },
  // Removes the session from localStorage.
  clearSession() { localStorage.removeItem(STORAGE_KEYS.SESSION); },

  // Returns true if a valid session with an email exists.
  isLoggedIn() {
    const s = this.getSession();
    return !!(s && s.email);
  },

  // Returns the full user object for the current session.
  getCurrentUser() {
    const s = this.getSession();
    if (!s || !s.email) return null;
    const users = readJSON(STORAGE_KEYS.USERS, {});
    return users[s.email] || null;
  },

  // Creates or updates a user record in localStorage.
  upsertUser(user) {
    if (!user || !user.email) return false;
    const users = readJSON(STORAGE_KEYS.USERS, {});
    users[user.email] = { ...users[user.email], ...user };
    return writeJSON(STORAGE_KEYS.USERS, users);
  },

  // Returns the saved item IDs of the given type for the current user.
  getSaved(type) {
    const session = this.getSession();
    if (!session) return [];
    const all = readJSON(STORAGE_KEYS.SAVED, {});
    const userSaved = all[session.email] || { events: [], blogs: [] };
    return userSaved[type] || [];
  },

  // Toggles a saved item and returns true if it is now saved.
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
    return idx === -1;
  },

  // Returns true if the given item is in the current user's saved list.
  isSaved(type, id) {
    return this.getSaved(type).indexOf(id) !== -1;
  },

  // Returns the current user's event registrations.
  getRegistrations() {
    const session = this.getSession();
    if (!session) return [];
    const all = readJSON(STORAGE_KEYS.REGISTRATIONS, {});
    return all[session.email] || [];
  },

  // Registers the current user for an event with the given details.
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

  // Cancels the current user's registration for the given event.
  cancelRegistration(eventId) {
    const session = this.getSession();
    if (!session) return false;
    const all = readJSON(STORAGE_KEYS.REGISTRATIONS, {});
    const list = (all[session.email] || []).filter((r) => r.eventId !== eventId);
    all[session.email] = list;
    return writeJSON(STORAGE_KEYS.REGISTRATIONS, all);
  },

  // Returns all user-authored blog posts for the current session.
  getUserBlogs() {
    const session = this.getSession();
    if (!session) return [];
    const all = readJSON(STORAGE_KEYS.USER_BLOGS, {});
    return all[session.email] || [];
  },

  // Appends a new blog post for the current session user.
  addUserBlog(blog) {
    const session = this.getSession();
    if (!session) return false;
    const all = readJSON(STORAGE_KEYS.USER_BLOGS, {});
    const list = all[session.email] || [];
    list.push(blog);
    all[session.email] = list;
    return writeJSON(STORAGE_KEYS.USER_BLOGS, all);
  },

  // Removes a blog post by id from the current session user's list.
  deleteUserBlog(blogId) {
    const session = this.getSession();
    if (!session) return false;
    const all = readJSON(STORAGE_KEYS.USER_BLOGS, {});
    all[session.email] = (all[session.email] || []).filter((b) => b.id !== blogId);
    return writeJSON(STORAGE_KEYS.USER_BLOGS, all);
  },

  // Returns all comments for the given blog id.
  getComments(blogId) {
    const all = readJSON(STORAGE_KEYS.COMMENTS, {});
    return all[blogId] || [];
  },

  // Appends a comment to the given blog's comment list.
  addComment(blogId, comment) {
    const all = readJSON(STORAGE_KEYS.COMMENTS, {});
    const list = all[blogId] || [];
    list.push(comment);
    all[blogId] = list;
    return writeJSON(STORAGE_KEYS.COMMENTS, all);
  },

  // Creates or updates a local creator entry for newly registered users.
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

  // Returns the count of locally registered creator accounts.
  getLocalCreatorsCount() {
    try {
      return Object.keys(JSON.parse(localStorage.getItem('adobesphere_local_creators') || '{}')).length;
    } catch { return 0; }
  },

  // Returns a creator-shaped object built from a registered user's stored profile.
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

  // Returns all registered users with a name as creator-shaped objects.
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

  // Returns user-authored blogs stored under the given email address.
  getLocalUserBlogs(email) {
    return readJSON(STORAGE_KEYS.USER_BLOGS, {})[email] || [];
  },

  // Returns true if the given blog id is in the current user's saved list.
  isBlogSaved(id) { return this.isSaved('blogs', String(id)); },
  // Saves the given blog id if not already saved.
  saveBlog(id) { if (!this.isBlogSaved(id)) this.toggleSaved('blogs', String(id)); },
  // Removes the given blog id from the saved list.
  unsaveBlog(id) { if (this.isBlogSaved(id)) this.toggleSaved('blogs', String(id)); },

  // Stores a contact form submission in localStorage.
  addContactSubmission(submission) {
    const KEY = 'adobesphere_contact_submissions';
    const list = readJSON(KEY, []);
    list.push(submission);
    writeJSON(KEY, list);
  },

  // Finds and returns a user blog by id across all users' blog lists.
  getUserBlogById(blogId) {
    const all = readJSON(STORAGE_KEYS.USER_BLOGS, {});
    for (const blogs of Object.values(all)) {
      const found = (blogs || []).find((b) => b.id === blogId);
      if (found) return found;
    }
    return null;
  },

  // Updates an existing user blog or appends it if not found.
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

  // Returns all user-authored blogs across all users as a flat array.
  getAllUserBlogs() {
    const all = readJSON(STORAGE_KEYS.USER_BLOGS, {});
    return Object.values(all).flat();
  },

  // Returns the stored list of custom blog category names.
  getBlogCategories() {
    return readJSON('adobesphere_blog_categories', []);
  },

  // Adds a new category name to the stored list if not already present.
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

const Utils = {
  // Escapes HTML special characters to prevent XSS.
  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // Formats an ISO date string using the given Intl options or a default long format.
  formatDate(iso, opts) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', opts || {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }).format(d);
  },

  // Formats an ISO date string as a short locale date.
  formatShortDate(iso) {
    return Utils.formatDate(iso, { month: 'short', day: 'numeric', year: 'numeric' });
  },

  // Truncates a string to max characters with an ellipsis.
  truncate(text, max) {
    const s = String(text ?? '');
    return s.length <= max ? s : `${s.slice(0, max)}…`;
  },

  // Returns true if the string is a valid email address format.
  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  },

  // Normalises an asset path to an absolute URL or returns the fallback.
  normaliseAsset(src, fallback) {
    if (!src || typeof src !== 'string') return fallback || '';
    const v = src.trim().replace(/\\/g, '/');
    if (!v) return fallback || '';
    if (v.startsWith('data:') || v.startsWith('http')) return v;
    return v.startsWith('/') ? v : `/${v}`;
  },

  // Shows a transient toast notification in the bottom-right corner.
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

  // Fetches JSON data, trying /drafts/data first then /data.
  async fetchData(name) {
    const candidates = [`/drafts/data/${name}.json`, `/data/${name}.json`];
    for (const url of candidates) {
      try {
        const res = await fetch(url); // eslint-disable-line no-await-in-loop
        if (res.ok) return res.json();
      } catch {
        // try next
      }
    }
    return null;
  },

  // Attaches an IntersectionObserver to all .reveal elements to animate them into view.
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

  // Shows a modal dialog prompting the user to sign in or sign up.
  async showAuthModal({ redirect } = {}) {
    const redirectUrl = encodeURIComponent(redirect || (window.location.pathname + window.location.search));

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
    } catch {}

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

    // Closes the modal and restores focus to the previously focused element.
    const close = () => {
      overlay.classList.remove('open');
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
      document.removeEventListener('keydown', onKey);
      if (prevFocus?.focus) prevFocus.focus();
    };

    // Traps focus within the modal and closes it on Escape.
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

window.AdobeSphere = { Storage, Utils };

// Auto-builds a hero block from the first H1 preceded by a picture.
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) { // eslint-disable-line no-bitwise
    if (h1.closest('.hero') || picture.closest('.hero')) return;
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

// Promotes inline fragment links and runs the hero auto-block builder.
function buildAutoBlocks(main) {
  try {
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')]
      .filter((a) => !a.closest('.fragment'));
    if (fragments.length) {
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => { // eslint-disable-line import/no-cycle
        fragments.forEach(async (link) => {
          try {
            const { pathname } = new URL(link.href);
            const frag = await loadFragment(pathname);
            link.parentElement.replaceWith(...frag.children);
          } catch (e) {}
        });
      });
    }
    buildHeroBlock(main);
  } catch (error) {
    console.error('Auto-blocking failed', error); // eslint-disable-line no-console
  }
}

// Applies .button class and a variant to a single anchor element based on its wrapper.
function decorateOneButton(a) {
  a.title = a.title || a.textContent;
  if (a.querySelector('img')) return false;
  const text = a.textContent.trim();
  try {
    if (new URL(a.href).href === new URL(text, window.location).href) return false;
  } catch {}

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

// Decorates all eligible button-links in paragraphs within main.
function decorateButtons(main) {
  main.querySelectorAll('p').forEach((p) => {
    const links = [...p.querySelectorAll('a[href]')];
    if (!links.length) return;

    let decoratedCount = 0;
    links.forEach((a) => { if (decorateOneButton(a)) decoratedCount += 1; });
    if (!decoratedCount) return;

    const stripped = p.textContent.replace(/\s+/g, ' ').trim();
    const buttonText = [...p.querySelectorAll('a.button')]
      .map((a) => a.textContent.trim()).join(' ').replace(/\s+/g, ' ').trim();
    if (stripped === buttonText) p.className = 'button-wrapper';
  });
}

// Runs all decoration passes on the main element.
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
}

// Loads the fonts stylesheet and marks fonts as loaded in sessionStorage.
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) {
      sessionStorage.setItem('fonts-loaded', 'true');
    }
  } catch {}
}

const DYNAMIC_ROUTES = [
  { pattern: /^\/events\/(?!template\b)[^/]+\/?$/, template: '/events/template' },
  { pattern: /^\/blog\/(?!template\b)[^/]+\/?$/, template: '/blog/template' },
  { pattern: /^\/creator-profile\/(?!template\b)[^/]+\/?$/, template: '/creator-profile/template' },
  { pattern: /^\/creator-profile\/?$/, template: '/creator-profile/template' },
];

// Fetches a template and injects it into main for dynamic-route URLs.
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
      window.isErrorPage = false;
      const slug = decodeURIComponent(pathname.split('/').filter(Boolean).pop() || '');
      const label = slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      document.title = `${label} — AdobeSphere`;
    }
    return true;
  } catch {
    return false;
  }
}

// Runs the eager decoration and first-section load.
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();

  await applyDynamicRoute(doc);

  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }
  try {
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) loadFonts();
  } catch {}
}

// Loads header, remaining sections, footer, fonts, and scroll-reveal.
async function loadLazy(doc) {
  loadHeader(doc.querySelector('header'));
  const main = doc.querySelector('main');
  await loadSections(main);

  doc.querySelectorAll('main > .section:not([id])').forEach((section) => {
    const heading = section.querySelector('h2, h3, h4');
    if (!heading) return;
    const text = heading.textContent.trim().toLowerCase();
    if (text.includes('saved')) section.id = 'saved';
    else if (text.includes('published')) section.id = 'published';
    else if (text.includes('register')) section.id = 'registrations';
  });

  const { hash } = window.location;
  const el = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });

  loadFooter(doc.querySelector('footer'));
  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();

  Utils.initRevealObserver();

  if (Storage.isLoggedIn()) {
    doc.querySelectorAll('main a, main button').forEach((el) => {
      if (/join\b.*\bcommunity/i.test(el.textContent.trim())) {
        el.remove();
      }
    });
  }
}

// Schedules the delayed.js import after 3 seconds.
function loadDelayed() {
  window.setTimeout(() => import('./delayed.js'), 3000); // eslint-disable-line import/no-cycle
}

// Runs the full page load sequence: eager, lazy, then delayed.
async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();

export { getMetadata };
