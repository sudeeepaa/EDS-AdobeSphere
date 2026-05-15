import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// Builds the search icon button that redirects/focuses the Explore search.
function buildNavSearch() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-search';
  btn.setAttribute('aria-label', 'Search');
  btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"></circle>
    <path d="M20 20L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
  </svg>`;
  btn.addEventListener('click', () => {
    if (window.location.pathname === '/explore') {
      window.dispatchEvent(new CustomEvent('adobesphere:focus-search'));
    } else {
      sessionStorage.setItem('adobesphere:focus-search', '1');
      window.location.href = '/explore';
    }
  });
  return btn;
}

function buildSignedOutAuth() {
  const wrap = document.createElement('div');
  wrap.className = 'nav-auth';
  wrap.innerHTML = `
    <a class="button ghost" href="/login">Sign In</a>
    <a class="button primary" href="/signup">Sign Up</a>`;
  return wrap;
}

// Builds the inline action icons + avatar shown on desktop when logged in.
function buildUserMenu(user) {
  const { Utils } = window.AdobeSphere;
  const DEFAULT_AVATAR = Utils.DEFAULT_AVATAR;
  const avatarSrc = Utils.escapeHtml(user.avatarSrc || user.avatar || DEFAULT_AVATAR);
  const displayName = Utils.escapeHtml(user.name || 'User');

  const wrap = document.createElement('div');
  wrap.className = 'nav-user';

  // Skip "My Profile" — the avatar link below already targets that page.
  ACCOUNT_ITEMS.slice(1).forEach((item) => {
    const a = document.createElement('a');
    a.className = 'nav-action-icon';
    a.href = item.hrefFn(user);
    a.setAttribute('aria-label', item.label);
    a.dataset.tooltip = item.label;
    a.innerHTML = item.svg;
    wrap.append(a);
  });

  const avatarLink = document.createElement('a');
  avatarLink.className = 'nav-avatar-link';
  avatarLink.href = '/user-profile';
  avatarLink.setAttribute('aria-label', 'My Profile');
  avatarLink.innerHTML = `<img class="nav-avatar" src="${avatarSrc}" alt="${displayName} avatar">`;
  wrap.append(avatarLink);

  window.addEventListener('adobesphere:avatar-updated', (e) => {
    const img = wrap.querySelector('.nav-avatar');
    if (img && e.detail) img.src = e.detail;
  });

  return wrap;
}

function buildAuthZone() {
  const { Storage } = window.AdobeSphere;
  if (!Storage.isLoggedIn()) return buildSignedOutAuth();
  const user = Storage.getCurrentUser() || {};
  return buildUserMenu(user);
}

const ACCOUNT_ITEMS = [
  {
    label: 'My Profile',
    hrefFn: () => '/user-profile',
    svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.8"/>
      <path d="M5 20C5 17.24 8.13 15 12 15C15.87 15 19 17.24 19 20"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`,
  },
  {
    label: 'My Saved Items',
    hrefFn: () => '/user-profile#saved',
    svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3H18C18.55 3 19 3.45 19 4V21L12 17L5 21V4C5 3.45 5.45 3 6 3Z"
        stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>`,
  },
  {
    label: 'Write a Blog',
    hrefFn: () => '/blog-editor',
    svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M11 4H4C3.45 4 3 4.45 3 5V20C3 20.55 3.45 21 4 21H19C19.55 21 20 20.55 20 20V13"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M17.5 2.5C18.33 1.67 19.67 1.67 20.5 2.5C21.33 3.33 21.33 4.67 20.5 5.5L12 14L8 15L9 11L17.5 2.5Z"
        stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>`,
  },
  {
    label: 'My Creator Profile',
    hrefFn: (user) => `/creator-profile/template?id=${encodeURIComponent(user.email || '')}`,
    svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.8"/>
      <path d="M5 20C5 17.24 8.13 15 12 15C15.87 15 19 17.24 19 20"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M19 2L19.9 4.6L22.5 5.5L19.9 6.4L19 9L18.1 6.4L15.5 5.5L18.1 4.6L19 2Z"
        stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
    </svg>`,
  },
];

const SIGN_OUT_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M15 3H19C19.55 3 20 3.45 20 4V20C20 20.55 19.55 21 19 21H15"
    stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M10 17L5 12L10 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M5 12H15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;

// Builds the collapsible "My Account" section inside the mobile drawer.
function buildDrawerAccountSection(user) {
  const { Utils, Storage } = window.AdobeSphere;
  const DEFAULT_AVATAR = Utils.DEFAULT_AVATAR;
  const avatarSrc = Utils.escapeHtml(user.avatarSrc || user.avatar || DEFAULT_AVATAR);
  const displayName = Utils.escapeHtml(user.name || 'User');

  const section = document.createElement('div');
  section.className = 'nav-drawer-account';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-drawer-account-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = `
    <img class="nav-drawer-account-avatar" src="${avatarSrc}" alt="${displayName} avatar">
    <span class="nav-drawer-account-label">My Account</span>
    <svg class="nav-drawer-account-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  const menu = document.createElement('div');
  menu.className = 'nav-drawer-account-menu';

  ACCOUNT_ITEMS.forEach((item) => {
    const a = document.createElement('a');
    a.href = item.hrefFn(user);
    a.innerHTML = `${item.svg}<span>${item.label}</span>`;
    menu.append(a);
  });

  const signOut = document.createElement('a');
  signOut.href = '#';
  signOut.className = 'nav-drawer-signout';
  signOut.innerHTML = `${SIGN_OUT_SVG}<span>Sign Out</span>`;
  signOut.addEventListener('click', (e) => {
    e.preventDefault();
    Storage.clearSession();
    window.location.href = '/';
  });
  menu.append(signOut);

  toggle.addEventListener('click', () => {
    const open = section.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  section.append(toggle, menu);
  return section;
}

// Clones the primary nav links and appends auth shortcuts into the mobile drawer.
function buildMobileDrawer(sectionsSource) {
  const { Storage } = window.AdobeSphere;
  const loggedIn = Storage.isLoggedIn();

  const drawer = document.createElement('div');
  drawer.className = 'nav-drawer';
  drawer.setAttribute('aria-label', 'Mobile navigation');

  const list = document.createElement('div');
  list.className = 'nav-drawer-links';
  drawer.append(list);

  if (sectionsSource) {
    sectionsSource.querySelectorAll('a').forEach((a) => {
      if (loggedIn && /join community/i.test(a.textContent.trim())) return;
      const link = document.createElement('a');
      link.href = a.getAttribute('href') || '#';
      link.textContent = a.textContent.trim();
      list.append(link);
    });
  }

  if (loggedIn) {
    const user = Storage.getCurrentUser() || {};
    drawer.append(buildDrawerAccountSection(user));
  } else {
    [
      ['Sign In', '/login'],
      ['Sign Up', '/signup'],
    ].forEach(([label, href]) => {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = label;
      list.append(a);
    });
  }

  return drawer;
}

function toggleDrawer(hamburger, drawer, open) {
  hamburger.classList.toggle('open', open);
  drawer.classList.toggle('open', open);
  hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
}

// Decorates the header block by loading the /nav fragment and adding auth/search controls.
export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';

  let fragment;
  try {
    fragment = await loadFragment(navPath);
  } catch {
    block.innerHTML = `
      <nav id="nav" class="nav-fallback">
        <a class="nav-brand-link" href="/"><span class="adobe">Adobe</span>sphere</a>
      </nav>`;
    return;
  }

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  ['brand', 'sections', 'tools'].forEach((cls, i) => {
    const sec = nav.children[i];
    if (sec) sec.classList.add(`nav-${cls}`);
  });

  const brand = nav.querySelector('.nav-brand');
  if (brand) {
    const link = brand.querySelector('a.button, a');
    if (link) {
      link.className = 'nav-brand-link';
      const wrapper = link.closest('.button-wrapper, .button-container, p');
      if (wrapper) wrapper.className = '';
    }
  }

  const sections = nav.querySelector('.nav-sections');
  if (sections && window.AdobeSphere.Storage.isLoggedIn()) {
    sections.querySelectorAll('a').forEach((a) => {
      if (/join community/i.test(a.textContent.trim())) {
        const li = a.closest('li');
        (li || a).remove();
      }
    });
  }

  // Highlight the active link.
  if (sections) {
    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    sections.querySelectorAll('a').forEach((a) => {
      const href = (a.getAttribute('href') || '').split('?')[0].split('#')[0];
      const normalized = href.replace(/\/$/, '') || '/';
      if (normalized === currentPath) {
        a.setAttribute('aria-current', 'page');
        a.classList.add('active');
      }
    });
  }

  let tools = nav.querySelector('.nav-tools');
  if (!tools) {
    tools = document.createElement('div');
    tools.className = 'nav-tools';
    nav.append(tools);
  }
  tools.append(buildNavSearch());
  tools.append(buildAuthZone());

  const hamburger = document.createElement('button');
  hamburger.type = 'button';
  hamburger.className = 'nav-hamburger';
  hamburger.setAttribute('aria-controls', 'nav-drawer');
  hamburger.setAttribute('aria-label', 'Toggle navigation');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.innerHTML = '<span></span>';
  nav.append(hamburger);

  const drawer = buildMobileDrawer(sections);
  drawer.id = 'nav-drawer';

  hamburger.addEventListener('click', () => {
    const open = !drawer.classList.contains('open');
    toggleDrawer(hamburger, drawer, open);
  });
  drawer.addEventListener('click', (e) => {
    if (e.target.closest('a')) toggleDrawer(hamburger, drawer, false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      toggleDrawer(hamburger, drawer, false);
    }
  });

  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const wrapper = document.createElement('div');
  wrapper.className = 'nav-wrapper';
  wrapper.append(nav);
  wrapper.append(drawer);
  block.append(wrapper);
}
