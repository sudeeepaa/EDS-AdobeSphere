/**
 * AdobeSphere — profile block.
 *
 * Variants (authored as second column in block header row):
 *
 *   (default)  Profile card — avatar, name, bio, socials, save/logout/delete.
 *   creator    Read-only creator hero with API-fetched stats.
 *
 * Section headings, intro copy, and CTAs are authored in the DA.live document.
 * Dashboard sections (published, saved, registrations) use the `cards` block
 * with Source | user-blogs / saved-blogs / saved-events / registered-events.
 *
 * Config rows (key | value):
 *
 *   default:
 *     Avatar Label          | Upload Photo
 *     Name Label            | Full Name
 *     Designation Label     | Role / Designation
 *     Bio Label             | About / Bio
 *     LinkedIn Label        | LinkedIn (optional)
 *     Email Label           | Email
 *     Save CTA              | Save Changes
 *     Logout CTA            | Sign Out
 *     Delete Account Button | Delete Account
 *     Delete Confirm        | Are you sure? This cannot be undone.
 *     Not Logged In         | [rich-text link] Please sign in → /login
 *
 *   creator:
 *     Stat Blogs        | Blogs Published
 *     Stat Events       | Events Hosted
 *     Stat Testimonials | Testimonials
 */

/* ─── Config reader ─── */

function readConfig(block) {
  const cfg = {};
  [...block.children].forEach((row) => {
    if (row.children.length !== 2) return;
    const key = row.children[0].textContent.trim().toLowerCase().replace(/\s+/g, '-');
    const cell = row.children[1];
    cfg[key] = cell.textContent.trim();
    if (key === 'not-logged-in') cfg['not-logged-in-cell'] = cell;
    row.remove();
  });
  return cfg;
}

/* ─── DOM helpers ─── */

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/* ─── Confirmation modal ─── */

function openConfirm(message, confirmLabel, onConfirm) {
  const overlay = el('div', 'profile-modal-overlay');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  const box = el('div', 'profile-modal-box');
  const msg = el('p', 'profile-modal-message', message);
  const footer = el('div', 'profile-modal-footer');
  const cancelBtn = el('button', 'button ghost', 'Cancel');
  cancelBtn.type = 'button';
  const confirmBtn = el('button', 'button danger', confirmLabel);
  confirmBtn.type = 'button';
  const close = () => overlay.remove();
  cancelBtn.addEventListener('click', close);
  confirmBtn.addEventListener('click', () => { close(); onConfirm(); });
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) close(); });
  footer.append(cancelBtn, confirmBtn);
  box.append(msg, footer);
  overlay.append(box);
  document.body.append(overlay);
}

/* ─── Shared: not-logged-in guard ─── */

function showNotLoggedIn(block, cfg) {
  const cell = cfg['not-logged-in-cell'];
  const wrap = el('p', 'profile-empty');
  if (cell) {
    const authored = cell.querySelector('p') || cell;
    while (authored.firstChild) wrap.append(authored.firstChild);
  } else {
    const link = el('a', '', 'sign in');
    link.href = '/login';
    wrap.append(document.createTextNode('Please '), link, document.createTextNode(' to view your profile.'));
  }
  block.append(wrap);
}

/* ═══════════════════════════════════
   DEFAULT — profile card
═══════════════════════════════════ */

function fieldGroup(labelText, inputEl) {
  const group = el('div', 'profile-field-group');
  if (labelText) {
    const lbl = el('label', 'profile-field-label', labelText);
    lbl.htmlFor = inputEl.id || '';
    group.append(lbl);
  }
  group.append(inputEl);
  return group;
}

