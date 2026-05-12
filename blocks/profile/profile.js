// Reads key-value config rows from the block and removes them.
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

// Compresses an image file to max 256px and calls back with a JPEG data URL.
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

// Creates a DOM element with optional class and text content.
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// Opens a confirmation modal with cancel and confirm buttons.
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

// Renders a "not logged in" message using the authored cell content.
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

// Creates a labeled form field group wrapping the given input element.
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

// Renders the user profile card with view and edit modes.
function renderUser(block, cfg) {
  const { Storage, Utils } = window.AdobeSphere;

  if (!Storage.isLoggedIn()) { showNotLoggedIn(block, cfg); return; }

  let user = Storage.getCurrentUser() || {};

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

  const viewSection = el('div', 'profile-view');
  const nameView = el('h2', 'profile-name-display', user.name || '');
  const desigView = el('p', 'profile-view-designation', user.designation || '');
  const emailView = el('p', 'profile-email', user.email || '');

  const viewInfo = el('div', 'profile-view-info');
  viewInfo.append(nameView, desigView, emailView);

  // Refreshes the LinkedIn link in the view section from the current user record.
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

  const fields = el('div', 'profile-fields');
  fields.append(viewSection, editSection);

  const card = el('div', 'profile-user');
  card.append(avatarWrap, fields);
  block.append(card);

  // Switches the card back to view mode.
  function showView() {
    card.classList.remove('editing');
    viewSection.style.display = '';
    editSection.style.display = 'none';
  }

  // Populates edit fields from storage and switches the card to edit mode.
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
    const linkedinRaw = linkedinInput.value.trim();
    if (linkedinRaw) {
      let valid = false;
      try {
        const url = new URL(linkedinRaw);
        const validHost = url.hostname === 'linkedin.com' || /^[a-z0-9-]+\.linkedin\.com$/i.test(url.hostname);
        const validPath = /^\/in\/[A-Za-z0-9\-_%.]{2,}\/?$/.test(url.pathname);
        valid = url.protocol === 'https:' && validHost && validPath;
      } catch { valid = false; }
      if (!valid) {
        linkedinInput.focus();
        Utils.toast('Please enter a valid LinkedIn profile URL (e.g. https://www.linkedin.com/in/your-name/).', 'error');
        return;
      }
    }
    const cur = Storage.getCurrentUser() || {};
    const updates = {
      ...cur,
      name: nameInput.value.trim(),
      designation: desigInput.value.trim(),
      bio: bioInput.value.trim(),
      socials: { ...(cur.socials || {}), linkedin: linkedinRaw },
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
            } catch {}
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

// Renders the read-only creator hero with stats fetched from data/localStorage.
async function renderCreator(block, cfg) {
  const { Utils, Storage } = window.AdobeSphere;
  const id = new URLSearchParams(window.location.search).get('id')
    || decodeURIComponent(window.location.pathname.split('/').filter(Boolean).pop() || '');

  let creator = null;
  const creators = await Utils.fetchData('creators');
  if (Array.isArray(creators)) creator = creators.find((c) => c.id === id) || null;
  if (!creator) creator = Storage.getLocalCreator?.(id) || null;

  if (!creator) { block.append(el('p', 'profile-empty', 'Creator not found.')); return; }

  const avatar = Utils.normaliseAsset(creator.avatar, '/assets/images/profiles/default-user.jpg');
  const stats = creator.stats || {};

  // AEM EDS flattens nested objects/arrays from spreadsheets, so blogIds/eventIds
  // can arrive as bracket-comma strings ("[blog-001,blog-009]") and stats becomes
  // flat fields like stats_blogsPublished.
  const parseList = (v) => {
    if (Array.isArray(v)) return v;
    if (typeof v !== 'string') return [];
    const s = v.trim().replace(/^\[|\]$/g, '').trim();
    return s ? s.split(',').map((x) => x.trim()).filter(Boolean) : [];
  };
  const num = (v) => {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? 0 : n;
  };
  const blogIds = parseList(creator.blogIds);
  const eventIds = parseList(creator.eventIds);
  const blogCount = blogIds.length || num(stats.blogsPublished || creator.stats_blogsPublished);
  const eventCount = eventIds.length || num(stats.eventsHosted || creator.stats_eventsHosted);
  const testimonialCount = num(stats.testimonialsGiven || creator.stats_testimonialsGiven);

  const wrap = el('div', 'profile-creator');

  const img = el('img', 'profile-creator-avatar');
  img.src = avatar;
  img.alt = creator.name || '';

  const text = el('div', 'profile-creator-text');
  text.append(el('h1', '', creator.name || ''), el('p', 'text-muted', creator.designation || ''));

  const statList = el('ul', 'profile-creator-stats');
  [
    [blogCount, cfg['stat-blogs'] || 'Blogs Published'],
    [eventCount, cfg['stat-events'] || 'Events Hosted'],
    [testimonialCount, cfg['stat-testimonials'] || 'Testimonials'],
  ].forEach(([value, label]) => {
    const li = el('li', '');
    li.append(el('strong', '', String(value)), el('span', '', label));
    statList.append(li);
  });

  wrap.append(img, text, statList);
  block.append(wrap);
}

// Dispatches to the correct profile variant (creator or default user).
export default async function decorate(block) {
  const cls = block.classList;
  const cfg = readConfig(block);
  block.textContent = '';

  if (cls.contains('creator')) { await renderCreator(block, cfg); return; }
  renderUser(block, cfg);
}
