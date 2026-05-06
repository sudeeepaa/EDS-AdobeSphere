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

/* ─────────── LOGIN ─────────── */

const EYE_OPEN_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
const EYE_CLOSED_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1 12 1 12a21.77 21.77 0 0 1 5.06-6.94"></path><path d="M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a21.8 21.8 0 0 1-3.16 4.19"></path><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

function setupPasswordToggle(wrapper, inputId) {
  const input = wrapper.querySelector(`#${inputId}`);
  const btn = wrapper.querySelector('.form-toggle-password');
  if (!input || !btn) return;
  btn.innerHTML = EYE_OPEN_SVG;
  btn.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.innerHTML = show ? EYE_CLOSED_SVG : EYE_OPEN_SVG;
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
}

function renderLogin(block, cfg) {
  block.innerHTML = `
    <div class="login-wrapper">
      <div class="login-brand-header">
        <div class="form-wordmark"><span class="adobe">Adobe</span>sphere</div>
        <h1>${escapeHtml(cfg.title || 'Welcome Back')}</h1>
        <p>${escapeHtml(cfg.subtitle || 'Sign in to your Adobesphere account')}</p>
      </div>
      <form class="form form-auth form-login" novalidate>
        <div id="l-error" role="alert" aria-live="polite" style="display:none"></div>
        <div class="form-group">
          <label for="l-email">Email Address</label>
          <input id="l-email" class="form-input" type="email" autocomplete="email" required>
        </div>
        <div class="form-group form-password">
          <label for="l-password">Password</label>
          <div class="password-input-wrap">
            <input id="l-password" class="form-input" type="password" autocomplete="current-password" required>
            <button type="button" class="form-toggle-password" aria-label="Show password"></button>
          </div>
        </div>
        <p class="form-error form-error-global"></p>
        <button type="submit" class="button primary" style="width:100%">${escapeHtml(cfg.submit || 'Sign In')}</button>
        <p class="form-bottom">Don't have an account? <a href="/sign-up">Sign Up →</a></p>
      </form>
    </div>`;

  const form = block.querySelector('form');
  setupPasswordToggle(form.querySelector('.form-password'), 'l-password');

  const showErr = (msg) => {
    const box = block.querySelector('#l-error');
    box.textContent = msg;
    box.style.display = msg ? 'block' : 'none';
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.querySelector('#l-email');
    const pwd = form.querySelector('#l-password');
    const errEl = form.querySelector('.form-error-global');
    errEl.textContent = '';
    showErr('');
    [email, pwd].forEach(clearFieldError);

    let valid = true;
    if (!window.AdobeSphere.Utils.validateEmail(email.value)) {
      showFieldError(email, 'Enter a valid email address.');
      valid = false;
    }
    if (pwd.value.length < 8) {
      showFieldError(pwd, 'Password must be at least 8 characters.');
      valid = false;
    }
    if (!valid) { showErr('Please check your credentials and try again.'); return; }

    const { Storage, Utils } = window.AdobeSphere;
    const usersRaw = (() => { try { return JSON.parse(localStorage.getItem('adobesphere_users') || '{}'); } catch { return {}; } })();
    const record = usersRaw[email.value.toLowerCase()];
    if (!record || record.password !== pwd.value) {
      showErr('Invalid email or password. Please try again.');
      Utils.toast('Invalid email or password.', 'error');
      return;
    }
    Storage.setSession({ email: email.value.toLowerCase(), name: record.name });
    Utils.toast(`Signed in successfully.`, 'success');
    const redirectTo = new URLSearchParams(window.location.search).get('redirect');
    setTimeout(() => { window.location.href = redirectTo || cfg.after || '/'; }, 350);
  });
}

/* ─────────── SIGNUP ─────────── */

function evaluatePasswordStrength(password) {
  const v = String(password || '');
  const checks = {
    hasMinLength: v.length >= 8,
    hasUppercase: /[A-Z]/.test(v),
    hasLowercase: /[a-z]/.test(v),
    hasNumber: /\d/.test(v),
    hasSpecial: /[^a-zA-Z0-9]/.test(v),
  };
  const met = Object.values(checks).filter(Boolean).length;
  if (!v.length) return { label: '', width: '0%', color: 'transparent', checks };
  if (met === 5 && v.length >= 10) return { label: 'Strong', width: '100%', color: '#22c55e', checks };
  if (checks.hasMinLength && met >= 3) return { label: 'Fair', width: '66%', color: '#f97316', checks };
  return { label: 'Weak', width: '33%', color: '#ef4444', checks };
}

const PWD_GUIDANCE = 'Use a minimum of 8 characters, including 1 uppercase, 1 lowercase, 1 number, and 1 special character.';

