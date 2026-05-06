/**
 * AdobeSphere universal form block.
 *
 * Variants (block class): contact | login | signup | event-registration | blog-editor.
 *
 * For `contact` and `event-registration` the author can pass field labels via
 * config rows. For `login`, `signup`, and `blog-editor` the form structure is
 * fixed and the block renders it in JS.
 *
 * Recognised config rows: `Title | …`, `Submit | …`, `Success | …`, `After | /path`.
 */

function readConfig(block) {
  const cfg = {};
  [...block.children].forEach((row) => {
    if (row.children.length !== 2) return;
    const k = row.children[0].textContent.trim().toLowerCase();
    const v = row.children[1].textContent.trim();
    if (['title', 'subtitle', 'submit', 'success', 'after'].includes(k)) {
      cfg[k] = v;
      row.remove();
    }
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

/* ─────────── CONTACT ─────────── */

function renderContact(block, cfg) {
  block.innerHTML = `
    <form class="form form-contact" novalidate>
      ${cfg.title ? `<h2 class="section-heading">${escapeHtml(cfg.title)}</h2>` : ''}
      <div class="form-group">
        <label for="c-name">Full Name</label>
        <input id="c-name" class="form-input" type="text" autocomplete="name" required>
      </div>
      <div class="form-group">
        <label for="c-email">Email</label>
        <input id="c-email" class="form-input" type="email" autocomplete="email" required>
      </div>
      <div class="form-group">
        <label for="c-subject">Subject</label>
        <input id="c-subject" class="form-input" type="text" required>
      </div>
      <div class="form-group">
        <label for="c-category">Category</label>
        <select id="c-category" class="form-input" required>
          <option value="">Select a category</option>
          <option>General Inquiry</option>
          <option>Event Registration Help</option>
          <option>Blog Submission</option>
          <option>Sign Up / Login Issue</option>
          <option>Account / Profile Help</option>
          <option>Technical Issue</option>
          <option>Creator Profile</option>
          <option>Other</option>
        </select>
      </div>
      <div class="form-group">
        <label for="c-message">Message</label>
        <textarea id="c-message" class="form-input" rows="6" maxlength="500" required></textarea>
        <small class="form-counter" data-counter="c-message">0 / 500 characters</small>
      </div>
      <button type="submit" class="button primary">${escapeHtml(cfg.submit || 'Send Message')}</button>
      <p class="form-status" role="status" aria-live="polite"></p>
    </form>`;

  const form = block.querySelector('form');
  const msg = form.querySelector('#c-message');
  const counter = form.querySelector('[data-counter="c-message"]');
  msg.addEventListener('input', () => { counter.textContent = `${msg.value.length} / 500 characters`; });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.querySelector('#c-name');
    const email = form.querySelector('#c-email');
    const subject = form.querySelector('#c-subject');
    const cat = form.querySelector('#c-category');
    const message = form.querySelector('#c-message');
    let valid = true;
    [name, email, subject, cat, message].forEach(clearFieldError);

    if (!name.value.trim()) { showFieldError(name, 'Name is required.'); valid = false; }
    if (!window.AdobeSphere.Utils.validateEmail(email.value)) { showFieldError(email, 'Enter a valid email.'); valid = false; }
    if (!subject.value.trim()) { showFieldError(subject, 'Subject is required.'); valid = false; }
    if (!cat.value) { showFieldError(cat, 'Pick a category.'); valid = false; }
    if (!message.value.trim()) { showFieldError(message, 'Message is required.'); valid = false; }

    if (!valid) return;
    form.querySelector('.form-status').textContent = cfg.success || 'Thanks — we\'ll get back to you within 24–48 hours.';
    form.reset();
    counter.textContent = '0 / 500 characters';
  });
}

/* ─────────── LOGIN ─────────── */

function renderLogin(block, cfg) {
  block.innerHTML = `
    <form class="form form-auth form-login" novalidate>
      <div class="form-brand">
        <p class="form-wordmark"><span class="adobe">Adobe</span>sphere</p>
        <h1>${escapeHtml(cfg.title || 'Welcome back')}</h1>
        ${cfg.subtitle ? `<p>${escapeHtml(cfg.subtitle)}</p>` : ''}
      </div>
      <div class="form-group">
        <label for="l-email">Email</label>
        <input id="l-email" class="form-input" type="email" autocomplete="email" required>
      </div>
      <div class="form-group form-password">
        <label for="l-password">Password</label>
        <input id="l-password" class="form-input" type="password" autocomplete="current-password" required>
        <button type="button" class="form-toggle-password" aria-label="Toggle password visibility">Show</button>
      </div>
      <p class="form-error form-error-global"></p>
      <button type="submit" class="button primary">${escapeHtml(cfg.submit || 'Sign In')}</button>
      <p class="form-bottom">No account yet? <a href="/signup">Create one</a></p>
    </form>`;

  const form = block.querySelector('form');
  const toggle = form.querySelector('.form-toggle-password');
  toggle.addEventListener('click', () => {
    const input = form.querySelector('#l-password');
    const isPwd = input.type === 'password';
    input.type = isPwd ? 'text' : 'password';
    toggle.textContent = isPwd ? 'Hide' : 'Show';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.querySelector('#l-email');
    const pwd = form.querySelector('#l-password');
    const errEl = form.querySelector('.form-error-global');
    errEl.textContent = '';
    [email, pwd].forEach(clearFieldError);

    if (!window.AdobeSphere.Utils.validateEmail(email.value)) {
      showFieldError(email, 'Enter a valid email.');
      return;
    }
    if (pwd.value.length < 6) {
      showFieldError(pwd, 'Password must be at least 6 characters.');
      return;
    }

    const { Storage, Utils } = window.AdobeSphere;
    const user = Storage.getCurrentUser.call({ getSession: () => ({ email: email.value }) });
    // Simpler check — read the users record directly.
    const usersRaw = (() => { try { return JSON.parse(localStorage.getItem('adobesphere_users') || '{}'); } catch { return {}; } })();
    const record = usersRaw[email.value];
    if (!record || record.password !== pwd.value) {
      errEl.textContent = 'Email or password is incorrect.';
      return;
    }
    Storage.setSession({ email: email.value, name: record.name });
    Utils.toast(cfg.success || 'Signed in! Redirecting…', 'success');
    setTimeout(() => { window.location.href = cfg.after || '/'; }, 600);
  });
}

/* ─────────── SIGNUP ─────────── */

function renderSignup(block, cfg) {
  block.innerHTML = `
    <form class="form form-auth form-signup" novalidate>
      <div class="form-brand">
        <p class="form-wordmark"><span class="adobe">Adobe</span>sphere</p>
        <h1>${escapeHtml(cfg.title || 'Join the community')}</h1>
        ${cfg.subtitle ? `<p>${escapeHtml(cfg.subtitle)}</p>` : ''}
      </div>
      <div class="form-group">
        <label for="s-name">Full Name</label>
        <input id="s-name" class="form-input" type="text" autocomplete="name" required>
      </div>
      <div class="form-group">
        <label for="s-email">Email</label>
        <input id="s-email" class="form-input" type="email" autocomplete="email" required>
      </div>
      <div class="form-group form-password">
        <label for="s-password">Password</label>
        <input id="s-password" class="form-input" type="password" autocomplete="new-password" minlength="6" required>
        <button type="button" class="form-toggle-password" aria-label="Toggle password visibility">Show</button>
      </div>
      <div class="form-group form-password">
        <label for="s-password2">Confirm Password</label>
        <input id="s-password2" class="form-input" type="password" autocomplete="new-password" required>
      </div>
      <p class="form-error form-error-global"></p>
      <button type="submit" class="button primary">${escapeHtml(cfg.submit || 'Create Account')}</button>
      <p class="form-bottom">Already have an account? <a href="/login">Sign in</a></p>
    </form>`;

  const form = block.querySelector('form');
  form.querySelector('.form-toggle-password').addEventListener('click', (e) => {
    const input = e.target.previousElementSibling;
    const isPwd = input.type === 'password';
    input.type = isPwd ? 'text' : 'password';
    e.target.textContent = isPwd ? 'Hide' : 'Show';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.querySelector('#s-name');
    const email = form.querySelector('#s-email');
    const pwd = form.querySelector('#s-password');
    const pwd2 = form.querySelector('#s-password2');
    const errEl = form.querySelector('.form-error-global');
    [name, email, pwd, pwd2].forEach(clearFieldError);
    errEl.textContent = '';

    let valid = true;
    if (!name.value.trim()) { showFieldError(name, 'Name is required.'); valid = false; }
    if (!window.AdobeSphere.Utils.validateEmail(email.value)) { showFieldError(email, 'Enter a valid email.'); valid = false; }
    if (pwd.value.length < 6) { showFieldError(pwd, 'Password must be at least 6 characters.'); valid = false; }
    if (pwd.value !== pwd2.value) { showFieldError(pwd2, 'Passwords do not match.'); valid = false; }
    if (!valid) return;

    const usersRaw = (() => { try { return JSON.parse(localStorage.getItem('adobesphere_users') || '{}'); } catch { return {}; } })();
    if (usersRaw[email.value]) {
      errEl.textContent = 'An account with this email already exists.';
      return;
    }

    const { Storage, Utils } = window.AdobeSphere;
    const newUser = { email: email.value, name: name.value, password: pwd.value, createdAt: new Date().toISOString() };
    Storage.upsertUser(newUser);
    // Every registered user automatically gets a creator profile so that the
    // Registered Users count always equals the Creator Profiles count on the
    // Stats block (which resolves 'creators' by counting users + local creators).
    if (typeof Storage.upsertLocalCreator === 'function') Storage.upsertLocalCreator(newUser);
    Storage.setSession({ email: email.value, name: name.value });
    Utils.toast(cfg.success || 'Account created! Redirecting…', 'success');
    setTimeout(() => { window.location.href = cfg.after || '/'; }, 600);
  });
}

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

function renderBlogEditor(block, cfg) {
  block.innerHTML = `
    <form class="form form-blog-editor" novalidate>
      ${cfg.title ? `<h2 class="section-heading">${escapeHtml(cfg.title)}</h2>` : ''}
      <div class="form-group">
        <label for="be-title">Title</label>
        <input id="be-title" class="form-input" type="text" required>
      </div>
      <div class="form-group">
        <label for="be-category">Category</label>
        <input id="be-category" class="form-input" type="text" placeholder="e.g. Creative Tools & Product Updates" required>
      </div>
      <div class="form-group">
        <label for="be-cover">Cover Image (URL or upload)</label>
        <input id="be-cover" class="form-input" type="url" placeholder="https://…">
        <input id="be-cover-file" class="form-input" type="file" accept="image/*">
      </div>
      <div class="form-group">
        <label for="be-excerpt">Short Excerpt</label>
        <textarea id="be-excerpt" class="form-input" rows="2" maxlength="200" required></textarea>
      </div>
      <div class="form-group">
        <label for="be-content">Content (Markdown-style: ## for headings, blank lines for paragraphs)</label>
        <textarea id="be-content" class="form-input form-content" rows="14" required></textarea>
      </div>
      <p class="form-error form-error-global"></p>
      <div class="form-actions">
        <button type="button" class="button ghost form-save-draft">Save Draft</button>
        <button type="submit" class="button primary">${escapeHtml(cfg.submit || 'Publish Blog')}</button>
      </div>
    </form>`;

  const form = block.querySelector('form');
  const titleI = form.querySelector('#be-title');
  const catI = form.querySelector('#be-category');
  const coverI = form.querySelector('#be-cover');
  const fileI = form.querySelector('#be-cover-file');
  const excerptI = form.querySelector('#be-excerpt');
  const contentI = form.querySelector('#be-content');
  const errEl = form.querySelector('.form-error-global');

  // Restore draft.
  const DRAFT_KEY = 'adobesphere_blog_draft';
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (d) {
      titleI.value = d.title || '';
      catI.value = d.category || '';
      coverI.value = d.cover || '';
      excerptI.value = d.excerpt || '';
      contentI.value = d.content || '';
    }
  } catch { /* noop */ }

  // Auto-save draft.
  let saveTimer = null;
  [titleI, catI, coverI, excerptI, contentI].forEach((i) => {
    i.addEventListener('input', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const data = { title: titleI.value, category: catI.value, cover: coverI.value, excerpt: excerptI.value, content: contentI.value };
        try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch { /* noop */ }
      }, 500);
    });
  });

  // File → data URI.
  fileI.addEventListener('change', () => {
    const file = fileI.files && fileI.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { coverI.value = reader.result; };
    reader.readAsDataURL(file);
  });

  form.querySelector('.form-save-draft').addEventListener('click', () => {
    window.AdobeSphere.Utils.toast('Draft saved.', 'success');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errEl.textContent = '';
    [titleI, catI, excerptI, contentI].forEach(clearFieldError);

    let valid = true;
    if (!titleI.value.trim()) { showFieldError(titleI, 'Title required.'); valid = false; }
    if (!catI.value.trim()) { showFieldError(catI, 'Category required.'); valid = false; }
    if (!excerptI.value.trim()) { showFieldError(excerptI, 'Excerpt required.'); valid = false; }
    if (!contentI.value.trim()) { showFieldError(contentI, 'Content required.'); valid = false; }
    if (!valid) return;

    const { Storage, Utils } = window.AdobeSphere;
    if (!Storage.isLoggedIn()) {
      errEl.textContent = 'Sign in first to publish a blog.';
      return;
    }

    const user = Storage.getCurrentUser() || {};
    const blog = {
      id: `user-blog-${Date.now()}`,
      title: titleI.value.trim(),
      category: catI.value.trim(),
      coverImage: coverI.value || '',
      excerpt: excerptI.value.trim(),
      content: contentI.value.split(/\n\n+/).map((para) => {
        const trimmed = para.trim();
        if (trimmed.startsWith('## ')) return { type: 'heading', text: trimmed.slice(3) };
        return { type: 'paragraph', text: trimmed };
      }).filter((b) => b.text),
      author: { id: `user:${user.email}`, name: user.name || 'Author', avatar: user.avatar || '' },
      publishedDate: new Date().toISOString().slice(0, 10),
      featured: false,
      userSubmitted: true,
    };
    Storage.addUserBlog(blog);
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
    Utils.toast('Blog published!', 'success');
    setTimeout(() => { window.location.href = cfg.after || `/blog/${blog.id}`; }, 700);
  });
}

/* ─────────── dispatcher ─────────── */

export default function decorate(block) {
  const variants = [...block.classList];
  const cfg = readConfig(block);
  block.textContent = '';

  if (variants.includes('login')) renderLogin(block, cfg);
  else if (variants.includes('signup')) renderSignup(block, cfg);
  else if (variants.includes('event-registration') || variants.includes('registration')) renderEventRegistration(block, cfg);
  else if (variants.includes('blog-editor')) renderBlogEditor(block, cfg);
  else renderContact(block, cfg);
}
