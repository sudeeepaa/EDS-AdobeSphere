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

const CONTACT_FAQS = [
  {
    q: 'How do I register for an event?',
    a: 'Go to the Explore page, open any event card, and click Register. You\'ll need to be signed in first — <a href="/sign-up">create a free account</a> to get started.',
  },
  {
    q: 'How do I save a blog or event?',
    a: 'Click the bookmark icon on any blog or event card. You\'ll need to <a href="/sign-in">sign in</a> first — your saved items will appear in your profile dashboard.',
  },
  {
    q: 'How do I write and publish my own blog?',
    a: 'Open the <a href="/blog-editor">Blog Editor</a>, create your post using the block editor, add the required metadata, and click Publish.',
  },
  {
    q: 'How do I update my profile information?',
    a: 'Visit <a href="/user-profile">My Profile</a> while signed in. You can edit your information directly from the profile page.',
  },
  {
    q: 'How do I view all creators on the platform?',
    a: 'Visit the <a href="/explore?tab=creators">Explore page</a> and switch to the Creators tab to browse all creators.',
  },
  {
    q: 'Is this platform free to use?',
    a: 'Yes — the Adobesphere platform is completely free to explore, use, and contribute to.',
  },
];

function renderContact(block, cfg) {
  const faqHtml = CONTACT_FAQS.map((item, i) => `
    <div class="faq-item">
      <button class="faq-question" type="button" aria-expanded="false" aria-controls="faq-answer-${i}">${escapeHtml(item.q)}</button>
      <div class="faq-answer" id="faq-answer-${i}">${item.a}</div>
    </div>`).join('');

  block.innerHTML = `
    <div class="contact-layout">
      <div class="contact-form-wrap">
        <div id="c-success" role="status" aria-live="polite" class="contact-success" style="display:none"></div>
        <form class="form form-contact" novalidate>
          ${cfg.title ? `<h2 class="section-heading">${escapeHtml(cfg.title)}</h2>` : ''}
          <div class="form-group">
            <label for="c-name">Full Name</label>
            <input id="c-name" class="form-input" type="text" autocomplete="name" required>
            <span class="form-error" data-field="c-name"></span>
          </div>
          <div class="form-group">
            <label for="c-email">Email Address</label>
            <input id="c-email" class="form-input" type="email" autocomplete="email" required>
            <span class="form-error" data-field="c-email"></span>
          </div>
          <div class="form-group">
            <label for="c-subject">Subject</label>
            <input id="c-subject" class="form-input" type="text" required>
            <span class="form-error" data-field="c-subject"></span>
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
            <span class="form-error" data-field="c-category"></span>
          </div>
          <div class="form-group">
            <label for="c-message">Message</label>
            <textarea id="c-message" class="form-input" rows="6" maxlength="500" required></textarea>
            <small id="c-msg-count" class="form-counter">0 / 500 characters</small>
            <span class="form-error" data-field="c-message"></span>
          </div>
          <button type="submit" class="button primary">${escapeHtml(cfg.submit || 'Send Message')}</button>
        </form>
      </div>

      <aside class="faq-section">
        <h2>Frequently Asked Questions</h2>
        <div class="faq-accordion">${faqHtml}</div>
      </aside>
    </div>`;

  const form = block.querySelector('form');
  const msg = form.querySelector('#c-message');
  const counter = block.querySelector('#c-msg-count');
  msg.addEventListener('input', () => {
    const len = msg.value.length;
    counter.textContent = `${len} / 500 characters`;
    counter.classList.toggle('over-limit', len > 500);
  });

  // FAQ accordion
  block.querySelector('.faq-accordion').addEventListener('click', (e) => {
    const btn = e.target.closest('.faq-question');
    if (!btn) return;
    const item = btn.closest('.faq-item');
    const wasOpen = item.classList.contains('open');
    block.querySelectorAll('.faq-item').forEach((el) => {
      el.classList.remove('open');
      el.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    });
    if (!wasOpen) { item.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
  });

  const setFieldErr = (id, msg2) => {
    const input = form.querySelector(`#${id}`);
    const errEl = form.querySelector(`[data-field="${id}"]`);
    if (input) input.classList.toggle('error', !!msg2);
    if (errEl) errEl.textContent = msg2 || '';
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.querySelectorAll('[data-field]').forEach((el) => { el.textContent = ''; });
    form.querySelectorAll('.form-input').forEach((i) => i.classList.remove('error'));

    const name = form.querySelector('#c-name').value.trim();
    const email = form.querySelector('#c-email').value.trim();
    const subject = form.querySelector('#c-subject').value.trim();
    const cat = form.querySelector('#c-category').value;
    const message = form.querySelector('#c-message').value.trim();
    let valid = true;

    if (!name) { setFieldErr('c-name', 'Please enter your name.'); valid = false; }
    if (!window.AdobeSphere.Utils.validateEmail(email)) { setFieldErr('c-email', 'Please enter a valid email address.'); valid = false; }
    if (!subject) { setFieldErr('c-subject', 'Please enter a subject.'); valid = false; }
    if (!cat) { setFieldErr('c-category', 'Please select a category.'); valid = false; }
    if (!message || message.length < 20) { setFieldErr('c-message', 'Message must be at least 20 characters.'); valid = false; }

    if (!valid) { window.AdobeSphere.Utils.toast('Please fix the highlighted fields.', 'error'); return; }

    if (window.AdobeSphere.Storage?.addContactSubmission) {
      window.AdobeSphere.Storage.addContactSubmission({ id: Date.now(), name, email, subject, category: cat, message, submittedAt: new Date().toISOString() });
    }

    window.AdobeSphere.Utils.toast('Message sent successfully.', 'success');
    form.reset();
    counter.textContent = '0 / 500 characters';

    const successEl = block.querySelector('#c-success');
    successEl.textContent = cfg.success || 'Thanks — we\'ll get back to you within 24–48 hours.';
    successEl.style.display = 'block';
    setTimeout(() => { successEl.style.display = 'none'; }, 5000);
  });
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

  if (variants.includes('event-registration') || variants.includes('registration')) renderEventRegistration(block, cfg);
  else if (variants.includes('blog-editor')) renderBlogEditor(block, cfg);
  else renderContact(block, cfg);
}
