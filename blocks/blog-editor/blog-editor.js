import { getUser, isLoggedIn } from '../../scripts/auth.js';
import Storage from '../../scripts/storage.js';
import { showToast } from '../../scripts/utils.js';

/**
 * Creates a form group element.
 * @param {string} labelText
 * @param {HTMLElement} input
 * @returns {HTMLElement}
 */
function createFormGroup(labelText, input) {
	const group = document.createElement('div');
	group.className = 'form-group';
	const label = document.createElement('label');
	label.setAttribute('for', input.id);
	label.textContent = labelText;
	group.append(label, input);
	return group;
}

/**
 * Decorates the blog editor block.
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
	if (!isLoggedIn()) {
		window.location.href = '/login';
		return;
	}

	const user = getUser();
	block.textContent = '';
	block.className = 'blog-editor-simple';

	const container = document.createElement('div');
	container.className = 'container';

	const heading = document.createElement('h1');
	heading.className = 'blog-editor-heading';
	heading.textContent = 'Write your blog';

	const form = document.createElement('form');
	form.id = 'blog-editor-form';
	form.className = 'blog-editor-form';
	form.noValidate = true;

	// Heading Field
	const headingInput = document.createElement('input');
	headingInput.id = 'blog-heading';
	headingInput.className = 'form-input';
	headingInput.type = 'text';
	headingInput.placeholder = 'Enter blog heading';
	form.append(createFormGroup('Heading', headingInput));

	// Body Field
	const bodyInput = document.createElement('textarea');
	bodyInput.id = 'blog-body';
	bodyInput.className = 'form-input';
	bodyInput.rows = 10;
	bodyInput.placeholder = 'Start writing here...';
	form.append(createFormGroup('Write your blog', bodyInput));

	// Category Field
	const categorySelect = document.createElement('select');
	categorySelect.id = 'blog-category';
	categorySelect.className = 'form-input';
	const loadingOpt = document.createElement('option');
	loadingOpt.value = '';
	loadingOpt.textContent = 'Loading categories\u2026';
	categorySelect.append(loadingOpt);

	const categoryOther = document.createElement('input');
	categoryOther.id = 'blog-category-other';
	categoryOther.className = 'form-input';
	categoryOther.type = 'text';
	categoryOther.placeholder = 'Enter your category';
	categoryOther.hidden = true;

	const catGroup = createFormGroup('Category', categorySelect);
	catGroup.append(categoryOther);
	form.append(catGroup);

	// Image Field
	const imageInput = document.createElement('input');
	imageInput.id = 'blog-image';
	imageInput.className = 'form-input';
	imageInput.type = 'url';
	imageInput.placeholder = 'https://...';
	form.append(createFormGroup('Image link', imageInput));

	// Submit Button
	const submitBtn = document.createElement('button');
	submitBtn.id = 'blog-submit';
	submitBtn.className = 'btn btn-primary';
	submitBtn.type = 'submit';
	submitBtn.textContent = 'Publish Blog';
	form.append(submitBtn);

	container.append(heading, form);
	block.append(container);

	// Fetch Categories
	try {
		const response = await fetch('/data/blogs.json');
		if (response.ok) {
			const payload = await response.json();
			const blogs = Array.isArray(payload) ? payload : (payload.data || []);
			const categories = [...new Set(blogs.map((b) => b.category).filter(Boolean))].sort();

			categorySelect.textContent = '';
			const defaultOpt = document.createElement('option');
			defaultOpt.value = '';
			defaultOpt.textContent = 'Select a category';
			categorySelect.append(defaultOpt);

			categories.forEach((cat) => {
				const opt = document.createElement('option');
				opt.value = cat;
				opt.textContent = cat;
				categorySelect.append(opt);
			});

			const otherOpt = document.createElement('option');
			otherOpt.value = 'other';
			otherOpt.textContent = 'Other...';
			categorySelect.append(otherOpt);
		}
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Failed to fetch categories:', error);
	}

	// Category Toggle Logic
	categorySelect.addEventListener('change', () => {
		categoryOther.hidden = categorySelect.value !== 'other';
		if (!categoryOther.hidden) categoryOther.focus();
	});

	// Form Submission
	form.addEventListener('submit', async (e) => {
		e.preventDefault();

		const title = headingInput.value.trim();
		const body = bodyInput.value.trim();
		let category = categorySelect.value;
		if (category === 'other') category = categoryOther.value.trim();
		const coverImage = imageInput.value.trim();

		// Validation
		if (!title) {
			showToast('Heading is required', 'error');
			return;
		}
		if (body.length < 50) {
			showToast('Blog body must be at least 50 characters', 'error');
			return;
		}
		if (!category) {
			showToast('Please select or enter a category', 'error');
			return;
		}
		if (coverImage && !coverImage.startsWith('https://')) {
			showToast('Image link must be a valid https:// URL', 'error');
			return;
		}

		const blogObj = {
			id: `blog-${Date.now()}`,
			title,
			body,
			category,
			coverImage,
			publishedDate: new Date().toISOString(),
			author: {
				id: user.id || user.email,
				name: user.name || 'Anonymous',
				avatar: user.avatarSrc || '',
			},
			ownerIdentity: user.email,
			featured: false,
			isUserCreated: true,
		};

		try {
			Storage.saveUserBlog(blogObj);
			showToast('Blog published!', 'success');
			submitBtn.disabled = true;

			setTimeout(() => {
				window.location.href = '/user-profile';
			}, 1200);
		} catch (err) {
			showToast('Failed to save blog. Please try again.', 'error');
		}
	});
}
