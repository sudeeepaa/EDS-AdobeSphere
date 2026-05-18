// Reads key-value config rows from the block and removes them.
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

// Delegates HTML escaping to the shared Utils helper.
function escapeHtml(v) { return window.AdobeSphere.Utils.escapeHtml(v); }

// Shows a validation error message on a form field.
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

// Clears the validation error state from a form field.
function clearFieldError(input) {
  input.classList.remove('error');
  const err = input.parentElement.querySelector('.form-error');
  if (err) err.textContent = '';
}

// Renders the event registration form as a modal overlay.
function renderEventRegistration(block, cfg) {
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

  // Session storage for event registration form
  const SESSION_KEY = 'adobesphere_event_registration';

  // Load saved form data from session storage
  const loadFromSession = () => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      const foodSelect = form.querySelector('#r-food');
      if (data.food && foodSelect) foodSelect.value = data.food;
      const companionRadios = form.querySelectorAll('[name="companion"]');
      if (data.companion) {
        companionRadios.forEach((r) => {
          if (r.value === data.companion) r.checked = true;
        });
        compFields.hidden = data.companion === 'no';
      }
      if (data.companionData) {
        Object.entries(data.companionData).forEach(([key, value]) => {
          const input = form.querySelector(`[data-companion="${key}"]`);
          if (input) input.value = value;
        });
      }
    } catch (e) {
      // Ignore parsing errors
    }
  };

  // Save form data to session storage
  const saveToSession = () => {
    const food = form.querySelector('#r-food');
    const companion = form.querySelector('[name="companion"]:checked');
    const companionData = {};
    form.querySelectorAll('[data-companion]').forEach((input) => {
      if (input.value) companionData[input.dataset.companion] = input.value;
    });
    const data = {
      food: food ? food.value : '',
      companion: companion ? companion.value : 'no',
      companionData,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  };

  // Clear session storage on successful submission
  const clearSession = () => {
    sessionStorage.removeItem(SESSION_KEY);
  };

  // Add event listeners to save form data
  form.querySelectorAll('input, select, textarea').forEach((input) => {
    input.addEventListener('change', saveToSession);
    input.addEventListener('input', saveToSession);
  });

  // Load saved data when modal opens
  window.addEventListener('adobesphere:show-registration', () => {
    loadFromSession();
    openModal();
  });

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  block.querySelector('.form-reg-close').addEventListener('click', closeModal);

  form.querySelectorAll('[name="companion"]').forEach((r) => r.addEventListener('change', (e) => {
    compFields.hidden = e.target.value === 'no';
    saveToSession();
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

    // Collect companion details
    const companion = form.querySelector('[name="companion"]:checked');
    const registrationData = { food: food.value };

    if (companion && companion.value === 'yes') {
      const companions = [];
      [1, 2].forEach((num) => {
        const nameInput = form.querySelector(`[data-companion="${num}-name"]`);
        const emailInput = form.querySelector(`[data-companion="${num}-email"]`);
        const ageInput = form.querySelector(`[data-companion="${num}-age"]`);

        if (nameInput && nameInput.value.trim()) {
          companions.push({
            number: num,
            name: nameInput.value.trim(),
            email: emailInput ? emailInput.value.trim() : '',
            age: ageInput ? parseInt(ageInput.value, 10) : null,
          });
        }
      });
      if (companions.length > 0) {
        registrationData.companions = companions;
      }
    }

    const eventId = new URLSearchParams(window.location.search).get('id')
      || document.querySelector('meta[name="event-id"]')?.content
      || window.location.pathname.split('/').filter(Boolean).pop();
    Storage.registerForEvent(eventId, registrationData);
    Utils.toast(cfg.success || 'You\'re registered. See you there!', 'success');
    clearSession();
    closeModal();
    window.dispatchEvent(new CustomEvent('adobesphere:registration-changed', { detail: eventId }));
    if (cfg.after) setTimeout(() => { window.location.href = cfg.after; }, 800);
  });
}

const BE_DEFAULT_CATEGORY = 'Community / Events / Creator Programs';
const BE_OTHER_VALUE = '__other__';

// Validates that an image source is an allowed URL or relative path.
function isSafeImageSrc(src) {
  const v = String(src || '').trim();
  if (!v) return true;
  return /^https?:\/\//i.test(v) || /^(\/|\.{1,2}[/\\]|assets[/\\])/i.test(v);
}

// Creates a labeled form group wrapping the given input element.
function makeGroup(labelText, input) {
  const div = document.createElement('div');
  div.className = 'form-group';
  const lbl = document.createElement('label');
  lbl.textContent = labelText;
  lbl.htmlFor = input.id;
  div.append(lbl, input);
  return div;
}

// Populates the category select with categories fetched from data and localStorage.
async function buildCategorySelect(selectEl, otherEl) {
  const { Storage, Utils } = window.AdobeSphere;

  // Shows or hides the "Other" category text input.
  function setOtherVisible(visible) {
    otherEl.hidden = !visible;
    if (!visible) otherEl.value = '';
  }

  // Rebuilds the select options from the given list, restoring the prior selection.
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

  // Pushes a value to the list only if not already present (case-insensitive).
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

// Loads an existing blog's data into the editor form fields for editing.
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

// Renders the blog editor form for creating or updating a user blog post.
async function renderBlogEditor(block, cfg) {
  const { Storage, Utils } = window.AdobeSphere;

  const lHeading = cfg['label-heading'] || 'Heading';
  const lBody = cfg['label-body'] || 'Write your blog';
  const lCategory = cfg['label-category'] || 'Category';
  const lImage = cfg['label-image'] || 'Image link';
  const authNotice = cfg['auth-notice'] || 'Please sign in to write a blog post.';

  if (!Storage.isLoggedIn()) {
    Utils.showAuthModal({ redirect: window.location.href });
    const notice = document.createElement('p');
    notice.className = 'form-auth-notice';
    notice.textContent = authNotice;
    block.append(notice);
    return;
  }

  const form = document.createElement('form');
  form.className = 'form form-blog-editor';
  form.noValidate = true;

  const titleI = document.createElement('input');
  titleI.id = 'be-title';
  titleI.className = 'form-input';
  titleI.type = 'text';
  titleI.required = true;

  const bodyI = document.createElement('textarea');
  bodyI.id = 'be-body';
  bodyI.className = 'form-input be-body';
  bodyI.required = true;

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

  const imageI = document.createElement('input');
  imageI.id = 'be-image';
  imageI.className = 'form-input';
  imageI.type = 'url';

  const errEl = document.createElement('p');
  errEl.className = 'form-error form-error-global';

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

  await buildCategorySelect(catSel, otherI);

  // Session storage for blog editor
  const SESSION_KEY = 'adobesphere_blog_editor';

  // Load saved form data from session storage
  const loadFromSession = () => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      if (data.title) titleI.value = data.title;
      if (data.body) bodyI.value = data.body;
      if (data.category) catSel.value = data.category;
      if (data.image) imageI.value = data.image;
    } catch (e) {
      // Ignore parsing errors
    }
  };

  // Save form data to session storage
  const saveToSession = () => {
    const data = {
      title: titleI.value,
      body: bodyI.value,
      category: catSel.value,
      image: imageI.value,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  };

  // Clear session storage on successful submission
  const clearSession = () => {
    sessionStorage.removeItem(SESSION_KEY);
  };

  // Add event listeners to save form data
  [titleI, bodyI, catSel, imageI, otherI].forEach((input) => {
    input.addEventListener('input', saveToSession);
    input.addEventListener('change', saveToSession);
  });

  // Load saved data on page load
  loadFromSession();

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
        avatar: Utils.normaliseAsset(user.avatarSrc || user.avatar, Utils.DEFAULT_AVATAR),
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
    clearSession();
    Utils.toast(editId ? 'Blog updated.' : 'Blog published!', 'success');
    setTimeout(() => {
      window.location.href = `/creator-profile/template?id=${encodeURIComponent(ownerIdentity)}`;
    }, 900);
  });
}

