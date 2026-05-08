/**
 * AdobeSphere universal form block.
 *
 * Variants (block class): contact | login | signup | event-registration | blog-editor.
 *
 * All two-cell rows are read as config and removed before render.
 * Keys are lowercased and spaces normalised to hyphens.
 */

function readConfig(block) {
  const cfg = {};
  [...block.children].forEach((row) => {
    if (row.children.length !== 2) return;
    const k = row.children[0].textContent.trim().toLowerCase().replace(/\s+/g, '-');
    cfg[k] = row.children[1].textContent.trim();
    row.remove();
  });
  return cfg;
}

function escapeHtml(v) { return window.AdobeSphere.Utils.escapeHtml(v); }

function showFieldError(input, msg) {
  input.classList.add('error');
  let err = input.parentElement.querySelector('.form-error');
  if (!err) {
    err = document.createElement('span');
    err.className = 'form-error';
    input.parentElement.append(err);
  }
  err.textContent = msg;
}

function clearFieldError(input) {
  input.classList.remove('error');
  const err = input.parentElement.querySelector('.form-error');
  if (err) err.textContent = '';
}

/* ─────────── LOGIN / SIGNUP ─────────── */
/* Moved to the auth-form block (blocks/auth-form/).                      */
/* Pages should use: auth-form (signin) | auth-form (signup)              */

/* ─────────── EVENT REGISTRATION ─────────── */
// The registration form renders as a modal overlay that is hidden by default.
// It opens when `event-actions.js` fires `adobesphere:show-registration` and
// closes on successful submission or when the user clicks the backdrop/close.

function renderEventRegistration(block, cfg) {
  // Wrap the entire form in a modal overlay so it is invisible until triggered.
  block.innerHTML = `
    <div class="modal-overlay form-registration-overlay" role="dialog" aria-modal="true" aria-label="Event registration">
      <div class="modal-box form-registration-box">
        <button type="button" class="modal-close form-reg-close" aria-label="Close">&times;</button>
        <form class="form form-registration" novalidate>
          <h2>${escapeHtml(cfg.title || 'Register for this Event')}</h2>
          <p class="text-muted">Fill in your preferences to confirm registration.</p>

          <div class="form-group">
            <label for="r-food">Food Preference</label>
            <select id="r-food" class="form-input" required>
              <option value="">Select preference</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="non-vegetarian">Non-Vegetarian</option>
              <option value="gluten-free">Gluten-Free</option>
              <option value="no-preference">No Preference</option>
            </select>
          </div>

          <div class="form-group">
            <label>Will you bring a companion?</label>
            <div class="form-radios">
              <label><input type="radio" name="companion" value="no" checked> No</label>
              <label><input type="radio" name="companion" value="yes"> Yes (max 2)</label>
            </div>
          </div>

          <div class="companion-fields" hidden>
            <div class="companion-block">
              <p>Companion 1</p>
              <div class="form-group"><label>Name</label><input type="text" class="form-input" data-companion="1-name"></div>
              <div class="form-group"><label>Email</label><input type="email" class="form-input" data-companion="1-email"></div>
              <div class="form-group"><label>Age</label><input type="number" class="form-input" data-companion="1-age" min="1" max="120"></div>
            </div>
            <div class="companion-block">
              <p>Companion 2 (optional)</p>
              <div class="form-group"><label>Name</label><input type="text" class="form-input" data-companion="2-name"></div>
              <div class="form-group"><label>Email</label><input type="email" class="form-input" data-companion="2-email"></div>
              <div class="form-group"><label>Age</label><input type="number" class="form-input" data-companion="2-age" min="1" max="120"></div>
            </div>
          </div>

          <p class="form-error form-error-global"></p>
          <button type="submit" class="button primary">${escapeHtml(cfg.submit || 'Confirm Registration')}</button>
        </form>
      </div>
    </div>`;

  const overlay = block.querySelector('.form-registration-overlay');
  const form = block.querySelector('form');
  const compFields = form.querySelector('.companion-fields');

  const openModal = () => { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const closeModal = () => { overlay.classList.remove('open'); document.body.style.overflow = ''; };

  // Close on backdrop click or close button
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  block.querySelector('.form-reg-close').addEventListener('click', closeModal);

  // Open when event-actions fires the show-registration event
  window.addEventListener('adobesphere:show-registration', openModal);

  form.querySelectorAll('[name="companion"]').forEach((r) => r.addEventListener('change', (e) => {
    compFields.hidden = e.target.value === 'no';
  }));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const food = form.querySelector('#r-food');
    const errEl = form.querySelector('.form-error-global');
    errEl.textContent = '';
    clearFieldError(food);

    if (!food.value) { showFieldError(food, 'Food preference is required.'); return; }

    const { Storage, Utils } = window.AdobeSphere;
    if (!Storage.isLoggedIn()) {
      errEl.textContent = 'Please sign in first to register.';
      return;
    }

    // Pull event id from URL params or the last URL segment.
    const eventId = new URLSearchParams(window.location.search).get('id')
      || document.querySelector('meta[name="event-id"]')?.content
      || window.location.pathname.split('/').filter(Boolean).pop();
    Storage.registerForEvent(eventId, { food: food.value });
    Utils.toast(cfg.success || 'You\'re registered. See you there!', 'success');
    closeModal();
    // Notify event-actions to update its button state
    window.dispatchEvent(new CustomEvent('adobesphere:registration-changed', { detail: eventId }));
    if (cfg.after) setTimeout(() => { window.location.href = cfg.after; }, 800);
  });
}

