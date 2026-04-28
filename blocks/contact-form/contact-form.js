import { validateEmail } from '../../scripts/utils.js';

/**
 * Contact Form Block
 *
 * Expected authored table structure:
 * Row 1 (config): [form-action URL]
 * Example: https://formspree.io/f/xxxxx
 *
 * @param {HTMLElement} block - The block element
 */
export default async function decorate(block) {
  // Extract form-action URL from block config
  const rows = block.querySelectorAll(':scope > div');
  let formAction = '';

  if (rows.length > 0) {
    const firstRow = rows[0];
    const cells = firstRow.querySelectorAll(':scope > div');
    if (cells.length > 0) {
      formAction = cells[0].textContent.trim();
    }
  }

  // Clear the block
  block.innerHTML = '';
  block.classList.add('contact-form');

  // Build the form HTML
  const formHTML = `
    <div class="contact-form__container">
      <div class="contact-form__success" role="status" aria-live="polite" aria-hidden="true">
        <p>Thank you! We've received your message and will get back to you shortly.</p>
      </div>

      <div class="contact-form__error" role="alert" aria-live="assertive" aria-hidden="true">
        <p>There was an error submitting your message. Please try again or contact us directly.</p>
      </div>

      <form class="contact-form__form" novalidate>
        <div class="form-group">
          <label for="contact-name" class="form-label">Full Name <span class="form-required">*</span></label>
          <input
            id="contact-name"
            class="form-input"
            type="text"
            name="name"
            autocomplete="name"
            required
            aria-required="true"
          >
          <span class="form-error" data-error-for="contact-name"></span>
        </div>

        <div class="form-group">
          <label for="contact-email" class="form-label">Email Address <span class="form-required">*</span></label>
          <input
            id="contact-email"
            class="form-input"
            type="email"
            name="email"
            autocomplete="email"
            required
            aria-required="true"
          >
          <span class="form-error" data-error-for="contact-email"></span>
        </div>

        <div class="form-group">
          <label for="contact-subject" class="form-label">Subject <span class="form-required">*</span></label>
          <input
            id="contact-subject"
            class="form-input"
            type="text"
            name="subject"
            required
            aria-required="true"
          >
          <span class="form-error" data-error-for="contact-subject"></span>
        </div>

        <div class="form-group">
          <label for="contact-message" class="form-label">Message <span class="form-required">*</span></label>
          <textarea
            id="contact-message"
            class="form-input form-input--textarea"
            name="message"
            rows="6"
            required
            aria-required="true"
            minlength="20"
          ></textarea>
          <span class="form-hint">Minimum 20 characters</span>
          <span class="form-error" data-error-for="contact-message"></span>
        </div>

        <button type="button" class="contact-form__submit btn btn-primary">Send Message</button>
      </form>
    </div>
  `;

  block.innerHTML = formHTML;

  // Get form elements
  const form = block.querySelector('.contact-form__form');
  const nameInput = block.querySelector('#contact-name');
  const emailInput = block.querySelector('#contact-email');
  const subjectInput = block.querySelector('#contact-subject');
  const messageInput = block.querySelector('#contact-message');
  const submitBtn = block.querySelector('.contact-form__submit');
  const successMsg = block.querySelector('.contact-form__success');
  const errorMsg = block.querySelector('.contact-form__error');

  /**
   * Clear all error messages
   */
  function clearErrors() {
    block.querySelectorAll('.form-error').forEach((el) => {
      el.textContent = '';
      el.setAttribute('aria-hidden', 'true');
    });
  }

  /**
   * Show inline error for a field
   * @param {HTMLElement} input - Input element
   * @param {string} message - Error message
   */
  function showError(input, message) {
    const errorEl = block.querySelector(`[data-error-for="${input.id}"]`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.setAttribute('aria-hidden', 'false');
      input.setAttribute('aria-invalid', 'true');
    }
  }

  /**
   * Validate form fields
   * @returns {boolean} - True if all fields are valid
   */
  function validateForm() {
    clearErrors();
    let isValid = true;

    // Validate Full Name
    const name = nameInput.value.trim();
    if (!name) {
      showError(nameInput, 'Full name is required');
      isValid = false;
    }

    // Validate Email
    const email = emailInput.value.trim();
    if (!email) {
      showError(emailInput, 'Email is required');
      isValid = false;
    } else if (!validateEmail(email)) {
      showError(emailInput, 'Please enter a valid email address');
      isValid = false;
    }

    // Validate Subject
    const subject = subjectInput.value.trim();
    if (!subject) {
      showError(subjectInput, 'Subject is required');
      isValid = false;
    }

    // Validate Message
    const message = messageInput.value.trim();
    if (!message) {
      showError(messageInput, 'Message is required');
      isValid = false;
    } else if (message.length < 20) {
      showError(messageInput, 'Message must be at least 20 characters');
      isValid = false;
    }

    return isValid;
  }

  /**
   * Hide or show messages
   * @param {HTMLElement} el - Element to toggle
   * @param {boolean} visible - True to show, false to hide
   */
  function setMessageVisibility(el, visible) {
    if (visible) {
      el.setAttribute('aria-hidden', 'false');
      el.style.display = 'block';
    } else {
      el.setAttribute('aria-hidden', 'true');
      el.style.display = 'none';
    }
  }

  /**
   * Handle form submission
   */
  async function handleSubmit() {
    // Prevent double submissions
    if (submitBtn.disabled) {
      return;
    }

    clearErrors();
    setMessageVisibility(successMsg, false);
    setMessageVisibility(errorMsg, false);

    // Validate
    if (!validateForm()) {
      return;
    }

    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    const formData = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      subject: subjectInput.value.trim(),
      message: messageInput.value.trim(),
    };

    try {
      // Submit via fetch
      const response = await fetch(formAction, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Success
        setMessageVisibility(successMsg, true);
        form.style.display = 'none';
      } else {
        // HTTP error
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      // Error
      setMessageVisibility(errorMsg, true);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
      console.error('Contact form submission error:', err);
    }
  }

  // Attach event listener to submit button
  submitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    handleSubmit();
  });

  // Optional: Allow Enter key in inputs to submit (but not in textarea)
  form.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target !== messageInput) {
      e.preventDefault();
      handleSubmit();
    }
  });

  // Clear error on input
  [nameInput, emailInput, subjectInput, messageInput].forEach((input) => {
    input.addEventListener('input', () => {
      const errorEl = block.querySelector(`[data-error-for="${input.id}"]`);
      if (errorEl && errorEl.textContent) {
        errorEl.textContent = '';
        errorEl.setAttribute('aria-hidden', 'true');
        input.setAttribute('aria-invalid', 'false');
      }
    });
  });
}