// ── contact variant ─────────────────────────────────────────────────────────

// Reads the contact-form's config rows. Handles the multi-row `category-options`
// shape where the first row labels the group and subsequent rows have an empty
// label cell with just an option value in cell 2.
function readContactConfig(block) {
  const cfg = {};
  const categoryOptions = [];
  let currentKey = '';

  [...block.children].forEach((row) => {
    if (row.children.length !== 2) return;
    const k = row.children[0].textContent.trim().toLowerCase().replace(/\s+/g, '-');
    const v = row.children[1].textContent.trim();

    if (k === 'category-options' || (!k && currentKey === 'category-options')) {
      if (k === 'category-options') currentKey = 'category-options';
      if (v) categoryOptions.push([v.toLowerCase().replace(/\s+/g, '-'), v]);
    } else {
      cfg[k] = v;
      currentKey = k;
    }
    row.remove();
  });

  return { cfg, categoryOptions };
}

// Builds a label + (later) error-span pair for a contact-form field.
function makeContactGroup(id, labelText) {
  const group = document.createElement('div');
  group.className = 'cf-group';

  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = labelText;

  const err = document.createElement('span');
  err.className = 'form-error';
  err.dataset.field = id;

  group.append(label);
  return { group, err };
}

// Creates a required <input> for the contact form.
function makeContactInput(id, type, autocomplete) {
  const input = document.createElement('input');
  input.id = id;
  input.className = 'form-input';
  input.type = type;
  input.required = true;
  if (autocomplete) input.autocomplete = autocomplete;
  return input;
}

