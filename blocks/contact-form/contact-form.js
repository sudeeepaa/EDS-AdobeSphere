// Creates a form group with a label and error span for the given field id.
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

// Creates an input element with optional autocomplete.
function makeInput(id, type, autocomplete) {
  const input = document.createElement('input');
  input.id = id;
  input.className = 'form-input';
  input.type = type;
  input.required = true;
  if (autocomplete) input.autocomplete = autocomplete;
  return input;
}

// Creates a select element populated with the given choices.
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

// Creates a textarea element with the given row count and max length.
function makeTextarea(id, rows, maxlength) {
  const ta = document.createElement('textarea');
  ta.id = id;
  ta.className = 'form-input';
  ta.rows = rows;
  ta.maxLength = maxlength;
  ta.required = true;
  return ta;
}

// Decorates the contact-form block with a validated submission form.
export default function decorate(block) {
  const cfg = {};
  const categoryOptions = [];
  let currentKey = '';

  [...block.children].forEach((row) => {
    if (row.children.length !== 2) return;
    const k = row.children[0].textContent.trim().toLowerCase().replace(/\s+/g, '-');
    const v = row.children[1].textContent.trim();

    // Handle multi-row category options
    if (k === 'category-options' || (!k && currentKey === 'category-options')) {
      if (k === 'category-options') currentKey = 'category-options';
      if (v) categoryOptions.push([v.toLowerCase().replace(/\s+/g, '-'), v]);
    } else {
      cfg[k] = v;
      currentKey = k;
    }
    row.remove();
  });

  const { Utils, Storage } = window.AdobeSphere;
  const isLoggedIn = Storage.isLoggedIn();
  const currentUser = isLoggedIn ? Storage.getCurrentUser() : null;

  // Parse which fields to show based on login status
  const guestFields = cfg['show-for-guests']?.split(',').map(f => f.trim()) || [];
  const loggedInFields = cfg['show-for-logged-in']?.split(',').map(f => f.trim()) || [];
  const fieldsToShow = isLoggedIn ? loggedInFields : guestFields;

  const successBanner = document.createElement('div');
  successBanner.className = 'cf-success';
  successBanner.setAttribute('role', 'status');
  successBanner.setAttribute('aria-live', 'polite');
  successBanner.hidden = true;

  const form = document.createElement('form');
  form.className = 'cf-form';
  form.setAttribute('novalidate', '');

  // Build form fields dynamically based on config
  const fields = {};

  // Name field
  if (fieldsToShow.includes('name')) {
    const nameGrp = makeGroup('cf-name', cfg['label-name'] || 'Full Name');
    const nameI = makeInput('cf-name', 'text', 'name');
    nameI.value = currentUser?.name || '';
    if (isLoggedIn) nameI.readOnly = true;
    nameGrp.group.append(nameI, nameGrp.err);
    form.append(nameGrp.group);
    fields.name = { input: nameI, id: 'cf-name' };
  }

  // Email field
  if (fieldsToShow.includes('email')) {
    const emailGrp = makeGroup('cf-email', cfg['label-email'] || 'Email Address');
    const emailI = makeInput('cf-email', 'email', 'email');
    emailI.value = currentUser?.email || '';
    if (isLoggedIn) emailI.readOnly = true;
    emailGrp.group.append(emailI, emailGrp.err);
    form.append(emailGrp.group);
    fields.email = { input: emailI, id: 'cf-email' };
  }

  // Subject field
  if (fieldsToShow.includes('subject')) {
    const subjectGrp = makeGroup('cf-subject', cfg['label-subject'] || 'Subject');
    const subjectI = makeInput('cf-subject', 'text', '');
    subjectGrp.group.append(subjectI, subjectGrp.err);
    form.append(subjectGrp.group);
    fields.subject = { input: subjectI, id: 'cf-subject' };
  }

  // Category field
  if (fieldsToShow.includes('category')) {
    const categories = [['', 'Select a category'], ...categoryOptions];
    const categoryGrp = makeGroup('cf-category', cfg['label-category'] || 'Category');
    const categoryI = makeSelect('cf-category', categories);
    categoryGrp.group.append(categoryI, categoryGrp.err);
    form.append(categoryGrp.group);
    fields.category = { input: categoryI, id: 'cf-category' };
  }

  // Message field
  if (fieldsToShow.includes('message')) {
    const msgGrp = makeGroup('cf-message', cfg['label-message'] || 'Message');
    const msgI = makeTextarea('cf-message', 4, 500);

    const counter = document.createElement('small');
    counter.className = 'cf-counter';
    counter.textContent = '0 / 500';

    msgGrp.group.append(msgI, counter, msgGrp.err);
    form.append(msgGrp.group);
    fields.message = { input: msgI, id: 'cf-message', counter };

    msgI.addEventListener('input', () => {
      const len = msgI.value.length;
      counter.textContent = `${len} / 500`;
      counter.classList.toggle('cf-counter-over', len > 500);
    });
  }

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'button primary';
  submitBtn.textContent = cfg['submit'] || 'Send Message';
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

    // Always collect name and email (either from fields or from logged-in user)
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
      // For logged-in users, auto-include from profile
      payload.name = currentUser?.name || '';
      payload.email = currentUser?.email || '';
    }

    // Collect other visible fields
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
