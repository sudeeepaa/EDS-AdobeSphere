import { login, signup } from '../../scripts/auth.js';
import { validateEmail } from '../../scripts/utils.js';

/**
 * Helper to create DOM elements with attributes and children.
 * @param {string} tag - The HTML tag name.
 * @param {Object} attrs - Attributes to set on the element.
 * @param {...(Node|string)} children - Children to append.
 * @returns {HTMLElement} The created element.
 */
function el(tag, attrs = {}, ...children) {
	const element = document.createElement(tag);
	Object.entries(attrs).forEach(([key, value]) => {
		if (key === 'className') {
			element.className = value;
		} else if (key === 'dataset') {
			Object.entries(value).forEach(([dataKey, dataValue]) => {
				element.dataset[dataKey] = dataValue;
			});
		} else if (key.startsWith('on') && typeof value === 'function') {
			element.addEventListener(key.substring(2).toLowerCase(), value);
		} else {
			element.setAttribute(key, value);
		}
	});
	children.forEach((child) => {
		if (child instanceof Node) {
			element.appendChild(child);
		} else if (child !== null && child !== undefined) {
			element.appendChild(document.createTextNode(String(child)));
		}
	});
	return element;
}

/**
 * Creates the brand header element.
 * @param {string} title - The title text.
 * @param {string} subtitle - The subtitle text.
 * @param {string} type - 'login' or 'signup'.
 * @returns {HTMLElement} The header element.
 */
function buildBrandHeader(title, subtitle, type) {
	return el(
		'div',
		{ className: `${type}-brand-header` },
		el(
			'div',
			{ className: 'brand-wordmark' },
			el('span', { className: 'brand-adobe' }, 'Adobe'),
			el('span', { className: 'brand-ecosystem' }, 'sphere')
		),
		el('h1', {}, title),
		el('p', {}, subtitle)
	);
}

/**
 * Builds the login form.
 * @returns {HTMLElement} The login form container.
 */