/* ─────────── BLOG EDITOR ─────────── */

const BE_DEFAULT_CATEGORY = 'Community / Events / Creator Programs';
const BE_OTHER_VALUE = '__other__';

function isSafeImageSrc(src) {
  const v = String(src || '').trim();
  if (!v) return true; // empty = no image, allowed
  return /^https?:\/\//i.test(v) || /^(\/|\.{1,2}[/\\]|assets[/\\])/i.test(v);
}

function makeGroup(labelText, input) {
  const div = document.createElement('div');
  div.className = 'form-group';
  const lbl = document.createElement('label');
  lbl.textContent = labelText;
  lbl.htmlFor = input.id;
  div.append(lbl, input);
  return div;
}

async function buildCategorySelect(selectEl, otherEl) {
  const { Storage, Utils } = window.AdobeSphere;

  function setOtherVisible(visible) {
    otherEl.hidden = !visible;
    if (!visible) otherEl.value = '';
  }

  function renderOptions(cats) {
    const current = selectEl.value;
    while (selectEl.firstChild) selectEl.removeChild(selectEl.firstChild);
    cats.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      selectEl.append(opt);
    });
    const otherOpt = document.createElement('option');
    otherOpt.value = BE_OTHER_VALUE;
    otherOpt.textContent = 'Other…';
    selectEl.append(otherOpt);
    const restore = cats.includes(current) ? current : BE_DEFAULT_CATEGORY;
    selectEl.value = restore;
    setOtherVisible(selectEl.value === BE_OTHER_VALUE);
  }

  selectEl.addEventListener('change', () => {
    setOtherVisible(selectEl.value === BE_OTHER_VALUE);
    if (selectEl.value === BE_OTHER_VALUE) otherEl.focus();
  });

  function uniquePush(list, seen, val) {
    const v = String(val || '').trim();
    if (!v) return;
    const k = v.toLowerCase();
    if (seen[k]) return;
    seen[k] = true;
    list.push(v);
  }

  try {
    const blogs = await Utils.fetchData('blogs') || [];
    const userBlogs = Storage.getUserBlogs() || [];
    const stored = Storage.getBlogCategories() || [];
    const list = [];
    const seen = {};
    [...blogs, ...userBlogs].forEach((b) => uniquePush(list, seen, b && b.category));
    stored.forEach((c) => uniquePush(list, seen, c));
    uniquePush(list, seen, BE_DEFAULT_CATEGORY);
    list.sort((a, b) => a.localeCompare(b));
    renderOptions(list);
  } catch {
    const stored = Storage.getBlogCategories() || [];
    const list = [BE_DEFAULT_CATEGORY, ...stored];
    const seen = {};
    renderOptions(list.filter((c) => {
      const k = String(c || '').trim().toLowerCase();
      if (!k || seen[k]) return false;
      seen[k] = true;
      return true;
    }).sort((a, b) => a.localeCompare(b)));
  }
}

