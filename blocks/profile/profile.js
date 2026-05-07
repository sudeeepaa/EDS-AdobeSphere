/**
 * AdobeSphere — profile block.
 *
 * Variants:
 *   • user    → editable user dashboard (avatar, bio, socials, published blogs, saved items, registrations).
 *   • creator → read-only creator hero with stats.
 *
 * DA.live authoring contract — two-column key | value rows:
 *
 * USER variant (| profile | user |):
 *   Avatar Label          | Upload Photo
 *   Name Label            | Full Name
 *   Designation Label     | Role / Designation
 *   Bio Label             | About / Bio
 *   LinkedIn Label        | LinkedIn (optional)
 *   Edit Button           | Edit Profile
 *   Save Button           | Save Changes
 *   Cancel Button         | Cancel
 *   Delete Account Button | Delete Account
 *   Delete Confirm        | Are you sure? This action cannot be undone.
 *   Published Heading     | My Published Blogs
 *   Write Blog CTA        | [rich-text link: Write New Blog → /blog-editor]
 *   Saved Blogs Heading   | Saved Blogs
 *   Saved Events Heading  | Saved Events
 *   Registrations Heading | My Registrations
 *   Empty Published       | You haven't published any blogs yet.
 *   Empty Saved Blogs     | You haven't saved any blogs yet.
 *   Empty Saved Events    | You haven't saved any events yet.
 *   Empty Registrations   | You haven't registered for any events yet.
 *   Not Logged In         | [rich-text] Please sign in → (link to /login)
 *
 * CREATOR variant (| profile | creator |):
 *   Stat Blogs        | Blogs Published
 *   Stat Events       | Events Hosted
 *   Stat Testimonials | Testimonials
 *
 * JS handles only interaction and data binding — all labels come from DA.live.
 */

/* ─── Config reader ─── */

