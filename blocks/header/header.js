import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const isDesktop = window.matchMedia('(min-width: 768px)');

// Builds the search icon button that redirects/focuses the Explore search.
function buildNavSearch() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-search';
  btn.setAttribute('aria-label', 'Search');
  btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

// Builds the auth zone showing Sign In/Up links or inline action icons + avatar.
function buildAuthZone() {
  const { Storage, Utils } = window.AdobeSphere;
  const wrap = document.createElement('div');
  wrap.className = 'nav-auth';

  if (!Storage.isLoggedIn()) {
    wrap.innerHTML = `
      <a class="button ghost" href="/login">Sign In</a>
      <a class="button primary" href="/signup">Sign Up</a>`;
    return wrap;
  }

  const user = Storage.getCurrentUser() || {};
  const DEFAULT_AVATAR = '/assets/images/profiles/default-user.jpg';
  const avatar = Utils.escapeHtml(user.avatarSrc || user.avatar || DEFAULT_AVATAR);
  const displayName = Utils.escapeHtml(user.name || 'User');

  const userDiv = document.createElement('div');
  userDiv.className = 'nav-user';

  const NAV_ACTIONS = [
    {
      href: '/user-profile#saved',
      label: 'My Saved Items',
      svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 3H18C18.55 3 19 3.45 19 4V21L12 17L5 21V4C5 3.45 5.45 3 6 3Z"
          stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>`,
    },
    {
      href: '/blog-editor',
      label: 'Write a Blog',
      svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M11 4H4C3.45 4 3 4.45 3 5V20C3 20.55 3.45 21 4 21H19C19.55 21 20 20.55 20 20V13"
          stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M17.5 2.5C18.33 1.67 19.67 1.67 20.5 2.5C21.33 3.33 21.33 4.67 20.5 5.5L12 14L8 15L9 11L17.5 2.5Z"
          stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>`,
    },
    {
      href: `/creator-profile?id=${encodeURIComponent(user.email)}`,
      label: 'My Creator Profile',
      svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.8"/>
        <path d="M5 20C5 17.24 8.13 15 12 15C15.87 15 19 17.24 19 20"
          stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M19 2L19.9 4.6L22.5 5.5L19.9 6.4L19 9L18.1 6.4L15.5 5.5L18.1 4.6L19 2Z"
          stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
      </svg>`,
    },
  ];

  NAV_ACTIONS.forEach(({ href, label, svg }) => {
    const a = document.createElement('a');
    a.className = 'nav-action-icon';
    a.href = href;
    a.setAttribute('aria-label', label);
    a.dataset.tooltip = label;
    a.innerHTML = svg;
    userDiv.append(a);
  });

  const avatarLink = document.createElement('a');
  avatarLink.className = 'nav-avatar-link';
  avatarLink.href = '/user-profile';
  avatarLink.setAttribute('aria-label', 'My Profile');
  avatarLink.innerHTML = `<img class="nav-avatar" src="${avatar}" alt="${displayName} avatar">`;
  userDiv.append(avatarLink);

  wrap.append(userDiv);

  window.addEventListener('adobesphere:avatar-updated', (e) => {
    const navAvatar = wrap.querySelector('.nav-avatar');
    if (navAvatar && e.detail) navAvatar.src = e.detail;
  });

  return wrap;
}

// Sets the nav's aria-expanded attribute and body overflow for the mobile menu.
function toggleMobileMenu(nav, expanded) {
  nav.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  document.body.style.overflowY = expanded ? 'hidden' : '';
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

  let tools = nav.querySelector('.nav-tools');
  if (!tools) {
    tools = document.createElement('div');
    tools.className = 'nav-tools';
    nav.append(tools);
  }
  tools.append(buildNavSearch());
  tools.append(buildAuthZone());

  if (window.AdobeSphere.Storage.isLoggedIn()) {
    const sections = nav.querySelector('.nav-sections');
    if (sections) {
      sections.querySelectorAll('a').forEach((a) => {
        if (/join community/i.test(a.textContent.trim())) {
          const li = a.closest('li');
          (li || a).remove();
        }
      });
    }
  }

  const hamburger = document.createElement('button');
  hamburger.type = 'button';
  hamburger.className = 'nav-hamburger';
  hamburger.setAttribute('aria-controls', 'nav');
  hamburger.setAttribute('aria-label', 'Toggle navigation');
  hamburger.innerHTML = '<span></span><span></span><span></span>';
  hamburger.addEventListener('click', () => {
    const expanded = nav.getAttribute('aria-expanded') !== 'true';
    toggleMobileMenu(nav, expanded);
  });
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');

  isDesktop.addEventListener('change', () => toggleMobileMenu(nav, false));

  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const wrapper = document.createElement('div');
  wrapper.className = 'nav-wrapper';
  wrapper.append(nav);
  block.append(wrapper);
}
