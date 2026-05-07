/**
 * AdobeSphere — auth-form block.
 *
 * Variants: auth-form (signin) | auth-form (signup)
 *
 * DA.live authoring contract — two-column key | value rows:
 *
 * SIGNIN:
 *   Heading         | Welcome Back
 *   Subheading      | Sign in to your Adobesphere account
 *   Label Email     | Email Address
 *   Label Password  | Password
 *   Submit          | Sign In
 *   Help            | [rich text] Don't have an account? Sign Up → (link to /signup)
 *   After           | /
 *
 * SIGNUP:
 *   Heading                 | Join Adobesphere
 *   Subheading              | Create your account — free, takes 30 seconds
 *   Label Name              | Full Name
 *   Label Designation       | Designation / Role
 *   Placeholder Designation | e.g. Graphic Designer
 *   Label Email             | Email Address
 *   Label Password          | Password
 *   Label Confirm           | Confirm Password
 *   Label Bio               | About / Bio (optional)
 *   Label LinkedIn          | LinkedIn Profile
 *   Placeholder LinkedIn    | https://linkedin.com/in/yourprofile
 *   Label Avatar            | Profile Picture (optional)
 *   Submit                  | Create Account
 *   Help                    | [rich text] Already have an account? Sign In → (link to /login)
 *   After                   | /user-profile
 *
 * JS only handles interaction — all visible text and links come from DA.live.
 */

/* ─── SVG constants (UI-only, not authored content) ─── */
const EYE_OPEN_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
const EYE_CLOSED_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1 12 1 12a21.77 21.77 0 0 1 5.06-6.94"></path><path d="M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a21.8 21.8 0 0 1-3.16 4.19"></path><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

/* ─── Config reader ─── */

function readConfig(block) {
  const cfg = {};
  [...block.children].forEach((row) => {
    if (row.children.length !== 2) return;
    const key = row.children[0].textContent.trim().toLowerCase().replace(/\s+/g, '-');
    const cell = row.children[1];
    cfg[key] = cell.textContent.trim();
    if (key === 'help') {
      // Store cell reference AND extract the authored link href now, before buildHelpLine
      // moves the child nodes away. getAttribute gives the raw relative path (/login),
      // whereas .href gives the absolute URL — we want the relative form.
      cfg['help-cell'] = cell;
      cfg['signin-href'] = cell.querySelector('a')?.getAttribute('href') || '/login';
    }
    row.remove();
  });
  return cfg;
}

/* ─── DOM helpers (no innerHTML for content) ─── */

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function buildWordmark() {
  const div = el('div', 'auth-wordmark');
  const adobe = el('span', 'adobe', 'Adobe');
  div.append(adobe, document.createTextNode('sphere'));
  return div;
}

function buildErrorBox(id) {
  const box = el('div', 'auth-error-box');
  box.id = id;
  box.setAttribute('role', 'alert');
  box.setAttribute('aria-live', 'assertive');
  box.hidden = true;
  return box;
}

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

function buildHelpLine(cfg) {
  const p = el('p', 'auth-help');
  const cell = cfg['help-cell'];
  if (cell) {
    // EDS cell structure: <div(cell)> → <p> → [text nodes + <a>]
    // We want the inline children of the authored <p>, not the <p> itself
    // (nesting a <p> inside our <p> is invalid HTML).
    const authored = cell.querySelector('p') || cell;
    while (authored.firstChild) p.append(authored.firstChild);
  }
  return p;
}

/* ─── Error helpers ─── */

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

function setFieldErr(form, id, msg) {
  const input = form.querySelector(`#${id}`);
  const span = form.querySelector(`[data-field="${id}"]`);
  if (input) input.classList.toggle('error', !!msg);
  if (span) span.textContent = msg || '';
}

function clearAllErrors(form, errorBox) {
  form.querySelectorAll('.form-input').forEach((i) => i.classList.remove('error'));
  form.querySelectorAll('[data-field]').forEach((s) => { s.textContent = ''; });
  errorBox.textContent = '';
  errorBox.hidden = true;
}

/* ═══════════════════════════════════
   SIGN IN
═══════════════════════════════════ */

