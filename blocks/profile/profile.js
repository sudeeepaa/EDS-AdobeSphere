/**
 * AdobeSphere — profile block.
 *
 * Variants (authored as second column in block header row):
 *
 *   (default)  Profile card — view mode (avatar/name/designation/email/LinkedIn)
 *              → Edit Profile → edit mode (form fields + Save/Cancel/Delete).
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
 *     LinkedIn Label        | LinkedIn
 *     Email Label           | Email
 *     Edit CTA              | Edit Profile
 *     Save CTA              | Save Changes
 *     Cancel CTA            | Cancel
 *     Logout CTA            | Sign Out
 *     Delete Account Button | Delete My Account
 *     Delete Confirm        | Delete your account? All your data will be permanently removed.
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

/* ─── Avatar compression ─── */

function compressAvatar(file, callback) {
  const MAX = 256;
  const reader = new FileReader();
  reader.onerror = () => callback(null);
  reader.onload = (ev) => {
    const img = new Image();
    img.onerror = () => callback(null);
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale) || MAX;
        const h = Math.round(img.height * scale) || MAX;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        callback(canvas.toDataURL('image/jpeg', 0.85));
      } catch {
        callback(null);
      }
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
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

  let user = Storage.getCurrentUser() || {};

  /* ── avatar ── */
  const avatarWrap = el('div', 'profile-avatar-wrap');
  const avatarImg = el('img', 'profile-avatar');
  avatarImg.src = user.avatarSrc || user.avatar || '/assets/images/profiles/default-user.jpg';
  avatarImg.alt = `${user.name || 'User'} avatar`;
  const avatarOverlay = el('label', 'profile-avatar-overlay', cfg['avatar-label'] || 'Upload Photo');
  avatarOverlay.htmlFor = 'profile-avatar-input';
  const avatarInput = document.createElement('input');
  avatarInput.type = 'file';
  avatarInput.id = 'profile-avatar-input';
  avatarInput.accept = 'image/*';
  avatarInput.hidden = true;
  avatarWrap.append(avatarImg, avatarOverlay, avatarInput);

  /* ── VIEW section ── */
  const viewSection = el('div', 'profile-view');
  const nameView = el('h2', 'profile-name-display', user.name || '');
  const desigView = el('p', 'profile-view-designation', user.designation || '');
  const emailView = el('p', 'profile-email', user.email || '');

  const viewInfo = el('div', 'profile-view-info');
  viewInfo.append(nameView, desigView, emailView);

  function refreshLinkedin() {
    const existing = viewInfo.querySelector('.profile-linkedin-link');
    const linkedin = (Storage.getCurrentUser() || {}).socials?.linkedin || '';
    if (linkedin) {
      if (existing) {
        existing.href = linkedin;
        existing.textContent = cfg['linkedin-label'] || 'LinkedIn';
      } else {
        const a = el('a', 'profile-linkedin-link', cfg['linkedin-label'] || 'LinkedIn');
        a.href = linkedin;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        viewInfo.append(a);
      }
    } else if (existing) {
      existing.remove();
    }
  }
  refreshLinkedin();

  const editProfileBtn = el('button', 'button secondary', cfg['edit-cta'] || 'Edit Profile');
  editProfileBtn.type = 'button';

  const viewActions = el('div', 'profile-actions');
  viewActions.append(editProfileBtn);

  if (cfg['logout-cta']) {
    const logoutBtn = el('button', 'button ghost', cfg['logout-cta']);
    logoutBtn.type = 'button';
    logoutBtn.addEventListener('click', () => {
      Storage.clearSession();
      Utils.toast('Signed out.', 'success');
      setTimeout(() => { window.location.href = '/'; }, 500);
    });
    viewActions.append(logoutBtn);
  }

  viewSection.append(viewInfo, viewActions);

  /* ── EDIT section ── */
  const editSection = el('div', 'profile-edit');
  editSection.style.display = 'none';

  const nameInput = el('input', 'form-input');
  nameInput.id = 'profile-name';
  nameInput.type = 'text';
  nameInput.placeholder = cfg['name-label'] || 'Full Name';

  const desigInput = el('input', 'form-input');
  desigInput.id = 'profile-designation';
  desigInput.type = 'text';
  desigInput.placeholder = cfg['designation-label'] || 'Role / Designation';

  const bioInput = el('textarea', 'form-input');
  bioInput.id = 'profile-bio';
  bioInput.rows = 4;
  bioInput.placeholder = cfg['bio-label'] || 'About / Bio';

  const linkedinInput = el('input', 'form-input');
  linkedinInput.id = 'profile-linkedin';
  linkedinInput.type = 'url';
  linkedinInput.placeholder = 'https://linkedin.com/in/you';

  const editActions = el('div', 'profile-actions');
  const saveBtn = el('button', 'button primary', cfg['save-cta'] || 'Save Changes');
  saveBtn.type = 'button';
  const cancelBtn = el('button', 'button ghost', cfg['cancel-cta'] || 'Cancel');
  cancelBtn.type = 'button';
  editActions.append(saveBtn, cancelBtn);

  const dangerWrap = el('div', 'profile-danger');
  const deleteBtn = el('button', 'button danger', cfg['delete-account-button'] || 'Delete My Account');
  deleteBtn.type = 'button';
  dangerWrap.append(deleteBtn);

  editSection.append(
    fieldGroup(cfg['name-label'], nameInput),
    fieldGroup(cfg['designation-label'], desigInput),
    fieldGroup(cfg['bio-label'], bioInput),
    fieldGroup(cfg['linkedin-label'], linkedinInput),
    editActions,
    dangerWrap,
  );

  /* ── assemble card ── */
  const fields = el('div', 'profile-fields');
  fields.append(viewSection, editSection);

  const card = el('div', 'profile-user');
  card.append(avatarWrap, fields);
  block.append(card);

  /* ── toggle helpers ── */
  function showView() {
    card.classList.remove('editing');
    viewSection.style.display = '';
    editSection.style.display = 'none';
  }

  function showEdit() {
    user = Storage.getCurrentUser() || {};
    nameInput.value = user.name || '';
    desigInput.value = user.designation || '';
    bioInput.value = user.bio || '';
    linkedinInput.value = (user.socials && user.socials.linkedin) || '';
    card.classList.add('editing');
    viewSection.style.display = 'none';
    editSection.style.display = '';
  }

  /* ── wiring ── */
  editProfileBtn.addEventListener('click', showEdit);
  cancelBtn.addEventListener('click', showView);

  avatarInput.addEventListener('change', () => {
    const f = avatarInput.files && avatarInput.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      Utils.toast('Image must be under 5 MB.', 'error');
      return;
    }
    compressAvatar(f, (src) => {
      if (!src) { Utils.toast('Could not read image.', 'error'); return; }
      avatarImg.src = src;
      Storage.upsertUser({ ...Storage.getCurrentUser(), avatarSrc: src });
      window.dispatchEvent(new CustomEvent('adobesphere:avatar-updated', { detail: src }));
      Utils.toast('Photo updated.', 'success');
    });
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
    nameView.textContent = updates.name;
    desigView.textContent = updates.designation;
    refreshLinkedin();
    Utils.toast('Profile saved.', 'success');
    showView();
  });

  deleteBtn.addEventListener('click', () => {
    openConfirm(
      cfg['delete-confirm'] || 'Delete your account? All your data will be permanently removed.',
      cfg['delete-account-button'] || 'Delete My Account',
      () => {
        const email = (Storage.getSession() || {}).email;
        if (email) {
          ['adobesphere_users', 'adobesphere_saved', 'adobesphere_registrations',
            'adobesphere_user_blogs', 'adobesphere_local_creators'].forEach((key) => {
            try {
              const data = JSON.parse(localStorage.getItem(key) || '{}');
              delete data[email];
              localStorage.setItem(key, JSON.stringify(data));
            } catch { /* noop */ }
          });
          localStorage.removeItem(`adobesphere_profile_${email}`);
        }
        Storage.clearSession();
        Utils.toast('Account deleted.', 'success');
        setTimeout(() => { window.location.href = '/'; }, 800);
      },
    );
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
