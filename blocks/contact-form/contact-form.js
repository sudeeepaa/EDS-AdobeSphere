/**
 * AdobeSphere contact-form block.
 *
 * Authoring contract (config rows in DA.live):
 *   Form Action | https://formspree.io/f/YOUR_ID   (optional — falls back to localStorage)
 *   Submit      | Send Message                      (optional)
 *   Success     | Thanks — we'll get back…          (optional)
 *   Label Name     | Full Name                      (optional, overrides field label)
 *   Label Email    | Email Address                  (optional)
 *   Label Subject  | Subject                        (optional)
 *   Label Category | Category                       (optional)
 *   Label Message  | Message                        (optional)
 *
 * All other copy (page heading, description) is authored as plain content
 * above the block in DA.live.
 *
 * If "Form Action" is set, the form POSTs JSON to that URL (Formspree-compatible).
 * Otherwise submissions are stored locally via Storage.addContactSubmission.
 */

const CATEGORIES = [
  ['', 'Select a category'],
  ['general', 'General Inquiry'],
  ['event-registration', 'Event Registration Help'],
  ['blog-submission', 'Blog Submission'],
  ['login-issue', 'Sign Up / Login Issue'],
  ['account-help', 'Account / Profile Help'],
  ['technical', 'Technical Issue'],
  ['creator-profile', 'Creator Profile'],
  ['other', 'Other'],
];

function makeGroup(id, labelText) {
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

function makeInput(id, type, autocomplete) {
  const input = document.createElement('input');
  input.id = id;
  input.className = 'form-input';
  input.type = type;
  input.required = true;
  if (autocomplete) input.autocomplete = autocomplete;
  return input;
}

function makeSelect(id, choices) {
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

function makeTextarea(id, rows, maxlength) {
  const ta = document.createElement('textarea');
  ta.id = id;
  ta.className = 'form-input';
  ta.rows = rows;
  ta.maxLength = maxlength;
  ta.required = true;
  return ta;
}

export default function decorate(block) {
  // ── Parse config rows ──────────────────────────────────────────────────
  const cfg = {};
  [...block.children].forEach((row) => {
    if (row.children.length !== 2) return;
    const k = row.children[0].textContent.trim().toLowerCase().replace(/\s+/g, '-');
    cfg[k] = row.children[1].textContent.trim();
    row.remove();
  });

  const { Utils, Storage } = window.AdobeSphere;

  // ── Success banner ─────────────────────────────────────────────────────
  const successBanner = document.createElement('div');
  successBanner.className = 'cf-success';
  successBanner.setAttribute('role', 'status');
  successBanner.setAttribute('aria-live', 'polite');
  successBanner.hidden = true;

  // ── Form ───────────────────────────────────────────────────────────────
  const form = document.createElement('form');
  form.className = 'cf-form';
  form.setAttribute('novalidate', '');

  // Name
  const nameGrp = makeGroup('cf-name', cfg['label-name'] || 'Full Name');
  const nameI = makeInput('cf-name', 'text', 'name');
  nameGrp.group.append(nameI, nameGrp.err);

  // Email
  const emailGrp = makeGroup('cf-email', cfg['label-email'] || 'Email Address');
  const emailI = makeInput('cf-email', 'email', 'email');
  emailGrp.group.append(emailI, emailGrp.err);

  // Subject
  const subjectGrp = makeGroup('cf-subject', cfg['label-subject'] || 'Subject');
  const subjectI = makeInput('cf-subject', 'text', '');
  subjectGrp.group.append(subjectI, subjectGrp.err);

  // Category
  const categoryGrp = makeGroup('cf-category', cfg['label-category'] || 'Category');
  const categoryI = makeSelect('cf-category', CATEGORIES);
  categoryGrp.group.append(categoryI, categoryGrp.err);

  // Message
  const msgGrp = makeGroup('cf-message', cfg['label-message'] || 'Message');
  const msgI = makeTextarea('cf-message', 4, 500);

  const counter = document.createElement('small');
  counter.className = 'cf-counter';
  counter.textContent = '0 / 500';

  msgGrp.group.append(msgI, counter, msgGrp.err);

  // Submit button
  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'button primary';
  submitBtn.textContent = cfg['submit'] || 'Send Message';

  form.append(
    nameGrp.group,
    emailGrp.group,
    subjectGrp.group,
    categoryGrp.group,
    msgGrp.group,
    submitBtn,
  );

  block.textContent = '';
  block.append(successBanner, form);

  // ── Character counter ──────────────────────────────────────────────────
  msgI.addEventListener('input', () => {
    const len = msgI.value.length;
    counter.textContent = `${len} / 500`;
    counter.classList.toggle('cf-counter-over', len > 500);
  });

  // ── Validation helper ──────────────────────────────────────────────────
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

  // ── Submit ─────────────────────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const name = nameI.value.trim();
    const email = emailI.value.trim();
    const subject = subjectI.value.trim();
    const category = categoryI.value;
    const message = msgI.value.trim();
    let valid = true;

    if (!name) { setErr('cf-name', 'Please enter your name.'); valid = false; }
    if (!Utils.validateEmail(email)) { setErr('cf-email', 'Please enter a valid email.'); valid = false; }
    if (!subject) { setErr('cf-subject', 'Please enter a subject.'); valid = false; }
    if (!category) { setErr('cf-category', 'Please select a category.'); valid = false; }
    if (!message || message.length < 20) { setErr('cf-message', 'Message must be at least 20 characters.'); valid = false; }
    if (!valid) { Utils.toast('Please fix the highlighted fields.', 'error'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    const payload = { name, email, subject, category, message };

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
      counter.textContent = '0 / 500';

      successBanner.textContent = cfg['success'] || 'Thanks — we\'ll get back to you within 24–48 hours.';
      successBanner.hidden = false;
      setTimeout(() => { successBanner.hidden = true; }, 6000);
    } catch {
      Utils.toast('Failed to send. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = cfg['submit'] || 'Send Message';
    }
  });
}
