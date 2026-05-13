const EYE_OPEN_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
const EYE_CLOSED_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1 12 1 12a21.77 21.77 0 0 1 5.06-6.94"></path><path d="M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a21.8 21.8 0 0 1-3.16 4.19"></path><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

// Reads key-value config rows and stores a reference to the help cell.
function readConfig(block) {
  const cfg = {};
  [...block.children].forEach((row) => {
    if (row.children.length !== 2) return;
    const key = row.children[0].textContent.trim().toLowerCase().replace(/\s+/g, '-');
    const cell = row.children[1];
    cfg[key] = cell.textContent.trim();
    if (key === 'help') {
      cfg['help-cell'] = cell;
      cfg['signin-href'] = cell.querySelector('a')?.getAttribute('href') || '/login';
    }
    row.remove();
  });
  return cfg;
}

// Creates a DOM element with optional class and text content.
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// Creates the brand wordmark element with the "adobe" portion colored red.
function buildWordmark(brand) {
  const div = el('div', 'auth-wordmark');
  const text = (brand || 'Adobesphere').trim();
  const lower = text.toLowerCase();
  const aIdx = lower.indexOf('adobe');
  if (aIdx >= 0) {
    const aEnd = aIdx + 5;
    if (aIdx > 0) div.append(document.createTextNode(text.slice(0, aIdx)));
    div.append(el('span', 'adobe', text.slice(aIdx, aEnd)));
    if (aEnd < text.length) div.append(document.createTextNode(text.slice(aEnd)));
  } else {
    div.textContent = text;
  }
  return div;
}

// Creates a hidden accessible error alert box with the given id.
function buildErrorBox(id) {
  const box = el('div', 'auth-error-box');
  box.id = id;
  box.setAttribute('role', 'alert');
  box.setAttribute('aria-live', 'assertive');
  box.hidden = true;
  return box;
}

// Creates a labeled form field group with an inline error span.
function buildField({ id, type = 'text', label, placeholder, autocomplete, required = true }) {
  const group = el('div', 'form-group');
  const lbl = el('label', 'auth-label', label || '');
  lbl.htmlFor = id;
  const input = el('input', 'form-input');
  input.type = type;
  input.id = id;
  if (placeholder) input.placeholder = placeholder;
  if (autocomplete) input.autocomplete = autocomplete;
  if (required) input.required = true;
  const errSpan = el('span', 'form-error');
  errSpan.setAttribute('data-field', id);
  group.append(lbl, input, errSpan);
  return { group, input };
}

// Creates a password input group with a visibility toggle button.
function buildPasswordField({ id, label, autocomplete }) {
  const group = el('div', 'form-group form-password-group');
  const lbl = el('label', 'auth-label', label || '');
  lbl.htmlFor = id;

  const wrap = el('div', 'password-input-wrap');
  const input = el('input', 'form-input');
  input.type = 'password';
  input.id = id;
  input.autocomplete = autocomplete || 'current-password';
  input.required = true;

  const toggleBtn = el('button', 'form-toggle-password');
  toggleBtn.type = 'button';
  toggleBtn.setAttribute('aria-label', 'Show password');
  toggleBtn.innerHTML = EYE_OPEN_SVG;
  toggleBtn.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    toggleBtn.innerHTML = show ? EYE_CLOSED_SVG : EYE_OPEN_SVG;
    toggleBtn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
  wrap.append(input, toggleBtn);

  const errSpan = el('span', 'form-error');
  errSpan.setAttribute('data-field', id);
  group.append(lbl, wrap, errSpan);
  return { group, input };
}

// Creates the help text paragraph from the authored cell content.
function buildHelpLine(cfg) {
  const p = el('p', 'auth-help');
  const cell = cfg['help-cell'];
  if (cell) {
    const authored = cell.querySelector('p') || cell;
    while (authored.firstChild) p.append(authored.firstChild);
  }
  return p;
}

// Returns a function that shows or hides the error box with an optional message and link.
function makeShowErr(errorBox) {
  return (msg, linkText, linkHref) => {
    errorBox.textContent = '';
    if (!msg) { errorBox.hidden = true; return; }
    errorBox.append(document.createTextNode(msg));
    if (linkText && linkHref) {
      const a = el('a', '', linkText);
      a.href = linkHref;
      errorBox.append(document.createTextNode(' '), a);
    }
    errorBox.hidden = false;
  };
}