function loadBlogForEdit(blogId, fields) {
  const { Storage } = window.AdobeSphere;
  const blog = Storage.getUserBlogById(blogId);
  if (!blog) return false;
  const { titleI, bodyI, catSel, otherI, imageI, submitBtn } = fields;
  titleI.value = blog.title || '';
  bodyI.value = typeof blog.body === 'string' ? blog.body
    : (blog.content || []).filter((b) => b.type === 'paragraph').map((b) => b.text).join('\n\n');
  const cat = String(blog.category || '').trim();
  const optExists = [...catSel.options].some((o) => o.value === cat);
  if (cat && optExists) {
    catSel.value = cat;
    otherI.hidden = true;
  } else if (cat) {
    catSel.value = BE_OTHER_VALUE;
    otherI.hidden = false;
    otherI.value = cat;
  }
  imageI.value = blog.coverImage || '';
  submitBtn.textContent = 'Update Blog';
  return true;
}

async function renderBlogEditor(block, cfg) {
  const { Storage, Utils } = window.AdobeSphere;

  // All labels and messages authored in DA.live config rows.
  const lHeading = cfg['label-heading'] || 'Heading';
  const lBody = cfg['label-body'] || 'Write your blog';
  const lCategory = cfg['label-category'] || 'Category';
  const lImage = cfg['label-image'] || 'Image link';
  const authNotice = cfg['auth-notice'] || 'Please sign in to write a blog post.';

  // Auth gate — show modal and authored notice, don't render the form.
  if (!Storage.isLoggedIn()) {
    Utils.showAuthModal({ redirect: window.location.href });
    const notice = document.createElement('p');
    notice.className = 'form-auth-notice';
    notice.textContent = authNotice;
    block.append(notice);
    return;
  }

  // Build form via DOM methods.
  const form = document.createElement('form');
  form.className = 'form form-blog-editor';
  form.noValidate = true;

  // Heading field.
  const titleI = document.createElement('input');
  titleI.id = 'be-title';
  titleI.className = 'form-input';
  titleI.type = 'text';
  titleI.required = true;

  // Body textarea.
  const bodyI = document.createElement('textarea');
  bodyI.id = 'be-body';
  bodyI.className = 'form-input be-body';
  bodyI.required = true;

  // Category select + "Other" input.
  const catSel = document.createElement('select');
  catSel.id = 'be-category';
  catSel.className = 'form-input';

  const otherI = document.createElement('input');
  otherI.id = 'be-category-other';
  otherI.className = 'form-input';
  otherI.type = 'text';
  otherI.placeholder = 'Enter category name…';
  otherI.hidden = true;

  const catWrap = document.createElement('div');
  catWrap.className = 'form-group';
  const catLabel = document.createElement('label');
  catLabel.textContent = lCategory;
  catLabel.htmlFor = 'be-category';
  catWrap.append(catLabel, catSel, otherI);

  // Image link field.
  const imageI = document.createElement('input');
  imageI.id = 'be-image';
  imageI.className = 'form-input';
  imageI.type = 'url';

  // Error element.
  const errEl = document.createElement('p');
  errEl.className = 'form-error form-error-global';

  // Submit button.
  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'button primary be-submit';
  submitBtn.textContent = cfg.submit || 'Publish Blog';

  const actions = document.createElement('div');
  actions.className = 'form-actions be-actions';
  actions.append(submitBtn);

  form.append(
    makeGroup(lHeading, titleI),
    makeGroup(lBody, bodyI),
    catWrap,
    makeGroup(lImage, imageI),
    errEl,
    actions,
  );
  block.append(form);

  // Build category options (async — needs fetching blogs.json).
  await buildCategorySelect(catSel, otherI);

  // Edit mode — load existing blog if ?id= is set.
  const editId = new URLSearchParams(window.location.search).get('id') || '';
  if (editId) {
    loadBlogForEdit(editId, { titleI, bodyI, catSel, otherI, imageI, submitBtn });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errEl.textContent = '';
    [titleI, bodyI, catSel, imageI].forEach(clearFieldError);

    const title = titleI.value.trim();
    const body = bodyI.value.trim();
    const imageLink = imageI.value.trim();

    if (!title) { showFieldError(titleI, 'Heading is required.'); return; }
    if (!body) { showFieldError(bodyI, 'Blog content is required.'); return; }
    if (!isSafeImageSrc(imageLink)) {
      showFieldError(imageI, 'Use an https:// link or leave blank.');
      return;
    }

    let category = '';
    if (catSel.value === BE_OTHER_VALUE) {
      category = otherI.value.trim();
      if (!category) { otherI.focus(); showFieldError(otherI, 'Enter a category name.'); return; }
      Storage.addBlogCategory(category);
      // Add to select so it persists in the DOM.
      const hasOpt = [...catSel.options].some((o) => o.value === category);
      if (!hasOpt) {
        const newOpt = document.createElement('option');
        newOpt.value = category;
        newOpt.textContent = category;
        const otherIdx = [...catSel.options].findIndex((o) => o.value === BE_OTHER_VALUE);
        catSel.insertBefore(newOpt, catSel.options[otherIdx >= 0 ? otherIdx : catSel.options.length]);
      }
      catSel.value = category;
      otherI.hidden = true;
    } else {
      category = catSel.value;
    }

    const user = Storage.getCurrentUser() || {};
    const ownerIdentity = String(user.email || '').trim().toLowerCase();
    const existing = editId ? Storage.getUserBlogById(editId) : null;
    const blogId = editId || `user-blog-${Date.now()}`;
    const publishedDate = (existing && existing.publishedDate) || new Date().toISOString().slice(0, 10);

    const excerpt = body.replace(/\s+/g, ' ').trim().slice(0, 120);
    const content = body.split(/\n\n+/).map((para) => {
      const t = para.trim();
      if (t.startsWith('## ')) return { type: 'heading', text: t.slice(3) };
      return { type: 'paragraph', text: t };
    }).filter((b) => b.text);

    const blogObj = {
      id: blogId,
      title,
      category: category || BE_DEFAULT_CATEGORY,
      ownerIdentity,
      author: {
        id: `user:${ownerIdentity}`,
        name: user.name || 'Community Author',
        designation: user.designation || 'Community Contributor',
        avatar: Utils.normaliseAsset(user.avatarSrc || user.avatar, '/assets/images/profiles/default-user.jpg'),
        bio: user.bio || 'Adobesphere community member.',
        socials: user.socials || {},
      },
      publishedDate,
      coverImage: imageLink,
      excerpt,
      body,
      content,
      featured: false,
      userSubmitted: true,
    };

    if (editId) {
      Storage.updateUserBlog(blogObj);
    } else {
      Storage.addUserBlog(blogObj);
    }

    submitBtn.disabled = true;
    submitBtn.textContent = editId ? 'Updated!' : 'Published!';
    Utils.toast(editId ? 'Blog updated.' : 'Blog published!', 'success');
    setTimeout(() => {
      window.location.href = `/creator-profile?id=${encodeURIComponent(ownerIdentity)}`;
    }, 900);
  });
}

/* ─────────── dispatcher ─────────── */

export default async function decorate(block) {
  const variants = [...block.classList];
  const cfg = readConfig(block);
  block.textContent = '';

  if (variants.includes('event-registration') || variants.includes('registration')) renderEventRegistration(block, cfg);
  else if (variants.includes('blog-editor')) await renderBlogEditor(block, cfg);
}