function buildSigninDom(cfg) {
  const wrapper = el('div', 'auth-wrapper auth-signin-wrapper');

  const header = el('div', 'auth-header');
  const h1 = el('h1', '', cfg.heading || 'Welcome Back');
  const sub = el('p', 'auth-subheading', cfg.subheading || '');
  header.append(buildWordmark(), h1, sub);

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

/* ═══════════════════════════════════
   SIGN UP
═══════════════════════════════════ */

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

function buildStrengthMeter() {
  const wrap = el('div', 'form-strength');
  const bar = el('span', 'form-strength-bar');
  const lbl = el('span', 'form-strength-label');
  wrap.append(bar, lbl);
  const tip = el('p', 'form-strength-tip');
  return { wrap, bar, lbl, tip };
}

function buildAvatarField(cfg) {
  const DEFAULT = '/assets/images/profiles/default-user.jpg';
  const group = el('div', 'form-group');
  const lbl = el('label', 'auth-label', cfg['label-avatar'] || 'Profile Picture (optional)');

  const previewWrap = el('div', 'avatar-preview-wrap');
  const preview = el('img', 'auth-avatar-preview');
  preview.id = 'af-avatar-preview';
  preview.src = DEFAULT;
  preview.alt = 'Avatar preview';

  const chooseLabel = el('label', 'avatar-change-btn', 'Choose Photo');
  chooseLabel.htmlFor = 'af-avatar-file';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'af-avatar-file';
  fileInput.accept = '.jpg,.png,.webp,image/jpeg,image/png,image/webp';
  fileInput.className = 'auth-avatar-file';
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { if (ev.target?.result) preview.src = String(ev.target.result); };
    reader.readAsDataURL(file);
  });

  previewWrap.append(preview, chooseLabel, fileInput);
  group.append(lbl, previewWrap);
  return { group, preview, defaultSrc: DEFAULT };
}

function buildEmployeeModal() {
  const overlay = el('div', 'modal-overlay auth-employee-modal');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const box = el('div', 'modal-box');
  const title = el('h2', '', 'Adobe Employees Only');
  const body = el('p', 'text-muted');
  body.textContent = 'This application is only for Adobe-registered employees. Please sign up using your @adobe.com email address.';

  const footer = el('div', 'modal-footer');
  const okBtn = el('button', 'button primary', 'Okay');
  okBtn.type = 'button';
  footer.append(okBtn);
  box.append(title, body, footer);
  overlay.append(box);

  const open = () => { overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; };
  const close = () => { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };
  okBtn.addEventListener('click', close);
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) close(); });

  return { overlay, open };
}

function buildSignupDom(cfg) {
  const wrapper = el('div', 'auth-wrapper auth-signup-wrapper');

  const header = el('div', 'auth-header');
  const h1 = el('h1', 'auth-signup-heading', cfg.heading || 'Join Adobesphere');
  const sub = el('p', 'auth-subheading', cfg.subheading || '');
  header.append(buildWordmark(), h1, sub);

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
  pwdInput.addEventListener('input', () => {
    const s = evaluatePasswordStrength(pwdInput.value);
    strengthBar.style.width = s.width;
    strengthBar.style.background = s.color;
    strengthLbl.textContent = s.label;
    strengthLbl.style.color = s.color;
    if (!pwdInput.value.length) {
      strengthTip.textContent = 'Tip: use a mix of letters, numbers, and symbols.';
      strengthTip.style.color = '';
    } else if (s.label === 'Strong') {
      strengthTip.textContent = 'Great password — all conditions met.';
      strengthTip.style.color = '#15803d';
    } else {
      strengthTip.textContent = PWD_GUIDANCE;
      strengthTip.style.color = s.color;
    }
  });
  pwdGroup.append(strengthWrap, strengthTip);

  const { group: confirmGroup, input: confirmInput } = buildPasswordField({
    id: 'af-password2',
    label: cfg['label-confirm'] || 'Confirm Password',
    autocomplete: 'new-password',
  });

  // Bio textarea
  const bioGroup = el('div', 'form-group');
  const bioLbl = el('label', 'auth-label', cfg['label-bio'] || 'About / Bio (optional)');
  bioLbl.htmlFor = 'af-bio';
  const bioInput = el('textarea', 'form-input');
  bioInput.id = 'af-bio';
  bioInput.rows = 4;
  bioInput.maxLength = 500;
  const bioCount = el('small', 'form-counter', '0 / 500 characters');
  bioCount.id = 'af-bio-count';
  bioInput.addEventListener('input', () => {
    bioCount.textContent = `${bioInput.value.length} / 500 characters`;
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

  const { overlay: modal, open: openModal } = buildEmployeeModal();

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
      showErr(PWD_GUIDANCE);
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
    Utils.toast(`Welcome to Adobesphere, ${name}!`, 'success');
    setTimeout(() => { window.location.href = cfg.after || '/user-profile'; }, 1500);
  });
}

/* ─── Dispatcher ─── */

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