// Sets or clears the error state on a specific form field.
function setFieldErr(form, id, msg) {
  const input = form.querySelector(`#${id}`);
  const span = form.querySelector(`[data-field="${id}"]`);
  if (input) input.classList.toggle('error', !!msg);
  if (span) span.textContent = msg || '';
}

// Clears all field errors and the global error box.
function clearAllErrors(form, errorBox) {
  form.querySelectorAll('.form-input').forEach((i) => i.classList.remove('error'));
  form.querySelectorAll('[data-field]').forEach((s) => { s.textContent = ''; });
  errorBox.textContent = '';
  errorBox.hidden = true;
}

// Builds and returns the sign-in form DOM elements.
function buildSigninDom(cfg) {
  const wrapper = el('div', 'auth-wrapper auth-signin-wrapper');

  const header = el('div', 'auth-header');
  const h1 = el('h1', '', cfg.heading || 'Welcome Back');
  const sub = el('p', 'auth-subheading', cfg.subheading || '');
  header.append(buildWordmark(cfg.brand), h1, sub);

  const errorBox = buildErrorBox('auth-signin-error');

  const form = el('form', 'auth-form-inner');
  form.noValidate = true;

  const { group: emailGroup, input: emailInput } = buildField({
    id: 'af-signin-email',
    type: 'email',
    label: cfg['label-email'] || 'Email Address',
    autocomplete: 'email',
  });

  const { group: pwdGroup, input: pwdInput } = buildPasswordField({
    id: 'af-signin-password',
    label: cfg['label-password'] || 'Password',
    autocomplete: 'current-password',
  });

  const submitBtn = el('button', 'button primary auth-submit', cfg.submit || 'Sign In');
  submitBtn.type = 'submit';

  form.append(errorBox, emailGroup, pwdGroup, submitBtn, buildHelpLine(cfg));
  wrapper.append(header, form);

  return { wrapper, form, errorBox, emailInput, pwdInput };
}

// Attaches submit handling and validation to the sign-in form.
function wireSignin({ form, errorBox, emailInput, pwdInput, cfg }) {
  const { Utils, Storage } = window.AdobeSphere;
  const showErr = makeShowErr(errorBox);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAllErrors(form, errorBox);

    let valid = true;
    if (!Utils.validateEmail(emailInput.value)) {
      setFieldErr(form, emailInput.id, 'Enter a valid email address.');
      valid = false;
    }
    if (pwdInput.value.length < 8) {
      setFieldErr(form, pwdInput.id, 'Password must be at least 8 characters.');
      valid = false;
    }
    if (!valid) { showErr('Please check your credentials and try again.'); return; }

    const users = (() => {
      try { return JSON.parse(localStorage.getItem('adobesphere_users') || '{}'); } catch { return {}; }
    })();
    const record = users[emailInput.value.toLowerCase()];
    if (!record || record.password !== pwdInput.value) {
      showErr('Invalid email or password. Please try again.');
      Utils.toast('Invalid email or password.', 'error');
      return;
    }

    Storage.setSession({ email: emailInput.value.toLowerCase(), name: record.name });
    Utils.toast('Signed in successfully.', 'success');
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    setTimeout(() => { window.location.href = redirect || cfg.after || '/'; }, 350);
  });
}

// Evaluates password strength and returns label, progress bar width, and color.
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
  if (!v.length) return { label: '', width: '0%', color: 'transparent' };
  if (met === 5 && v.length >= 10) return { label: 'Strong', width: '100%', color: '#22c55e' };
  if (checks.hasMinLength && met >= 3) return { label: 'Fair', width: '66%', color: '#f97316' };
  return { label: 'Weak', width: '33%', color: '#ef4444' };
}

const PWD_GUIDANCE = 'Use a minimum of 8 characters — include uppercase, lowercase, a number, and a special character.';

