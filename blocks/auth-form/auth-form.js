import { login, signup } from '../../scripts/auth.js';
import { validateEmail } from '../../scripts/utils.js';

/**
 * Auth Form Block
 *
 * Handles both login and signup variants based on modifier class:
 * - .auth-form.login → Login form
 * - .auth-form.signup → Signup form
 *
 * @param {HTMLElement} block - The block element
 */
export default async function decorate(block) {
  const isLoginForm = block.classList.contains('login');
  const isSignupForm = block.classList.contains('signup');

  if (!isLoginForm && !isSignupForm) {
    console.warn('Auth form block must have either .login or .signup modifier class');
    return;
  }

  block.classList.add('auth-form');
  block.innerHTML = '';

  const formType = isLoginForm ? 'login' : 'signup';
  const formHTML = isLoginForm ? buildLoginForm() : buildSignupForm();

  block.innerHTML = formHTML;

  const form = block.querySelector('.auth-form__form');
  const submitBtn = block.querySelector('.auth-form__submit');
  const errorMsg = block.querySelector('.auth-form__error');
  const successMsg = block.querySelector('.auth-form__success');

  /**
   * Clear all error messages
   */
  function clearErrors() {
    block.querySelectorAll('.form-error').forEach((el) => {
      el.textContent = '';
      el.setAttribute('aria-hidden', 'true');
    });
    if (errorMsg) {
      errorMsg.style.display = 'none';
      errorMsg.setAttribute('aria-hidden', 'true');
    }
  }

  /**
   * Show inline error for a field
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
   * Validate login form
   */
  function validateLoginForm() {
    clearErrors();
    let isValid = true;

    const emailInput = block.querySelector('#auth-email');
    const passwordInput = block.querySelector('#auth-password');

    const email = emailInput.value.trim();
    if (!email) {
      showError(emailInput, 'Email is required');
      isValid = false;
    } else if (!validateEmail(email)) {
      showError(emailInput, 'Please enter a valid email address');
      isValid = false;
    }

    const password = passwordInput.value;
    if (!password) {
      showError(passwordInput, 'Password is required');
      isValid = false;
    }

    return isValid;
  }

  /**
   * Validate signup form
   */
  function validateSignupForm() {
    clearErrors();
    let isValid = true;

    const nameInput = block.querySelector('#auth-name');
    const emailInput = block.querySelector('#auth-email');
    const passwordInput = block.querySelector('#auth-password');
    const confirmInput = block.querySelector('#auth-confirm-password');

    const name = nameInput.value.trim();
    if (!name) {
      showError(nameInput, 'Name is required');
      isValid = false;
    }

    const email = emailInput.value.trim();
    if (!email) {
      showError(emailInput, 'Email is required');
      isValid = false;
    } else if (!validateEmail(email)) {
      showError(emailInput, 'Please enter a valid email address');
      isValid = false;
    }

    const password = passwordInput.value;
    if (!password) {
      showError(passwordInput, 'Password is required');
      isValid = false;
    } else if (password.length < 8) {
      showError(passwordInput, 'Password must be at least 8 characters');
      isValid = false;
    }

    const confirmPassword = confirmInput.value;
    if (!confirmPassword) {
      showError(confirmInput, 'Please confirm your password');
      isValid = false;
    } else if (password !== confirmPassword) {
      showError(confirmInput, 'Passwords do not match');
      isValid = false;
    }

    return isValid;
  }

  /**
   * Get redirect URL from URL params or default to /
   */
  function getRedirectUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('redirect') || '/';
  }

  /**
   * Show error message
   */
  function displayError(message) {
    if (errorMsg) {
      errorMsg.textContent = message;
      errorMsg.style.display = 'block';
      errorMsg.setAttribute('aria-hidden', 'false');
    }
  }

  /**
   * Handle login submission
   */
  async function handleLoginSubmit(e) {
    e.preventDefault();

    if (!validateLoginForm()) {
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';
    clearErrors();

    const email = block.querySelector('#auth-email').value.trim();
    const password = block.querySelector('#auth-password').value;

    try {
      await login(email, password);
      window.location.href = getRedirectUrl();
    } catch (error) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';

      let errorMessage = 'An error occurred. Please try again.';
      if (error.message === 'INVALID_CREDENTIALS') {
        errorMessage = 'Invalid email or password. Please try again.';
      }
      displayError(errorMessage);
    }
  }

  /**
   * Handle signup submission
   */
  async function handleSignupSubmit(e) {
    e.preventDefault();

    if (!validateSignupForm()) {
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';
    clearErrors();

    const formData = {
      name: block.querySelector('#auth-name').value.trim(),
      email: block.querySelector('#auth-email').value.trim(),
      password: block.querySelector('#auth-password').value,
      confirmPassword: block.querySelector('#auth-confirm-password').value,
    };

    try {
      await signup(formData);
      window.location.href = getRedirectUrl();
    } catch (error) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';

      let errorMessage = 'An error occurred. Please try again.';
      if (error.message === 'EMAIL_EXISTS') {
        errorMessage = 'This email is already registered. Please log in.';
      } else if (error.message === 'INVALID_EMAIL') {
        errorMessage = 'Please use a valid Adobe email address.';
      } else if (error.message === 'WEAK_PASSWORD') {
        errorMessage = 'Password must be at least 8 characters.';
      } else if (error.message === 'PASSWORD_MISMATCH') {
        errorMessage = 'Passwords do not match.';
      }
      displayError(errorMessage);
    }
  }

  // Attach event listeners
  form.addEventListener('submit', isLoginForm ? handleLoginSubmit : handleSignupSubmit);
}