function renderSignup(block, cfg) {
  const defaultAvatar = '/assets/images/profiles/default-user.jpg';
  block.innerHTML = `
    <section class="signup-wrapper">
      <form class="form form-signup" id="signup-form" novalidate>
        <div class="signup-brand-header">
          <div class="form-wordmark"><span class="adobe">Adobe</span>sphere</div>
          <h1>${escapeHtml(cfg.title || 'Join Adobesphere — Creative Experience Platform')}</h1>
          <p>${escapeHtml(cfg.subtitle || 'Create your creator profile and get started')}</p>
        </div>

        <div id="su-error" role="alert" aria-live="assertive" style="display:none"></div>

        <div class="form-group">
          <label class="form-label" for="su-name">Full Name*</label>
          <input id="su-name" class="form-input" type="text" autocomplete="name">
          <span class="form-error" data-field="su-name"></span>
        </div>

        <div class="form-group">
          <label class="form-label" for="su-designation">Designation / Role*</label>
          <input id="su-designation" class="form-input" type="text" placeholder="Graphic Designer">
          <span class="form-error" data-field="su-designation"></span>
        </div>

        <div class="form-group">
          <label class="form-label" for="su-email">Email Address*</label>
          <input id="su-email" class="form-input" type="email" autocomplete="email">
          <span class="form-error" data-field="su-email"></span>
        </div>

        <div class="form-group form-password">
          <label class="form-label" for="su-password">Password*</label>
          <div class="password-input-wrap">
            <input id="su-password" class="form-input" type="password" autocomplete="new-password">
            <button type="button" class="form-toggle-password" aria-label="Show password"></button>
          </div>
          <div class="form-strength">
            <span class="form-strength-bar"></span>
            <span class="form-strength-label"></span>
          </div>
          <p class="form-strength-tip"></p>
          <span class="form-error" data-field="su-password"></span>
        </div>

        <div class="form-group form-password">
          <label class="form-label" for="su-password2">Confirm Password*</label>
          <div class="password-input-wrap">
            <input id="su-password2" class="form-input" type="password" autocomplete="new-password">
            <button type="button" class="form-toggle-password" aria-label="Show password"></button>
          </div>
          <span class="form-error" data-field="su-password2"></span>
        </div>

        <div class="form-group">
          <label class="form-label" for="su-bio">About / Bio (optional)</label>
          <textarea id="su-bio" class="form-input" rows="4" maxlength="500"></textarea>
          <small class="form-counter" id="su-bio-count">0 / 500 characters</small>
          <span class="form-error" data-field="su-bio"></span>
        </div>

        <div class="form-group">
          <label class="form-label" for="su-linkedin">LinkedIn Profile*</label>
          <input id="su-linkedin" class="form-input" type="url" placeholder="https://linkedin.com/in/yourprofile">
          <span class="form-error" data-field="su-linkedin"></span>
        </div>

        <div class="form-group">
          <label class="form-label">Profile Picture (optional)</label>
          <div class="avatar-preview-wrap">
            <img id="su-avatar-preview" src="${escapeHtml(defaultAvatar)}" alt="Avatar Preview">
            <label for="su-avatar-file" class="avatar-change-btn">Choose Photo</label>
            <input type="file" id="su-avatar-file" accept=".jpg,.png,.webp,image/jpeg,image/png,image/webp" style="display:none">
          </div>
        </div>

        <button type="submit" class="button primary" style="width:100%">${escapeHtml(cfg.submit || 'Create Account')}</button>
        <p class="form-bottom">Already have an account? <a href="/sign-in">Sign In →</a></p>
      </form>
    </section>

    <div id="su-employee-modal" class="modal-overlay" aria-hidden="true">
      <div class="modal-box">
        <h2>Adobe Employees Only</h2>
        <p class="text-muted" style="margin-top:10px">This application is only for Adobe-registered employees. Please sign up using your @adobe.com email address.</p>
        <div style="display:flex;justify-content:flex-end;margin-top:24px">
          <button type="button" id="su-employee-ok" class="button primary">Okay</button>
        </div>
      </div>
    </div>`;

  const form = block.querySelector('#signup-form');

  // Password toggles
  form.querySelectorAll('.form-password').forEach((wrap) => {
    const id = wrap.querySelector('.form-input')?.id;
    if (id) setupPasswordToggle(wrap, id);
  });

  // Password strength
  const pwdInput = form.querySelector('#su-password');
  const bar = form.querySelector('.form-strength-bar');
  const lbl = form.querySelector('.form-strength-label');
  const tip = form.querySelector('.form-strength-tip');
  pwdInput.addEventListener('input', () => {
    const s = evaluatePasswordStrength(pwdInput.value);
    bar.style.width = s.width;
    bar.style.background = s.color;
    lbl.textContent = s.label;
    lbl.style.color = s.color;
    if (!pwdInput.value.length) {
      tip.textContent = 'Tip: use a mix of letters, numbers, and symbols.';
      tip.style.color = '';
    } else if (s.label === 'Weak' || s.label === 'Fair') {
      tip.textContent = PWD_GUIDANCE;
      tip.style.color = s.color;
    } else {
      tip.textContent = 'Great password — all conditions met.';
      tip.style.color = '#15803d';
    }
  });

  // Bio counter
  const bio = form.querySelector('#su-bio');
  const bioCount = form.querySelector('#su-bio-count');
  bio.addEventListener('input', () => { bioCount.textContent = `${bio.value.length} / 500 characters`; });

  // Avatar preview
  const fileInput = form.querySelector('#su-avatar-file');
  const preview = form.querySelector('#su-avatar-preview');
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { if (ev.target?.result) preview.src = String(ev.target.result); };
    reader.readAsDataURL(file);
  });

  // Employee modal
  const modal = block.querySelector('#su-employee-modal');
  const openModal = () => { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); };
  const closeModal = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); };
  block.querySelector('#su-employee-ok').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  const setFieldErr = (id, msg) => {
    const input = form.querySelector(`#${id}`);
    const errEl = form.querySelector(`[data-field="${id}"]`);
    if (input) input.classList.toggle('error', !!msg);
    if (errEl) errEl.textContent = msg || '';
  };
  const clearAllFieldErrors = () => {
    form.querySelectorAll('.form-input').forEach((i) => i.classList.remove('error'));
    form.querySelectorAll('[data-field]').forEach((s) => { s.textContent = ''; });
  };
  const showTopErr = (msg, html = false) => {
    const box = block.querySelector('#su-error');
    if (html) box.innerHTML = msg; else box.textContent = msg;
    box.style.display = msg ? 'block' : 'none';
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAllFieldErrors();
    showTopErr('');

    const name = form.querySelector('#su-name').value.trim();
    const designation = form.querySelector('#su-designation').value.trim();
    const email = form.querySelector('#su-email').value.trim().toLowerCase();
    const password = form.querySelector('#su-password').value;
    const password2 = form.querySelector('#su-password2').value;
    const bioVal = form.querySelector('#su-bio').value.trim();
    const linkedin = form.querySelector('#su-linkedin').value.trim();
    const avatarSrc = preview.src !== defaultAvatar && !preview.src.endsWith(defaultAvatar) ? preview.src : '';

    const { Utils, Storage } = window.AdobeSphere;
    const strength = evaluatePasswordStrength(password);
    let ok = true;

    if (!name) { setFieldErr('su-name', 'Please enter your full name.'); ok = false; }
    if (!designation) { setFieldErr('su-designation', 'Please enter your role or designation.'); ok = false; }

    if (!email) {
      setFieldErr('su-email', 'Please enter your email address.'); ok = false;
    } else if (!Utils.validateEmail(email)) {
      setFieldErr('su-email', 'Please enter a valid email address.'); ok = false;
    } else if (!/@adobe\.com$/i.test(email)) {
      setFieldErr('su-email', 'Only @adobe.com email addresses are allowed.');
      showTopErr('This application is only for Adobe-registered employees.');
      openModal();
      ok = false;
    }

    if (!password) {
      setFieldErr('su-password', 'Password is required.'); ok = false;
    } else if (strength.label === 'Weak') {
      setFieldErr('su-password', 'Password is too weak — please use a fair or strong password.');
      showTopErr(PWD_GUIDANCE);
      ok = false;
    }
    if (password2 !== password) { setFieldErr('su-password2', 'Passwords do not match.'); ok = false; }

    if (!linkedin) {
      setFieldErr('su-linkedin', 'LinkedIn profile is required.'); ok = false;
    } else if (!/^https:\/\/(www\.)?linkedin\.com\//i.test(linkedin)) {
      setFieldErr('su-linkedin', 'Please enter a valid linkedin.com profile URL.'); ok = false;
    }

    if (ok) {
      const usersRaw = (() => { try { return JSON.parse(localStorage.getItem('adobesphere_users') || '{}'); } catch { return {}; } })();
      if (usersRaw[email]) {
        setFieldErr('su-email', 'Email already in use.');
        showTopErr('An account with this email already exists. <a href="/sign-in">Sign in instead →</a>', true);
        ok = false;
      }
    }

    if (!ok) {
      if (block.querySelector('#su-error').style.display === 'none') {
        showTopErr('Please correct the highlighted fields and try again.');
      }
      Utils.toast('Please fix the highlighted fields.', 'error');
      return;
    }

    const newUser = { email, name, designation, password, bio: bioVal, socials: { linkedin }, avatarSrc, createdAt: new Date().toISOString() };
    Storage.upsertUser(newUser);
    if (typeof Storage.upsertLocalCreator === 'function') Storage.upsertLocalCreator(newUser);
    Storage.setSession({ email, name });
    Utils.toast(`Welcome to Adobesphere, ${name}!`, 'success');
    setTimeout(() => { window.location.href = cfg.after || '/user-profile'; }, 1500);
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