// Creates the password strength meter bar and label elements.
function buildStrengthMeter() {
  const wrap = el('div', 'form-strength');
  const bar = el('span', 'form-strength-bar');
  const lbl = el('span', 'form-strength-label');
  wrap.append(bar, lbl);
  const tip = el('p', 'form-strength-tip');
  return { wrap, bar, lbl, tip };
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

// Creates the avatar upload field with a live preview image.
function buildAvatarField(cfg) {
  const DEFAULT = '/assets/images/profiles/default-user.jpg';
  const group = el('div', 'form-group');
  const lbl = el('label', 'auth-label', cfg['label-avatar'] || 'Profile Picture (optional)');

  const previewWrap = el('div', 'avatar-preview-wrap');
  const preview = el('img', 'auth-avatar-preview');
  preview.id = 'af-avatar-preview';
  preview.src = DEFAULT;
  preview.alt = cfg['avatar-preview'] || 'Avatar preview';

  const chooseLabel = el('label', 'avatar-change-btn', cfg['avatar-action'] || 'Choose Photo');
  chooseLabel.htmlFor = 'af-avatar-file';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'af-avatar-file';
  fileInput.accept = '.jpg,.png,.webp,image/jpeg,image/png,image/webp';
  fileInput.className = 'auth-avatar-file';
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    compressAvatar(file, (src) => { if (src) preview.src = src; });
  });

  previewWrap.append(preview, chooseLabel, fileInput);
  group.append(lbl, previewWrap);
  return { group, preview, defaultSrc: DEFAULT };
}

// Builds the "Adobe employees only" modal and fetches its content from a DA.live fragment.
function buildEmployeeModal(cfg = {}) {
  const overlay = el('div', 'modal-overlay auth-employee-modal');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const box = el('div', 'modal-box');
  const titleEl = el('h2', '', cfg['modal-title'] || 'Adobe Employees Only');
  const bodyEl = el('p', 'text-muted', cfg['modal-body'] || 'This application is only for Adobe-registered employees. Please sign up using your @adobe.com email address.');

  const footer = el('div', 'modal-footer');
  const okBtn = el('button', 'button primary', cfg['modal-button'] || 'Okay');
  okBtn.type = 'button';
  footer.append(okBtn);
  box.append(titleEl, bodyEl, footer);
  overlay.append(box);

  const open = () => { overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; };
  const close = () => { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };
  okBtn.addEventListener('click', close);
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) close(); });

  const src = cfg['modal-source'] || '/modals/employee-only';
  fetch(`${src}.plain.html`)
    .then((r) => (r.ok ? r.text() : null))
    .then((html) => {
      if (!html) return;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const heading = doc.querySelector('h1, h2, h3');
      const para = doc.querySelector('p');
      const btn = doc.querySelector('strong, em, b');
      if (heading) titleEl.textContent = heading.textContent.trim();
      if (para) bodyEl.textContent = para.textContent.trim();
      if (btn) okBtn.textContent = btn.textContent.trim();
    })
    .catch(() => {});

  return { overlay, open };
}

