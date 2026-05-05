/**
 * AdobeSphere profile block.
 *
 * Variants:
 *   • user    → editable user dashboard (avatar upload, bio, social links).
 *   • creator → read-only creator hero with stats. (Often paired with hero (gradient)
 *               but works standalone too.)
 *
 * Authoring contract: zero authored content. The block reads from session +
 * /data/creators.json depending on variant.
 */

function escapeHtml(v) { return window.AdobeSphere.Utils.escapeHtml(v); }

/* ─── user variant ─── */

function renderUser(block) {
  const { Storage, Utils } = window.AdobeSphere;
  const user = Storage.getCurrentUser() || {};

  block.innerHTML = `
    <div class="profile-user">
      <div class="profile-avatar-wrap">
        <img class="profile-avatar" src="${escapeHtml(user.avatar || '/icons/user-default.svg')}" alt="${escapeHtml(user.name || 'User')} avatar">
        <label class="profile-avatar-overlay" for="profile-avatar-input">Upload Photo</label>
        <input type="file" id="profile-avatar-input" accept="image/*" hidden>
      </div>

      <div class="profile-fields">
        <h1 class="profile-name-display">${escapeHtml(user.name || 'Your Name')}</h1>
        <input class="form-input profile-name-input" type="text" value="${escapeHtml(user.name || '')}" placeholder="Your name" hidden>

        <p class="profile-designation-display text-muted">${escapeHtml(user.designation || 'Add your designation')}</p>
        <input class="form-input profile-designation-input" type="text" value="${escapeHtml(user.designation || '')}" placeholder="Your designation" hidden>

        <p class="profile-bio-display">${escapeHtml(user.bio || 'Add a short bio so other creators can learn more about you.')}</p>
        <textarea class="form-input profile-bio-input" rows="4" placeholder="Write your bio" hidden>${escapeHtml(user.bio || '')}</textarea>

        <div class="profile-socials">
          <label for="profile-linkedin">LinkedIn (optional)</label>
          <input id="profile-linkedin" class="form-input" type="url" placeholder="https://linkedin.com/in/you" value="${escapeHtml((user.socials && user.socials.linkedin) || '')}">
        </div>

        <div class="profile-actions">
          <button type="button" class="button ghost profile-edit">Edit Profile</button>
          <button type="button" class="button primary profile-save" hidden>Save Changes</button>
          <button type="button" class="button ghost profile-cancel" hidden>Cancel</button>
        </div>
      </div>
    </div>`;

  if (!Storage.isLoggedIn()) {
    block.innerHTML = '<p class="profile-empty">Please <a href="/login">sign in</a> to view your profile.</p>';
    return;
  }

  const file = block.querySelector('#profile-avatar-input');
  const avatarImg = block.querySelector('.profile-avatar');
  file.addEventListener('change', () => {
    const f = file.files && file.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      avatarImg.src = reader.result;
      Storage.upsertUser({ ...user, email: user.email, avatar: reader.result });
      Utils.toast('Avatar updated.', 'success');
    };
    reader.readAsDataURL(f);
  });

  const nameD = block.querySelector('.profile-name-display');
  const nameI = block.querySelector('.profile-name-input');
  const desigD = block.querySelector('.profile-designation-display');
  const desigI = block.querySelector('.profile-designation-input');
  const bioD = block.querySelector('.profile-bio-display');
  const bioI = block.querySelector('.profile-bio-input');
  const linkedin = block.querySelector('#profile-linkedin');
  const editBtn = block.querySelector('.profile-edit');
  const saveBtn = block.querySelector('.profile-save');
  const cancelBtn = block.querySelector('.profile-cancel');

  function setEditing(on) {
    [nameD, desigD, bioD].forEach((el) => { el.hidden = on; });
    [nameI, desigI, bioI].forEach((el) => { el.hidden = !on; });
    editBtn.hidden = on;
    saveBtn.hidden = !on;
    cancelBtn.hidden = !on;
  }

  editBtn.addEventListener('click', () => setEditing(true));

  cancelBtn.addEventListener('click', () => {
    nameI.value = user.name || '';
    desigI.value = user.designation || '';
    bioI.value = user.bio || '';
    setEditing(false);
  });

  saveBtn.addEventListener('click', () => {
    const updates = {
      ...user,
      email: user.email,
      name: nameI.value.trim(),
      designation: desigI.value.trim(),
      bio: bioI.value.trim(),
      socials: { ...(user.socials || {}), linkedin: linkedin.value.trim() },
    };
    Storage.upsertUser(updates);
    Storage.setSession({ email: user.email, name: updates.name });
    nameD.textContent = updates.name || 'Your Name';
    desigD.textContent = updates.designation || 'Add your designation';
    bioD.textContent = updates.bio || 'Add a short bio so other creators can learn more about you.';
    setEditing(false);
    Utils.toast('Profile saved.', 'success');
  });
}

/* ─── creator variant ─── */

async function renderCreator(block) {
  const { Utils } = window.AdobeSphere;
  const id = new URLSearchParams(window.location.search).get('id')
    || decodeURIComponent(window.location.pathname.split('/').filter(Boolean).pop() || '');
  const creators = await Utils.fetchData('creators');
  const creator = Array.isArray(creators) && creators.find((c) => c.id === id);

  if (!creator) {
    block.innerHTML = '<p class="profile-empty">Creator not found.</p>';
    return;
  }

  const avatar = Utils.normaliseAsset(creator.avatar, '/icons/user-default.svg');
  const stats = creator.stats || {};

  block.innerHTML = `
    <div class="profile-creator">
      <img class="profile-creator-avatar" src="${escapeHtml(avatar)}" alt="${escapeHtml(creator.name)}">
      <div class="profile-creator-text">
        <h1>${escapeHtml(creator.name || '')}</h1>
        <p class="text-muted">${escapeHtml(creator.designation || '')}</p>
      </div>
      <ul class="profile-creator-stats">
        <li><strong>${escapeHtml(stats.blogsPublished || 0)}</strong><span>Blogs Published</span></li>
        <li><strong>${escapeHtml(stats.eventsHosted || 0)}</strong><span>Events Hosted</span></li>
        <li><strong>${escapeHtml(stats.testimonialsGiven || 0)}</strong><span>Testimonials</span></li>
      </ul>
    </div>`;
}

/* ─── dispatcher ─── */

export default async function decorate(block) {
  const variants = [...block.classList];
  block.textContent = '';
  if (variants.includes('creator')) await renderCreator(block);
  else renderUser(block);
}
