import { getMetadata } from '../../scripts/aem.js';
import authInit, { getUser, isLoggedIn, logout } from '../../scripts/auth.js';
import { normalizeAssetSrc } from '../../scripts/utils.js';
import { loadFragment } from '../fragment/fragment.js';

const isDesktop = window.matchMedia('(min-width: 900px)');
const DEFAULT_AVATAR = '/assets/images/profiles/default-user.jpg';

function splitBrandText(text) {
  const clean = String(text || 'Adobesphere').trim() || 'Adobesphere';
  const lowered = clean.toLowerCase();
  const adobeIndex = lowered.indexOf('adobe');

  if (adobeIndex === -1) {
    return { prefix: clean, suffix: '' };
  }

  const before = clean.slice(0, adobeIndex);
  const after = clean.slice(adobeIndex + 5);
  return { prefix: `${before}Adobe`, suffix: after };
}

function buildBrandSection(section) {
  const link = section?.querySelector('a[href]');
  const image = section?.querySelector('img');
  const brand = document.createElement('div');
  brand.className = 'nav-brand';

  const anchor = document.createElement('a');
  anchor.className = 'nav-brand-link';
  anchor.href = link?.getAttribute('href') || '/';
  anchor.setAttribute('aria-label', 'Adobesphere Home');

  const logo = document.createElement('img');
  logo.src = normalizeAssetSrc(image?.getAttribute('src') || '/assets/images/branding/adobe-ecosystem-wordmark.png');
  logo.alt = image?.getAttribute('alt') || 'Adobesphere';
  anchor.append(logo);

  const textWrap = document.createElement('span');
  textWrap.className = 'nav-brand-text';

  const text = link?.textContent || 'Adobesphere';
  const { prefix, suffix } = splitBrandText(text);

  const adobeText = document.createElement('span');
  adobeText.className = 'adobe';
  adobeText.textContent = prefix;
  textWrap.append(adobeText);
  textWrap.append(document.createTextNode(suffix));

  anchor.append(textWrap);
  brand.append(anchor);
  return brand;
}

function buildLinksSection(section) {
  const linksWrap = document.createElement('div');
  linksWrap.className = 'nav-links';

  const list = document.createElement('div');
  list.className = 'nav-links-list';

  section?.querySelectorAll('a[href]').forEach((source) => {
    const link = document.createElement('a');
    link.href = source.getAttribute('href') || '/';
    link.textContent = String(source.textContent || '').trim();
    list.append(link);
  });

  linksWrap.append(list);
  return linksWrap;
}

function buildActionsSection(section) {
  const actions = document.createElement('div');
  actions.className = 'nav-actions';

  const auth = document.createElement('div');
  auth.className = 'nav-auth';

  const links = [...(section?.querySelectorAll('a[href]') || [])];
  const signInSource = links[0];
  const signUpSource = links[1];

  const signIn = document.createElement('a');
  signIn.className = 'btn btn-ghost';
  signIn.dataset.signin = 'true';
  signIn.href = signInSource?.getAttribute('href') || '/login';
  signIn.textContent = String(signInSource?.textContent || 'Sign In').trim() || 'Sign In';

  const signUp = document.createElement('a');
  signUp.className = 'btn btn-primary';
  signUp.dataset.signup = 'true';
  signUp.href = signUpSource?.getAttribute('href') || '/signup';
  signUp.textContent = String(signUpSource?.textContent || 'Sign Up').trim() || 'Sign Up';

  auth.append(signIn, signUp);

  const userMenu = document.createElement('div');
  userMenu.className = 'nav-user nav-auth-hidden';

  const avatarButton = document.createElement('button');
  avatarButton.className = 'nav-avatar-button';
  avatarButton.type = 'button';
  avatarButton.setAttribute('aria-haspopup', 'true');
  avatarButton.setAttribute('aria-expanded', 'false');
  avatarButton.setAttribute('aria-label', 'Open user menu');

  const avatar = document.createElement('img');
  avatar.className = 'nav-avatar';
  avatar.src = normalizeAssetSrc(DEFAULT_AVATAR);
  avatar.alt = 'User avatar';
  avatarButton.append(avatar);

  const dropdown = document.createElement('div');
  dropdown.className = 'nav-dropdown';
  dropdown.setAttribute('role', 'menu');

  const menuItems = [
    { href: '/user-profile', text: 'My Profile' },
    { href: '/user-profile#saved', text: 'My Saved Items' },
    { href: '/blog-editor', text: 'Write a Blog' },
  ];

  menuItems.forEach((item) => {
    const link = document.createElement('a');
    link.href = item.href;
    link.textContent = item.text;
    dropdown.append(link);
  });

  const signOut = document.createElement('button');
  signOut.type = 'button';
  signOut.className = 'nav-signout';
  signOut.textContent = 'Sign Out';
  dropdown.append(signOut);

  userMenu.append(avatarButton, dropdown);
  actions.append(auth, userMenu);

  return {
    actions,
    auth,
    userMenu,
    avatar,
    avatarButton,
    dropdown,
    signOut,
  };
}