// Builds and returns the sign-up form DOM with all input fields.
function buildSignupDom(cfg) {
  const wrapper = el('div', 'auth-wrapper auth-signup-wrapper');

  const header = el('div', 'auth-header');
  const h1 = el('h1', 'auth-signup-heading', cfg.heading || 'Join Adobesphere');
  const sub = el('p', 'auth-subheading', cfg.subheading || '');
  header.append(buildWordmark(cfg.brand), h1, sub);

  const form = el('form', 'auth-form-inner');
  form.id = 'af-signup-form';
  form.noValidate = true;

  const errorBox = buildErrorBox('auth-signup-error');

  const { group: nameGroup, input: nameInput } = buildField({
    id: 'af-name',
    label: cfg['label-name'] || 'Full Name',
    autocomplete: 'name',
  });

  const { group: desigGroup, input: desigInput } = buildField({
    id: 'af-designation',
    label: cfg['label-designation'] || 'Designation / Role',
    placeholder: cfg['placeholder-designation'] || 'e.g. Graphic Designer',
  });

  const { group: emailGroup, input: emailInput } = buildField({
    id: 'af-email',
    type: 'email',
    label: cfg['label-email'] || 'Email Address',
    autocomplete: 'email',
  });

  const { group: pwdGroup, input: pwdInput } = buildPasswordField({
    id: 'af-password',
    label: cfg['label-password'] || 'Password',
    autocomplete: 'new-password',
  });
  const { wrap: strengthWrap, bar: strengthBar, lbl: strengthLbl, tip: strengthTip } = buildStrengthMeter();
  const pwdHelp = cfg['password-help'] || PWD_GUIDANCE;
  pwdInput.addEventListener('input', () => {
    const s = evaluatePasswordStrength(pwdInput.value);
    strengthBar.style.width = s.width;
    strengthBar.style.background = s.color;
    strengthLbl.textContent = s.label;
    strengthLbl.style.color = s.color;
    if (!pwdInput.value.length) {
      strengthTip.textContent = pwdHelp;
      strengthTip.style.color = '';
    } else if (s.label === 'Strong') {
      strengthTip.textContent = 'Great password — all conditions met.';
      strengthTip.style.color = '#15803d';
    } else {
      strengthTip.textContent = pwdHelp;
      strengthTip.style.color = s.color;
    }
  });
  pwdGroup.append(strengthWrap, strengthTip);

  const { group: confirmGroup, input: confirmInput } = buildPasswordField({
    id: 'af-password2',
    label: cfg['label-confirm'] || 'Confirm Password',
    autocomplete: 'new-password',
  });

  const bioGroup = el('div', 'form-group');
  const bioLbl = el('label', 'auth-label', cfg['label-bio'] || 'About / Bio (optional)');
  bioLbl.htmlFor = 'af-bio';
  const bioInput = el('textarea', 'form-input');
  bioInput.id = 'af-bio';
  bioInput.rows = 4;
  const counterText = cfg['bio-counter'] || '0 / 500 characters';
  const bioMax = parseInt((counterText.match(/\/\s*(\d+)/) || [])[1], 10) || 500;
  bioInput.maxLength = bioMax;
  const bioCount = el('small', 'form-counter', counterText);
  bioCount.id = 'af-bio-count';
  bioInput.addEventListener('input', () => {
    bioCount.textContent = `${bioInput.value.length} / ${bioMax} characters`;
  });
  const bioErr = el('span', 'form-error');
  bioErr.setAttribute('data-field', 'af-bio');
  bioGroup.append(bioLbl, bioInput, bioCount, bioErr);

  const { group: linkedinGroup, input: linkedinInput } = buildField({
    id: 'af-linkedin',
    type: 'url',
    label: cfg['label-linkedin'] || 'LinkedIn Profile',
    placeholder: cfg['placeholder-linkedin'] || 'https://linkedin.com/in/yourprofile',
  });

  const { group: avatarGroup, preview: avatarPreview, defaultSrc } = buildAvatarField(cfg);

  const submitBtn = el('button', 'button primary auth-submit', cfg.submit || 'Create Account');
  submitBtn.type = 'submit';

  form.append(
    errorBox,
    nameGroup,
    desigGroup,
    emailGroup,
    pwdGroup,
    confirmGroup,
    bioGroup,
    linkedinGroup,
    avatarGroup,
    submitBtn,
    buildHelpLine(cfg),
  );
  wrapper.append(header, form);

  const { overlay: modal, open: openModal } = buildEmployeeModal(cfg);

  return {
    wrapper,
    form,
    errorBox,
    nameInput,
    desigInput,
    emailInput,
    pwdInput,
    confirmInput,
    bioInput,
    linkedinInput,
    avatarPreview,
    defaultSrc,
    modal,
    openModal,
  };
}