function buildLoginForm() {
	const eyeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	eyeSvg.setAttribute('viewBox', '0 0 24 24');
	eyeSvg.setAttribute('width', '20');
	eyeSvg.setAttribute('height', '20');
	eyeSvg.setAttribute('fill', 'none');
	eyeSvg.setAttribute('stroke', 'currentColor');
	eyeSvg.setAttribute('stroke-width', '2');
	eyeSvg.setAttribute('stroke-linecap', 'round');
	eyeSvg.setAttribute('stroke-linejoin', 'round');
	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path.setAttribute('d', 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z');
	const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
	circle.setAttribute('cx', '12');
	circle.setAttribute('cy', '12');
	circle.setAttribute('r', '3');
	eyeSvg.append(path, circle);

	return el(
		'div',
		{ className: 'login-wrapper' },
		buildBrandHeader('Welcome Back', 'Sign in to your Adobesphere account', 'login'),
		el(
			'form',
			{ id: 'login-form', className: 'login-form', novalidate: 'true' },
			el('div', { id: 'login-error', role: 'alert', 'aria-live': 'polite' }),
			el(
				'div',
				{ className: 'form-group' },
				el('label', { for: 'login-email' }, 'Email Address'),
				el('input', {
					id: 'login-email',
					className: 'form-input',
					type: 'email',
					autocomplete: 'email',
					placeholder: 'name@company.com',
				}),
				el('span', { className: 'form-error', dataset: { errorFor: 'login-email' } })
			),
			el(
				'div',
				{ className: 'form-group password-wrap' },
				el('label', { for: 'login-password' }, 'Password'),
				el(
					'div',
					{ className: 'password-input-wrap' },
					el('input', {
						id: 'login-password',
						className: 'form-input',
						type: 'password',
						autocomplete: 'current-password',
						placeholder: 'Enter your password',
					}),
					el(
						'button',
						{ id: 'toggle-password', type: 'button', 'aria-label': 'Show password' },
						el('span', { className: 'eye-icon' }, eyeSvg)
					)
				),
				el('span', { className: 'form-error', dataset: { errorFor: 'login-password' } })
			),
			el('button', { id: 'login-submit', className: 'btn btn-primary', style: 'width: 100%' }, 'Sign In'),
			el(
				'p',
				{ className: 'login-bottom-link' },
				"Don't have an account? ",
				el('a', { href: '/signup' }, 'Sign Up \u2192')
			)
		)
	);
}

/**
 * Builds the signup form.
 * @returns {HTMLElement} The signup form container.
 */
function buildSignupForm() {
	return el(
		'div',
		{ className: 'signup-wrapper' },
		buildBrandHeader('Create Account', 'Join the Adobesphere ecosystem', 'signup'),
		el(
			'form',
			{ id: 'signup-form', className: 'signup-form', novalidate: 'true' },
			el('div', { id: 'signup-error', role: 'alert', 'aria-live': 'polite' }),
			el(
				'div',
				{ className: 'form-group' },
				el('label', { for: 'signup-name' }, 'Full Name'),
				el('input', {
					id: 'signup-name',
					className: 'form-input',
					type: 'text',
					autocomplete: 'name',
					placeholder: 'John Doe',
				}),
				el('span', { className: 'form-error', dataset: { errorFor: 'signup-name' } })
			),
			el(
				'div',
				{ className: 'form-group' },
				el('label', { for: 'signup-email' }, 'Email Address'),
				el('input', {
					id: 'signup-email',
					className: 'form-input',
					type: 'email',
					autocomplete: 'email',
					placeholder: 'you@adobe.com',
				}),
				el('span', { className: 'form-error', dataset: { errorFor: 'signup-email' } })
			),
			el(
				'div',
				{ className: 'form-group password-wrap' },
				el('label', { for: 'signup-password' }, 'Password'),
				el(
					'div',
					{ className: 'password-input-wrap' },
					el('input', {
						id: 'signup-password',
						className: 'form-input',
						type: 'password',
						autocomplete: 'new-password',
						placeholder: 'Minimum 8 characters',
					}),
					el('button', { className: 'toggle-password', type: 'button', 'aria-label': 'Show password' }, '\ud83d\udc41')
				),
				el(
					'div',
					{ id: 'password-strength', className: 'password-strength' },
					el('div', { id: 'strength-bar' }),
					el('span', { id: 'strength-label' }, 'Strength: Weak')
				),
				el('div', { id: 'password-feedback' }),
				el('span', { className: 'form-error', dataset: { errorFor: 'signup-password' } })
			),
			el(
				'div',
				{ className: 'form-group' },
				el('label', { for: 'signup-confirm-password' }, 'Confirm Password'),
				el('input', {
					id: 'signup-confirm-password',
					className: 'form-input',
					type: 'password',
					autocomplete: 'new-password',
				}),
				el('span', { className: 'form-error', dataset: { errorFor: 'signup-confirm-password' } })
			),
			el(
				'div',
				{ className: 'form-group' },
				el('label', { for: 'signup-designation' }, 'Designation'),
				el('input', {
					id: 'signup-designation',
					className: 'form-input',
					type: 'text',
					placeholder: 'e.g. Senior Software Engineer',
				}),
				el('span', { className: 'form-error', dataset: { errorFor: 'signup-designation' } })
			),
			el(
				'div',
				{ className: 'form-group' },
				el(
					'div',
					{ className: 'label-with-count' },
					el('label', { for: 'signup-bio' }, 'Short Bio'),
					el('span', { id: 'bio-char-count' }, '0/200')
				),
				el('textarea', {
					id: 'signup-bio',
					className: 'form-input',
					rows: '3',
					maxlength: '200',
					placeholder: 'Tell us about yourself...',
				}),
				el('span', { className: 'form-error', dataset: { errorFor: 'signup-bio' } })
			),
			el(
				'div',
				{ className: 'form-group' },
				el('label', { for: 'signup-linkedin' }, 'LinkedIn URL'),
				el('input', {
					id: 'signup-linkedin',
					className: 'form-input',
					type: 'url',
					placeholder: 'https://linkedin.com/in/yourprofile',
				}),
				el('span', { className: 'form-error', dataset: { errorFor: 'signup-linkedin' } })
			),
			el('button', { id: 'signup-submit', className: 'btn btn-primary', style: 'width: 100%' }, 'Create Account'),
			el(
				'p',
				{ className: 'login-bottom-link' },
				'Already have an account? ',
				el('a', { href: '/login' }, 'Sign In \u2192')
			)
		)
	);
}

/**
 * Auth Form Block
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
	block.textContent = '';

	const formContainer = isLoginForm ? buildLoginForm() : buildSignupForm();
	block.append(formContainer);

	const type = isLoginForm ? 'login' : 'signup';
	const form = block.querySelector(`#${type}-form`);
	const submitBtn = block.querySelector(`#${type}-submit`);
	const errorMsg = block.querySelector(`#${type}-error`);

	/**
	 * Clear all error messages
	 */
	function clearErrors() {
		block.querySelectorAll('.form-error').forEach((elError) => {
			elError.textContent = '';
			elError.classList.remove('visible');
		});
		if (errorMsg) {
			errorMsg.textContent = '';
			errorMsg.style.display = 'none';
		}
	}

	/**
	 * Show inline error for a field
	 */
	function showError(input, message) {
		const errorEl = block.querySelector(`[data-error-for="${input.id}"]`);
		if (errorEl) {
			errorEl.textContent = message;
			errorEl.classList.add('visible');
			input.setAttribute('aria-invalid', 'true');
		}
	}

	/**
	 * Validate login form
	 */
	function validateLoginForm() {
		clearErrors();
		let isValid = true;

		const emailInput = block.querySelector('#login-email');
		const passwordInput = block.querySelector('#login-password');

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

		const nameInput = block.querySelector('#signup-name');
		const emailInput = block.querySelector('#signup-email');
		const passwordInput = block.querySelector('#signup-password');
		const confirmInput = block.querySelector('#signup-confirm-password');

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
	 * Handle login submission
	 */
	async function handleLoginSubmit(e) {
		e.preventDefault();

		if (!validateLoginForm()) return;

		const originalText = submitBtn.textContent;
		submitBtn.disabled = true;
		submitBtn.textContent = 'Signing in...';
		clearErrors();

		const email = block.querySelector('#login-email').value.trim();
		const password = block.querySelector('#login-password').value;

		try {
			await login(email, password);
			const params = new URLSearchParams(window.location.search);
			window.location.href = params.get('redirect') || '/';
		} catch (error) {
			submitBtn.disabled = false;
			submitBtn.textContent = originalText;

			let errorMessage = 'An error occurred. Please try again.';
			if (error.message === 'INVALID_CREDENTIALS') {
				errorMessage = 'Invalid email or password. Please try again.';
			}
			if (errorMsg) {
				errorMsg.textContent = errorMessage;
				errorMsg.style.display = 'block';
			}
		}
	}

	/**
	 * Handle signup submission
	 */
	async function handleSignupSubmit(e) {
		e.preventDefault();

		if (!validateSignupForm()) return;

		const originalText = submitBtn.textContent;
		submitBtn.disabled = true;
		submitBtn.textContent = 'Creating account...';
		clearErrors();

		const formData = {
			name: block.querySelector('#signup-name').value.trim(),
			email: block.querySelector('#signup-email').value.trim(),
			password: block.querySelector('#signup-password').value,
			confirmPassword: block.querySelector('#signup-confirm-password').value,
			designation: block.querySelector('#signup-designation').value.trim(),
			bio: block.querySelector('#signup-bio').value.trim(),
			socials: {
				linkedin: block.querySelector('#signup-linkedin').value.trim(),
			},
		};

		try {
			await signup(formData);
			const params = new URLSearchParams(window.location.search);
			window.location.href = params.get('redirect') || '/';
		} catch (error) {
			submitBtn.disabled = false;
			submitBtn.textContent = originalText;

			let errorMessage = 'An error occurred. Please try again.';
			if (error.message === 'EMAIL_EXISTS') {
				errorMessage = 'This email is already registered.';
			} else if (error.message === 'INVALID_EMAIL') {
				errorMessage = 'Please use a valid Adobe email address.';
			}
			if (errorMsg) {
				errorMsg.textContent = errorMessage;
				errorMsg.style.display = 'block';
			}
		}
	}

	// Password Toggle Logic
	block.querySelectorAll('#toggle-password, .toggle-password').forEach((btn) => {
		btn.addEventListener('click', () => {
			const input = btn.closest('.password-input-wrap').querySelector('input');
			const isPassword = input.type === 'password';
			input.type = isPassword ? 'text' : 'password';
			btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
		});
	});

	// Password Strength Logic (Simple Example)
	const signupPassword = block.querySelector('#signup-password');
	if (signupPassword) {
		signupPassword.addEventListener('input', (e) => {
			const val = e.target.value;
			const bar = block.querySelector('#strength-bar');
			const label = block.querySelector('#strength-label');
			let strength = 'Weak';
			let color = '#ff4d4d';
			let width = '33%';

			if (val.length >= 8) {
				if (/[A-Z]/.test(val) && /[0-9]/.test(val) && /[^A-Za-z0-9]/.test(val)) {
					strength = 'Strong';
					color = '#2ecc71';
					width = '100%';
				} else {
					strength = 'Medium';
					color = '#f1c40f';
					width = '66%';
				}
			}

			if (bar) {
				bar.style.width = width;
				bar.style.backgroundColor = color;
			}
			if (label) {
				label.textContent = `Strength: ${strength}`;
			}
		});
	}

	// Bio Char Count Logic
	const bioArea = block.querySelector('#signup-bio');
	if (bioArea) {
		bioArea.addEventListener('input', (e) => {
			const count = e.target.value.length;
			const countEl = block.querySelector('#bio-char-count');
			if (countEl) countEl.textContent = `${count}/200`;
		});
	}

	form.addEventListener('submit', isLoginForm ? handleLoginSubmit : handleSignupSubmit);
}