function readConfig(block) {
  const cfg = {};
  [...block.children].forEach((row) => {
    if (row.children.length !== 2) return;
    const key = row.children[0].textContent.trim().toLowerCase().replace(/\s+/g, '-');
    const cell = row.children[1];
    cfg[key] = cell.textContent.trim();
    // Store cell ref for DOM-move on the not-logged-in rich-text row.
    if (key === 'not-logged-in') cfg['not-logged-in-cell'] = cell;
    // Extract href + text from the Write Blog CTA link before row removal.
    if (key === 'write-blog-cta') {
      const a = cell.querySelector('a');
      if (a) {
        cfg['write-blog-cta-href'] = a.getAttribute('href') || '/blog-editor';
        cfg['write-blog-cta'] = a.textContent.trim() || cfg['write-blog-cta'];
      } else {
        cfg['write-blog-cta-href'] = '/blog-editor';
      }
    }
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

/* ─── Not-logged-in state ─── */

function renderNotLoggedIn(block, cfg) {
  const wrap = el('p', 'profile-empty');
  const cell = cfg['not-logged-in-cell'];
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
   PROFILE CARD
═══════════════════════════════════ */

function buildProfileCard(cfg, user) {
  const card = el('div', 'profile-user');

  /* avatar */
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

  /* text fields */
  const fields = el('div', 'profile-fields');

  const nameDisplay = el('h1', 'profile-name-display', user.name || '');
  const nameInput = el('input', 'form-input profile-name-input');
  nameInput.type = 'text';
  nameInput.value = user.name || '';
  nameInput.placeholder = cfg['name-label'] || 'Full Name';
  nameInput.hidden = true;

  const emailDisplay = el('p', 'profile-email', user.email || '');

  const desigDisplay = el('p', 'profile-designation-display', user.designation || '');
  const desigInput = el('input', 'form-input profile-designation-input');
  desigInput.type = 'text';
  desigInput.value = user.designation || '';
  desigInput.placeholder = cfg['designation-label'] || 'Role / Designation';
  desigInput.hidden = true;

  const bioDisplay = el('p', 'profile-bio-display', user.bio || '');
  const bioInput = el('textarea', 'form-input profile-bio-input');
  bioInput.rows = 4;
  bioInput.value = user.bio || '';
  bioInput.placeholder = cfg['bio-label'] || 'About / Bio';
  bioInput.hidden = true;

  /* LinkedIn — always visible input */
  const socialsWrap = el('div', 'profile-socials');
  const linkedinLbl = el('label', '', cfg['linkedin-label'] || 'LinkedIn (optional)');
  linkedinLbl.htmlFor = 'profile-linkedin';
  const linkedinInput = el('input', 'form-input');
  linkedinInput.type = 'url';
  linkedinInput.id = 'profile-linkedin';
  linkedinInput.placeholder = 'https://linkedin.com/in/you';
  linkedinInput.value = (user.socials && user.socials.linkedin) || '';
  socialsWrap.append(linkedinLbl, linkedinInput);

  /* action buttons */
  const actionsWrap = el('div', 'profile-actions');
  const editBtn = el('button', 'button ghost profile-edit', cfg['edit-button'] || 'Edit Profile');
  editBtn.type = 'button';
  const saveBtn = el('button', 'button primary profile-save', cfg['save-button'] || 'Save Changes');
  saveBtn.type = 'button';
  saveBtn.hidden = true;
  const cancelBtn = el('button', 'button ghost profile-cancel', cfg['cancel-button'] || 'Cancel');
  cancelBtn.type = 'button';
  cancelBtn.hidden = true;
  actionsWrap.append(editBtn, saveBtn, cancelBtn);

  /* danger zone */
  const dangerWrap = el('div', 'profile-danger');
  const deleteBtn = el('button', 'button danger profile-delete-btn', cfg['delete-account-button'] || 'Delete Account');
  deleteBtn.type = 'button';
  dangerWrap.append(deleteBtn);

  fields.append(
    nameDisplay, nameInput,
    emailDisplay,
    desigDisplay, desigInput,
    bioDisplay, bioInput,
    socialsWrap,
    actionsWrap,
    dangerWrap,
  );
  card.append(avatarWrap, fields);

  return {
    card,
    avatarImg, avatarInput,
    nameDisplay, nameInput,
    desigDisplay, desigInput,
    bioDisplay, bioInput,
    linkedinInput,
    editBtn, saveBtn, cancelBtn,
    deleteBtn,
  };
}

function wireProfileCard(refs, cfg) {
  const { Storage, Utils } = window.AdobeSphere;
  const {
    avatarImg, avatarInput,
    nameDisplay, nameInput,
    desigDisplay, desigInput,
    bioDisplay, bioInput,
    linkedinInput,
    editBtn, saveBtn, cancelBtn,
    deleteBtn,
  } = refs;

  /* avatar upload */
  avatarInput.addEventListener('change', () => {
    const f = avatarInput.files && avatarInput.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      avatarImg.src = src;
      const cur = Storage.getCurrentUser() || {};
      Storage.upsertUser({ ...cur, avatarSrc: src });
      Utils.toast('Avatar updated.', 'success');
    };
    reader.readAsDataURL(f);
  });

  /* edit mode */
  function setEditing(on) {
    [nameDisplay, desigDisplay, bioDisplay].forEach((e) => { e.hidden = on; });
    [nameInput, desigInput, bioInput].forEach((e) => { e.hidden = !on; });
    editBtn.hidden = on;
    saveBtn.hidden = !on;
    cancelBtn.hidden = !on;
  }

  editBtn.addEventListener('click', () => setEditing(true));

  cancelBtn.addEventListener('click', () => {
    const cur = Storage.getCurrentUser() || {};
    nameInput.value = cur.name || '';
    desigInput.value = cur.designation || '';
    bioInput.value = cur.bio || '';
    setEditing(false);
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
    nameDisplay.textContent = updates.name;
    desigDisplay.textContent = updates.designation;
    bioDisplay.textContent = updates.bio;
    setEditing(false);
    Utils.toast('Profile saved.', 'success');
  });

  /* delete account */
  deleteBtn.addEventListener('click', () => {
    openConfirm(
      cfg['delete-confirm'] || 'Are you sure you want to delete your account? This cannot be undone.',
      cfg['delete-account-button'] || 'Delete Account',
      () => {
        Storage.clearSession();
        Utils.toast('Account deleted.', 'success');
        setTimeout(() => { window.location.href = '/'; }, 800);
      },
    );
  });
}

/* ═══════════════════════════════════
   DASHBOARD SECTIONS
═══════════════════════════════════ */

function buildSection(title) {
  const section = el('div', 'profile-section');
  const header = el('div', 'profile-section-header');
  header.append(el('h2', 'profile-section-title', title));
  const body = el('div', 'profile-section-body');
  section.append(header, body);
  return { section, header, body };
}

function emptyState(msg) {
  return el('p', 'profile-empty-state', msg);
}

function cardActions(...btns) {
  const wrap = el('div', 'profile-card-actions');
  wrap.append(...btns);
  return wrap;
}

/* Published blogs — re-renders from Storage on every delete */
function buildPublishedSection(cfg) {
  const { Storage, Utils } = window.AdobeSphere;
  const { section, header, body } = buildSection(cfg['published-heading'] || 'My Published Blogs');
  const EMPTY = cfg['empty-published'] || "You haven't published any blogs yet.";

  const writeCta = el('a', 'button primary profile-write-cta', cfg['write-blog-cta'] || 'Write New Blog');
  writeCta.href = cfg['write-blog-cta-href'] || '/blog-editor';
  header.append(writeCta);

  function render() {
    body.textContent = '';
    const blogs = Storage.getUserBlogs();
    if (!blogs.length) { body.append(emptyState(EMPTY)); return; }
    blogs.forEach((blog) => {
      const card = el('div', 'profile-blog-card');
      const date = blog.publishedDate || (blog.createdAt && blog.createdAt.slice(0, 10)) || '';
      card.append(
        el('h3', 'profile-card-title', blog.title || 'Untitled Blog'),
        el('p', 'profile-card-meta', date ? new Date(date).toLocaleDateString() : ''),
      );
      const readLink = el('a', 'button ghost', 'Read');
      readLink.href = `/blog/${encodeURIComponent(blog.id)}`;
      const delBtn = el('button', 'button danger', 'Delete');
      delBtn.type = 'button';
      delBtn.addEventListener('click', () => {
        openConfirm('Delete this blog? This cannot be undone.', 'Delete Blog', () => {
          Storage.deleteUserBlog(blog.id);
          Utils.toast('Blog deleted.', 'success');
          render();
        });
      });
      card.append(cardActions(readLink, delBtn));
      body.append(card);
    });
  }

  render();
  return section;
}

/* Saved blogs */
function buildSavedBlogsSection(cfg, savedIds, allBlogs) {
  const { Storage, Utils } = window.AdobeSphere;
  const { section, body } = buildSection(cfg['saved-blogs-heading'] || 'Saved Blogs');
  const EMPTY = cfg['empty-saved-blogs'] || "You haven't saved any blogs yet.";

  if (!savedIds.length) { body.append(emptyState(EMPTY)); return section; }

  savedIds.forEach((id) => {
    const found = allBlogs.find((b) => String(b.id) === String(id))
      || Storage.getUserBlogs().find((b) => String(b.id) === String(id));
    const card = el('div', 'profile-saved-card');
    card.append(el('h3', 'profile-card-title', (found && found.title) || String(id)));

    const readLink = el('a', 'button ghost', 'Read');
    readLink.href = `/blog/${encodeURIComponent(id)}`;
    const unsaveBtn = el('button', 'button ghost', 'Unsave');
    unsaveBtn.type = 'button';
    unsaveBtn.addEventListener('click', () => {
      Storage.toggleSaved('blogs', String(id));
      card.remove();
      if (!body.children.length) body.append(emptyState(EMPTY));
      Utils.toast('Removed from saved.', 'success');
    });
    card.append(cardActions(readLink, unsaveBtn));
    body.append(card);
  });

  return section;
}

/* Saved events */
function buildSavedEventsSection(cfg, savedIds, allEvents) {
  const { Storage, Utils } = window.AdobeSphere;
  const { section, body } = buildSection(cfg['saved-events-heading'] || 'Saved Events');
  const EMPTY = cfg['empty-saved-events'] || "You haven't saved any events yet.";

  if (!savedIds.length) { body.append(emptyState(EMPTY)); return section; }

  savedIds.forEach((id) => {
    const found = allEvents.find((e) => String(e.id) === String(id));
    const card = el('div', 'profile-saved-card');
    card.append(el('h3', 'profile-card-title', (found && found.title) || String(id)));
    if (found && found.date) card.append(el('p', 'profile-card-meta', found.date));

    const viewLink = el('a', 'button ghost', 'View Event');
    viewLink.href = `/event-detail?id=${encodeURIComponent(id)}`;
    const unsaveBtn = el('button', 'button ghost', 'Unsave');
    unsaveBtn.type = 'button';
    unsaveBtn.addEventListener('click', () => {
      Storage.toggleSaved('events', String(id));
      card.remove();
      if (!body.children.length) body.append(emptyState(EMPTY));
      Utils.toast('Event removed from saved.', 'success');
    });
    card.append(cardActions(viewLink, unsaveBtn));
    body.append(card);
  });

  return section;
}

/* Registrations */
function buildRegistrationsSection(cfg, registrations, allEvents) {
  const { Storage, Utils } = window.AdobeSphere;
  const { section, body } = buildSection(cfg['registrations-heading'] || 'My Registrations');
  const EMPTY = cfg['empty-registrations'] || "You haven't registered for any events yet.";

  if (!registrations.length) { body.append(emptyState(EMPTY)); return section; }

  registrations.forEach((reg) => {
    const found = allEvents.find((e) => String(e.id) === String(reg.eventId));
    const card = el('div', 'profile-reg-card');
    card.append(
      el('h3', 'profile-card-title', (found && found.title) || String(reg.eventId)),
      el('p', 'profile-card-meta', `Registered: ${new Date(reg.registeredAt || Date.now()).toLocaleDateString()}`),
    );
    const viewLink = el('a', 'button ghost', 'View Event');
    viewLink.href = `/event-detail?id=${encodeURIComponent(reg.eventId)}`;
    const cancelBtn = el('button', 'button ghost', 'Cancel Registration');
    cancelBtn.type = 'button';
    cancelBtn.addEventListener('click', () => {
      Storage.cancelRegistration(reg.eventId);
      card.remove();
      if (!body.children.length) body.append(emptyState(EMPTY));
      Utils.toast('Registration cancelled.', 'success');
    });
    card.append(cardActions(viewLink, cancelBtn));
    body.append(card);
  });

  return section;
}

/* ═══════════════════════════════════
   RENDERERS
═══════════════════════════════════ */

async function renderUser(block, cfg) {
  const { Storage, Utils } = window.AdobeSphere;

  if (!Storage.isLoggedIn()) { renderNotLoggedIn(block, cfg); return; }

  const user = Storage.getCurrentUser() || {};

  const cardRefs = buildProfileCard(cfg, user);
  wireProfileCard(cardRefs, cfg);
  block.append(cardRefs.card);

  const [allBlogs, allEvents] = await Promise.all([
    Utils.fetchData('blogs').catch(() => []),
    Utils.fetchData('campaigns').catch(() => []),
  ]);

  const dashboard = el('div', 'profile-dashboard');
  dashboard.append(
    buildPublishedSection(cfg),
    buildSavedBlogsSection(cfg, Storage.getSaved('blogs'), allBlogs),
    buildSavedEventsSection(cfg, Storage.getSaved('events'), allEvents),
    buildRegistrationsSection(cfg, Storage.getRegistrations(), allEvents),
  );
  block.append(dashboard);
}

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
  const isCreator = block.classList.contains('creator');
  const cfg = readConfig(block);
  block.textContent = '';
  if (isCreator) await renderCreator(block, cfg);
  else await renderUser(block, cfg);
}