// Attaches submit handling and validation to the sign-up form.
function wireSignup(refs, cfg) {
  const {
    form, errorBox,
    nameInput, desigInput, emailInput,
    pwdInput, confirmInput,
    bioInput, linkedinInput,
    avatarPreview, defaultSrc,
    openModal,
  } = refs;
  const { Utils, Storage } = window.AdobeSphere;
  const showErr = makeShowErr(errorBox);

  // Session storage key for signup form
  const SESSION_KEY = 'adobesphere_signup_form';

  // Load saved form data from session storage
  const loadFromSession = () => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      if (data.name) nameInput.value = data.name;
      if (data.designation) desigInput.value = data.designation;
      if (data.email) emailInput.value = data.email;
      if (data.password) pwdInput.value = data.password;
      if (data.confirmPassword) confirmInput.value = data.confirmPassword;
      if (data.bio) bioInput.value = data.bio;
      if (data.linkedin) linkedinInput.value = data.linkedin;
    } catch (e) {
      // Ignore parsing errors
    }
  };

  // Save form data to session storage
  const saveToSession = () => {
    const data = {
      name: nameInput.value,
      designation: desigInput.value,
      email: emailInput.value,
      password: pwdInput.value,
      confirmPassword: confirmInput.value,
      bio: bioInput.value,
      linkedin: linkedinInput.value,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  };

  // Clear session storage on successful submission
  const clearSession = () => {
    sessionStorage.removeItem(SESSION_KEY);
  };

  // Add event listeners to save form data
  [nameInput, desigInput, emailInput, pwdInput, confirmInput, bioInput, linkedinInput].forEach((input) => {
    input.addEventListener('input', saveToSession);
  });

  // Load saved data when form loads
  loadFromSession();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAllErrors(form, errorBox);

    const name = nameInput.value.trim();
    const designation = desigInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const password = pwdInput.value;
    const password2 = confirmInput.value;
    const bio = bioInput.value.trim();
    const linkedin = linkedinInput.value.trim();
    const avatarSrc = avatarPreview.src !== defaultSrc && !avatarPreview.src.endsWith(defaultSrc)
      ? avatarPreview.src : '';

    const strength = evaluatePasswordStrength(password);
    let ok = true;

    if (!name) { setFieldErr(form, 'af-name', 'Please enter your full name.'); ok = false; }
    if (!designation) { setFieldErr(form, 'af-designation', 'Please enter your role or designation.'); ok = false; }

    if (!email) {
      setFieldErr(form, 'af-email', 'Please enter your email address.'); ok = false;
    } else if (!Utils.validateEmail(email)) {
      setFieldErr(form, 'af-email', 'Please enter a valid email address.'); ok = false;
    } else if (!/@adobe\.com$/i.test(email)) {
      setFieldErr(form, 'af-email', 'Only @adobe.com email addresses are allowed.');
      showErr('This application is only for Adobe-registered employees.');
      openModal();
      ok = false;
    }

    if (!password) {
      setFieldErr(form, 'af-password', 'Password is required.'); ok = false;
    } else if (strength.label === 'Weak') {
      setFieldErr(form, 'af-password', 'Password is too weak — please use a fair or strong password.');
      showErr(cfg['password-help'] || PWD_GUIDANCE);
      ok = false;
    }
    if (password2 !== password) { setFieldErr(form, 'af-password2', 'Passwords do not match.'); ok = false; }

    if (!linkedin) {
      setFieldErr(form, 'af-linkedin', 'LinkedIn profile is required.'); ok = false;
    } else if (!/^https:\/\/(www\.)?linkedin\.com\//i.test(linkedin)) {
      setFieldErr(form, 'af-linkedin', 'Please enter a valid linkedin.com URL.'); ok = false;
    }

    if (ok) {
      const users = (() => {
        try { return JSON.parse(localStorage.getItem('adobesphere_users') || '{}'); } catch { return {}; }
      })();
      if (users[email]) {
        setFieldErr(form, 'af-email', 'Email already in use.');
        showErr('An account with this email already exists.', 'Sign in instead →', cfg['signin-href'] || '/login');
        ok = false;
      }
    }

    if (!ok) {
      if (errorBox.hidden) showErr('Please correct the highlighted fields and try again.');
      Utils.toast('Please fix the highlighted fields.', 'error');
      return;
    }

    const newUser = {
      email, name, designation, password,
      bio, socials: { linkedin }, avatarSrc,
      createdAt: new Date().toISOString(),
    };
    Storage.upsertUser(newUser);
    if (typeof Storage.upsertLocalCreator === 'function') Storage.upsertLocalCreator(newUser);
    Storage.setSession({ email, name });
    clearSession();
    Utils.toast(`Welcome to Adobesphere, ${name}!`, 'success');
    setTimeout(() => { window.location.href = cfg.after || '/user-profile'; }, 1500);
  });
}

// Dispatches to sign-in or sign-up rendering based on the block variant.
export default function decorate(block) {
  const isSignup = block.classList.contains('signup');
  const cfg = readConfig(block);
  block.textContent = '';

  if (isSignup) {
    const refs = buildSignupDom(cfg);
    block.append(refs.wrapper, refs.modal);
    wireSignup(refs, cfg);
  } else {
    const refs = buildSigninDom(cfg);
    block.append(refs.wrapper);
    wireSignin({ ...refs, cfg });
  }
}
