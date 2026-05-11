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

// Builds the auth zone showing Sign In/Up links or a user avatar dropdown.
function buildAuthZone() {
  const { Storage, Utils } = window.AdobeSphere;
  const wrap = document.createElement('div');
  wrap.className = 'nav-auth';

  const loggedIn = Storage.isLoggedIn();

  if (!loggedIn) {
    wrap.innerHTML = `
      <a class="button ghost" href="/login">Sign In</a>
      <a class="button primary" href="/signup">Sign Up</a>`;
    return wrap;
  }

  const user = Storage.getCurrentUser() || {};
  const DEFAULT_AVATAR = '/assets/images/profiles/default-user.jpg';
  const avatar = Utils.escapeHtml(user.avatarSrc || user.avatar || DEFAULT_AVATAR);
  const displayName = Utils.escapeHtml(user.name || 'User');
  wrap.innerHTML = `
    <div class="nav-user">
      <button type="button" class="nav-user-toggle" aria-haspopup="true" aria-expanded="false" aria-label="Account menu">
        <img class="nav-avatar" src="${avatar}" alt="${displayName} avatar">
      </button>
      <div class="nav-user-menu" role="menu">
        <a href="/user-profile" role="menuitem">My Profile</a>
        <a href="/creator-profile?id=${encodeURIComponent(user.email)}" role="menuitem">My Creator Profile</a>
        <a href="/user-profile#saved" role="menuitem">My Saved Items</a>
        <a href="/blog-editor" role="menuitem">Write a Blog</a>
        <button type="button" class="nav-signout" role="menuitem">Sign Out</button>
      </div>
    </div>`;

  const toggle = wrap.querySelector('.nav-user-toggle');
  const menu = wrap.querySelector('.nav-user-menu');
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  wrap.querySelector('.nav-signout').addEventListener('click', () => {
    Storage.clearSession();
    window.location.href = '/';
  });

  wrap.querySelectorAll('.nav-user-menu a[href*="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const url = new URL(link.href, window.location.origin);
      if (url.pathname === window.location.pathname && url.hash) {
        const target = document.getElementById(url.hash.slice(1));
        if (target) {
          e.preventDefault();
          menu.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

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