/**
 * Build login form HTML
 */
function buildLoginForm() {
  return `
    <div class="auth-form__container">
      <h1 class="auth-form__title">Sign In</h1>
      
      <div class="auth-form__error" role="alert" aria-live="assertive" aria-hidden="true"></div>

      <form class="auth-form__form" novalidate>
        <div class="form-group">
          <label for="auth-email" class="form-label">Email <span class="form-required">*</span></label>
          <input
            id="auth-email"
            class="form-input"
            type="email"
            name="email"
            autocomplete="email"
            required
            aria-required="true"
            placeholder="you@adobe.com"
          >
          <span class="form-error" data-error-for="auth-email"></span>
        </div>

        <div class="form-group">
          <label for="auth-password" class="form-label">Password <span class="form-required">*</span></label>
          <input
            id="auth-password"
            class="form-input"
            type="password"
            name="password"
            autocomplete="current-password"
            required
            aria-required="true"
            placeholder="••••••••"
          >
          <span class="form-error" data-error-for="auth-password"></span>
        </div>

        <button type="submit" class="auth-form__submit btn btn-primary">Sign In</button>
      </form>

      <div class="auth-form__footer">
        <p>Don't have an account? <a href="/signup" class="auth-form__link">Create one</a></p>
      </div>
    </div>
  `;
}

/**
 * Build signup form HTML
 */
function buildSignupForm() {
  return `
    <div class="auth-form__container">
      <h1 class="auth-form__title">Create Account</h1>
      
      <div class="auth-form__error" role="alert" aria-live="assertive" aria-hidden="true"></div>

      <form class="auth-form__form" novalidate>
        <div class="form-group">
          <label for="auth-name" class="form-label">Full Name <span class="form-required">*</span></label>
          <input
            id="auth-name"
            class="form-input"
            type="text"
            name="name"
            autocomplete="name"
            required
            aria-required="true"
            placeholder="John Doe"
          >
          <span class="form-error" data-error-for="auth-name"></span>
        </div>

        <div class="form-group">
          <label for="auth-email" class="form-label">Email <span class="form-required">*</span></label>
          <input
            id="auth-email"
            class="form-input"
            type="email"
            name="email"
            autocomplete="email"
            required
            aria-required="true"
            placeholder="you@adobe.com"
          >
          <span class="form-error" data-error-for="auth-email"></span>
        </div>

        <div class="form-group">
          <label for="auth-password" class="form-label">Password <span class="form-required">*</span></label>
          <input
            id="auth-password"
            class="form-input"
            type="password"
            name="password"
            autocomplete="new-password"
            required
            aria-required="true"
            placeholder="••••••••"
          >
          <span class="form-error" data-error-for="auth-password"></span>
          <span class="form-hint">Minimum 8 characters</span>
        </div>

        <div class="form-group">
          <label for="auth-confirm-password" class="form-label">Confirm Password <span class="form-required">*</span></label>
          <input
            id="auth-confirm-password"
            class="form-input"
            type="password"
            name="confirmPassword"
            autocomplete="new-password"
            required
            aria-required="true"
            placeholder="••••••••"
          >
          <span class="form-error" data-error-for="auth-confirm-password"></span>
        </div>

        <button type="submit" class="auth-form__submit btn btn-primary">Create Account</button>
      </form>

      <div class="auth-form__footer">
        <p>Already have an account? <a href="/login" class="auth-form__link">Sign in</a></p>
      </div>
    </div>
  `;
}