// Creates a required <select> populated with the given [value, label] pairs.
function makeContactSelect(id, choices) {
  const sel = document.createElement('select');
  sel.id = id;
  sel.className = 'form-input';
  sel.required = true;
  choices.forEach(([v, t]) => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = t;
    sel.append(opt);
  });
  return sel;
}

// Creates a required <textarea> with a row count and max length.
function makeContactTextarea(id, rows, maxlength) {
  const ta = document.createElement('textarea');
  ta.id = id;
  ta.className = 'form-input';
  ta.rows = rows;
  ta.maxLength = maxlength;
  ta.required = true;
  return ta;
}

// Renders the contact variant: name/email/subject/category/message form
// with login-aware field visibility and a configurable success banner.
function renderContact(block) {
  const { cfg, categoryOptions } = readContactConfig(block);
  const { Utils, Storage } = window.AdobeSphere;

  const isLoggedIn = Storage.isLoggedIn();
  const currentUser = isLoggedIn ? Storage.getCurrentUser() : null;

  const guestFields = cfg['show-for-guests']?.split(',').map((f) => f.trim()) || [];
  const loggedInFields = cfg['show-for-logged-in']?.split(',').map((f) => f.trim()) || [];
  const fieldsToShow = isLoggedIn ? loggedInFields : guestFields;

  const successBanner = document.createElement('div');
  successBanner.className = 'cf-success';
  successBanner.setAttribute('role', 'status');
  successBanner.setAttribute('aria-live', 'polite');
  successBanner.hidden = true;

  const form = document.createElement('form');
  form.className = 'cf-form';
  form.setAttribute('novalidate', '');

  const fields = {};

  if (fieldsToShow.includes('name')) {
    const grp = makeContactGroup('cf-name', cfg['label-name'] || 'Full Name');
    const input = makeContactInput('cf-name', 'text', 'name');
    input.value = currentUser?.name || '';
    if (isLoggedIn) input.readOnly = true;
    grp.group.append(input, grp.err);
    form.append(grp.group);
    fields.name = { input, id: 'cf-name' };
  }

  if (fieldsToShow.includes('email')) {
    const grp = makeContactGroup('cf-email', cfg['label-email'] || 'Email Address');
    const input = makeContactInput('cf-email', 'email', 'email');
    input.value = currentUser?.email || '';
    if (isLoggedIn) input.readOnly = true;
    grp.group.append(input, grp.err);
    form.append(grp.group);
    fields.email = { input, id: 'cf-email' };
  }

  if (fieldsToShow.includes('subject')) {
    const grp = makeContactGroup('cf-subject', cfg['label-subject'] || 'Subject');
    const input = makeContactInput('cf-subject', 'text', '');
    grp.group.append(input, grp.err);
    form.append(grp.group);
    fields.subject = { input, id: 'cf-subject' };
  }

  if (fieldsToShow.includes('category')) {
    const choices = [['', 'Select a category'], ...categoryOptions];
    const grp = makeContactGroup('cf-category', cfg['label-category'] || 'Category');
    const input = makeContactSelect('cf-category', choices);
    grp.group.append(input, grp.err);
    form.append(grp.group);
    fields.category = { input, id: 'cf-category' };
  }

  if (fieldsToShow.includes('message')) {
    const grp = makeContactGroup('cf-message', cfg['label-message'] || 'Message');
    const input = makeContactTextarea('cf-message', 4, 500);

    const counter = document.createElement('small');
    counter.className = 'cf-counter';
    counter.textContent = '0 / 500';

    grp.group.append(input, counter, grp.err);
    form.append(grp.group);
    fields.message = { input, id: 'cf-message', counter };

    input.addEventListener('input', () => {
      const len = input.value.length;
      counter.textContent = `${len} / 500`;
      counter.classList.toggle('cf-counter-over', len > 500);
    });
  }

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'button primary';
  submitBtn.textContent = cfg.submit || 'Send Message';
  form.append(submitBtn);

  block.textContent = '';
  block.append(successBanner, form);

  const setErr = (id, msg) => {
    const errEl = form.querySelector(`[data-field="${id}"]`);
    const inputEl = form.querySelector(`#${id}`);
    inputEl?.classList.toggle('error', !!msg);
    if (errEl) errEl.textContent = msg || '';
  };

  const clearErrors = () => {
    form.querySelectorAll('[data-field]').forEach((el) => { el.textContent = ''; });
    form.querySelectorAll('.form-input').forEach((el) => el.classList.remove('error'));
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const payload = {};
    let valid = true;

    if (fieldsToShow.includes('name') || fieldsToShow.includes('email')) {
      if (fieldsToShow.includes('name')) {
        payload.name = fields.name.input.value.trim();
        if (!payload.name) {
          setErr('cf-name', 'Please enter your name.');
          valid = false;
        }
      }
      if (fieldsToShow.includes('email')) {
        payload.email = fields.email.input.value.trim();
        if (!Utils.validateEmail(payload.email)) {
          setErr('cf-email', 'Please enter a valid email.');
          valid = false;
        }
      }
    } else if (isLoggedIn) {
      payload.name = currentUser?.name || '';
      payload.email = currentUser?.email || '';
    }

    Object.entries(fields).forEach(([key, field]) => {
      if (key !== 'name' && key !== 'email') {
        const value = field.input.value.trim();
        payload[key] = value;

        if (key === 'subject' && !value) {
          setErr(field.id, 'Please enter a subject.');
          valid = false;
        } else if (key === 'category' && !value) {
          setErr(field.id, 'Please select a category.');
          valid = false;
        } else if (key === 'message' && (!value || value.length < 20)) {
          setErr(field.id, 'Message must be at least 20 characters.');
          valid = false;
        }
      }
    });

    if (!valid) { Utils.toast('Please fix the highlighted fields.', 'error'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    try {
      if (cfg['form-action']) {
        const res = await fetch(cfg['form-action'], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Server error');
      } else {
        Storage.addContactSubmission?.({
          id: Date.now(), ...payload, submittedAt: new Date().toISOString(),
        });
      }

      Utils.toast('Message sent!', 'success');
      form.reset();
      if (fields.message?.counter) fields.message.counter.textContent = '0 / 500';

      successBanner.textContent = cfg.success || 'Thanks — we\'ll get back to you within 24–48 hours.';
      successBanner.hidden = false;
      setTimeout(() => { successBanner.hidden = true; }, 6000);
    } catch {
      Utils.toast('Failed to send. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = cfg.submit || 'Send Message';
    }
  });
}

// Dispatches to the correct form variant based on the block class.
export default async function decorate(block) {
  const variants = [...block.classList];

  // Contact variant has its own multi-row config schema (category-options);
  // short-circuit before the generic readConfig pipeline.
  if (variants.includes('contact')) {
    renderContact(block);
    return;
  }

  const cfg = readConfig(block);
  block.textContent = '';

  if (variants.includes('event-registration') || variants.includes('registration')) renderEventRegistration(block, cfg);
  else if (variants.includes('blog-editor')) await renderBlogEditor(block, cfg);
}