function renderUser(block, cfg) {
  const { Storage, Utils } = window.AdobeSphere;

  if (!Storage.isLoggedIn()) { showNotLoggedIn(block, cfg); return; }

  const user = Storage.getCurrentUser() || {};

  /* ── avatar ── */
  const avatarWrap = el('div', 'profile-avatar-wrap');
  const avatarImg = el('img', 'profile-avatar');
  avatarImg.src = user.avatarSrc || user.avatar || '/icons/user-default.svg';
  avatarImg.alt = `${user.name || 'User'} avatar`;
  const avatarOverlay = el('label', 'profile-avatar-overlay', cfg['avatar-label'] || 'Upload Photo');
  avatarOverlay.htmlFor = 'profile-avatar-input';
  const avatarInput = document.createElement('input');
  avatarInput.type = 'file';
  avatarInput.id = 'profile-avatar-input';
  avatarInput.accept = 'image/*';
  avatarInput.hidden = true;
  avatarWrap.append(avatarImg, avatarOverlay, avatarInput);

  /* ── always-editable fields ── */
  const fields = el('div', 'profile-fields');

  /* name — h1 display that updates on save, plus editable input below */
  const nameHeading = el('h1', 'profile-name-display', user.name || '');

  const nameInput = el('input', 'form-input');
  nameInput.id = 'profile-name';
  nameInput.type = 'text';
  nameInput.value = user.name || '';
  nameInput.placeholder = cfg['name-label'] || 'Full Name';

  /* email — read-only; just displays the account email */
  const emailEl = el('p', 'profile-email', user.email || '');
  const emailGroup = el('div', 'profile-field-group');
  if (cfg['email-label']) emailGroup.append(el('label', 'profile-field-label', cfg['email-label']));
  emailGroup.append(emailEl);

  const desigInput = el('input', 'form-input');
  desigInput.id = 'profile-designation';
  desigInput.type = 'text';
  desigInput.value = user.designation || '';
  desigInput.placeholder = cfg['designation-label'] || 'Role / Designation';

  const bioInput = el('textarea', 'form-input');
  bioInput.id = 'profile-bio';
  bioInput.rows = 4;
  bioInput.value = user.bio || '';
  bioInput.placeholder = cfg['bio-label'] || 'About / Bio';

  const linkedinInput = el('input', 'form-input');
  linkedinInput.id = 'profile-linkedin';
  linkedinInput.type = 'url';
  linkedinInput.value = (user.socials && user.socials.linkedin) || '';
  linkedinInput.placeholder = 'https://linkedin.com/in/you';

  /* ── action buttons ── */
  const actionsWrap = el('div', 'profile-actions');

  const saveBtn = el('button', 'button primary', cfg['save-cta'] || 'Save Changes');
  saveBtn.type = 'button';
  actionsWrap.append(saveBtn);

  /* Logout — only rendered when authored */
  if (cfg['logout-cta']) {
    const logoutBtn = el('button', 'button ghost', cfg['logout-cta']);
    logoutBtn.type = 'button';
    logoutBtn.addEventListener('click', () => {
      Storage.clearSession();
      Utils.toast('Signed out.', 'success');
      setTimeout(() => { window.location.href = '/'; }, 500);
    });
    actionsWrap.append(logoutBtn);
  }

  fields.append(
    nameHeading,
    fieldGroup(cfg['name-label'], nameInput),
    emailGroup,
    fieldGroup(cfg['designation-label'], desigInput),
    fieldGroup(cfg['bio-label'], bioInput),
    fieldGroup(cfg['linkedin-label'], linkedinInput),
    actionsWrap,
  );

  /* Delete Account — only rendered when authored */
  if (cfg['delete-account-button']) {
    const dangerWrap = el('div', 'profile-danger');
    const deleteBtn = el('button', 'button danger', cfg['delete-account-button']);
    deleteBtn.type = 'button';
    deleteBtn.addEventListener('click', () => {
      openConfirm(
        cfg['delete-confirm'] || 'Are you sure you want to delete your account? This cannot be undone.',
        cfg['delete-account-button'],
        () => {
          Storage.clearSession();
          Utils.toast('Account deleted.', 'success');
          setTimeout(() => { window.location.href = '/'; }, 800);
        },
      );
    });
    dangerWrap.append(deleteBtn);
    fields.append(dangerWrap);
  }

  const card = el('div', 'profile-user');
  card.append(avatarWrap, fields);
  block.append(card);

  /* ── wiring ── */

  avatarInput.addEventListener('change', () => {
    const f = avatarInput.files && avatarInput.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      avatarImg.src = src;
      Storage.upsertUser({ ...Storage.getCurrentUser(), avatarSrc: src });
      Utils.toast('Avatar updated.', 'success');
    };
    reader.readAsDataURL(f);
  });

  saveBtn.addEventListener('click', () => {
    const cur = Storage.getCurrentUser() || {};
    const updates = {
      ...cur,
      name: nameInput.value.trim(),
      designation: desigInput.value.trim(),
      bio: bioInput.value.trim(),
      socials: { ...(cur.socials || {}), linkedin: linkedinInput.value.trim() },
    };
    Storage.upsertUser(updates);
    Storage.setSession({ email: cur.email, name: updates.name });
    nameHeading.textContent = updates.name;
    Utils.toast('Profile saved.', 'success');
  });
}

/* ═══════════════════════════════════
   CREATOR HERO
═══════════════════════════════════ */

async function renderCreator(block, cfg) {
  const { Utils } = window.AdobeSphere;
  const id = new URLSearchParams(window.location.search).get('id')
    || decodeURIComponent(window.location.pathname.split('/').filter(Boolean).pop() || '');
  const creators = await Utils.fetchData('creators');
  const creator = Array.isArray(creators) && creators.find((c) => c.id === id);

  if (!creator) { block.append(el('p', 'profile-empty', 'Creator not found.')); return; }

  const avatar = Utils.normaliseAsset(creator.avatar, '/icons/user-default.svg');
  const stats = creator.stats || {};

  const wrap = el('div', 'profile-creator');

  const img = el('img', 'profile-creator-avatar');
  img.src = avatar;
  img.alt = creator.name || '';

  const text = el('div', 'profile-creator-text');
  text.append(el('h1', '', creator.name || ''), el('p', 'text-muted', creator.designation || ''));

  const statList = el('ul', 'profile-creator-stats');
  [
    [stats.blogsPublished || 0, cfg['stat-blogs'] || 'Blogs Published'],
    [stats.eventsHosted || 0, cfg['stat-events'] || 'Events Hosted'],
    [stats.testimonialsGiven || 0, cfg['stat-testimonials'] || 'Testimonials'],
  ].forEach(([value, label]) => {
    const li = el('li', '');
    li.append(el('strong', '', String(value)), el('span', '', label));
    statList.append(li);
  });

  wrap.append(img, text, statList);
  block.append(wrap);
}

/* ─── Dispatcher ─── */

export default async function decorate(block) {
  const cls = block.classList;
  const cfg = readConfig(block);
  block.textContent = '';

  if (cls.contains('creator')) { await renderCreator(block, cfg); return; }
  renderUser(block, cfg);
}