function setActiveLinks(nav) {
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  nav.querySelectorAll('.nav-links-list a').forEach((link) => {
    const linkPath = new URL(link.href, window.location.origin).pathname.replace(/\/$/, '') || '/';
    if (linkPath === currentPath) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function setMenuState(nav, expanded) {
  nav.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  const button = nav.querySelector('.nav-hamburger');
  if (button) button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  document.body.style.overflowY = expanded && !isDesktop.matches ? 'hidden' : '';
}

function closeUserMenu(avatarButton, dropdown) {
  avatarButton.setAttribute('aria-expanded', 'false');
  dropdown.classList.remove('open');
}

function bindAccessibility(nav, avatarButton, dropdown) {
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Escape') return;

    if (dropdown.classList.contains('open')) {
      closeUserMenu(avatarButton, dropdown);
      avatarButton.focus();
      return;
    }

    if (nav.getAttribute('aria-expanded') === 'true' && !isDesktop.matches) {
      setMenuState(nav, false);
      nav.querySelector('.nav-hamburger')?.focus();
    }
  });

  nav.addEventListener('focusout', (event) => {
    if (!nav.contains(event.relatedTarget)) {
      setMenuState(nav, false);
      closeUserMenu(avatarButton, dropdown);
    }
  });

  document.addEventListener('click', (event) => {
    if (!nav.contains(event.target)) {
      closeUserMenu(avatarButton, dropdown);
    }
  });
}

function syncAuthUI(auth, userMenu, avatar) {
  const loggedIn = isLoggedIn();
  const user = getUser();

  auth.classList.toggle('nav-auth-hidden', loggedIn);
  userMenu.classList.toggle('nav-auth-hidden', !loggedIn);

  if (avatar) {
    const desiredAvatar = user?.avatarSrc || user?.avatar || DEFAULT_AVATAR;
    avatar.src = normalizeAssetSrc(desiredAvatar, normalizeAssetSrc(DEFAULT_AVATAR));
    avatar.alt = `${user?.name || 'User'} avatar`;
  }
}

export default async function decorate(block) {
  authInit();

  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);
  if (!fragment) return;

  // The fragment might contain sections (if separated by ---) or just blocks
  const sections = [...fragment.querySelectorAll(':scope > .section')];
  
  // Try to find the 'nav' block first, as it's common in EDS
  const navBlock = fragment.querySelector('.nav');
  let brandSection, linksSection, actionsSection;

  if (navBlock) {
    // If there's a nav block, extract its rows
    const rows = [...navBlock.querySelectorAll(':scope > div')];
    brandSection = rows[0];
    linksSection = rows[1];
    actionsSection = rows[2];
  } else {
    // Fallback to sections or direct children
    brandSection = sections[0] || fragment.firstElementChild;
    linksSection = sections[1] || (sections[0] ? null : fragment.children[1]);
    actionsSection = sections[2] || (sections[0] ? null : fragment.children[2]);
  }

  block.textContent = '';

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.className = 'nav-shell';
  nav.setAttribute('aria-expanded', 'false');

  const hamburger = document.createElement('button');
  hamburger.type = 'button';
  hamburger.className = 'nav-hamburger';
  hamburger.setAttribute('aria-label', 'Toggle navigation');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.innerHTML = '<span></span>';

  const brand = buildBrandSection(brandSection);
  const links = buildLinksSection(linksSection);
  const {
    actions,
    auth,
    userMenu,
    avatar,
    avatarButton,
    dropdown,
    signOut,
  } = buildActionsSection(actionsSection);

  nav.append(hamburger, brand, links, actions);

  hamburger.addEventListener('click', () => {
    const expanded = nav.getAttribute('aria-expanded') === 'true';
    setMenuState(nav, !expanded);
  });

  isDesktop.addEventListener('change', () => {
    setMenuState(nav, false);
  });

  avatarButton.addEventListener('click', (event) => {
    event.stopPropagation();
    const expanded = avatarButton.getAttribute('aria-expanded') === 'true';
    avatarButton.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    dropdown.classList.toggle('open', !expanded);
  });

  signOut.addEventListener('click', () => {
    closeUserMenu(avatarButton, dropdown);
    logout();
  });

  bindAccessibility(nav, avatarButton, dropdown);
  setActiveLinks(nav);
  syncAuthUI(auth, userMenu, avatar);

  // Scroll listener for transparent -> white header transition
  const handleScroll = () => {
    const scrolled = window.scrollY > 50;
    block.classList.toggle('is-scrolled', scrolled);
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // Initial check

  document.addEventListener('auth:changed', (event) => {
    const detail = event?.detail || {};
    auth.classList.toggle('nav-auth-hidden', !!detail.loggedIn);
    userMenu.classList.toggle('nav-auth-hidden', !detail.loggedIn);

    if (avatar) {
      const user = detail.user || getUser();
      const desiredAvatar = user?.avatarSrc || user?.avatar || DEFAULT_AVATAR;
      avatar.src = normalizeAssetSrc(desiredAvatar, normalizeAssetSrc(DEFAULT_AVATAR));
      avatar.alt = `${user?.name || 'User'} avatar`;
    }
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.classList.add('header');
  block.append(navWrapper);
}
