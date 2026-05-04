import { isLoggedIn, getUser } from '../../scripts/auth.js';
import Storage from '../../scripts/storage.js';
import {
	buildEventCard,
	buildBlogCard,
	showToast,
	fileToBase64,
} from '../../scripts/utils.js';

/**
 * Helper to create elements with attributes and children.
 */
function el(tag, attrs = {}, ...children) {
	const element = document.createElement(tag);
	Object.entries(attrs).forEach(([key, value]) => {
		if (key === 'className') element.className = value;
		else if (key.startsWith('on') && typeof value === 'function') {
			element.addEventListener(key.substring(2).toLowerCase(), value);
		} else element.setAttribute(key, value);
	});
	children.forEach((child) => {
		if (child instanceof Node) element.appendChild(child);
		else if (child !== null && child !== undefined) {
			element.appendChild(document.createTextNode(String(child)));
		}
	});
	return element;
}

/**
 * Decorates the user profile block.
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
	if (!isLoggedIn()) {
		window.location.href = '/login';
		return;
	}

	const user = getUser();
	block.textContent = '';

	// Fetch required data
	const [eventsRes, blogsRes] = await Promise.all([
		fetch('/data/events.json').then((r) => r.json()),
		fetch('/data/blogs.json').then((r) => r.json()),
	]);
	const allEvents = Array.isArray(eventsRes) ? eventsRes : eventsRes.data || [];
	const allBlogs = Array.isArray(blogsRes) ? blogsRes : blogsRes.data || [];
	const userBlogs = Storage.getUserBlogs();

	// 1. Profile Header
	const avatarInput = el('input', { id: 'avatar-input', type: 'file', accept: 'image/*', hidden: 'true' });
	const avatarImg = el('img', { id: 'profile-avatar', src: user.avatarSrc || '/icons/user-avatar.svg', alt: 'Avatar' });

	const header = el(
		'section',
		{ className: 'profile-header container' },
		el(
			'div',
			{ className: 'avatar-upload-wrap' },
			avatarImg,
			el('div', { className: 'avatar-overlay' }, el('span', {}, 'Change Photo')),
			avatarInput
		),
		el(
			'div',
			{ className: 'profile-info-wrap' },
			el(
				'div',
				{ className: 'profile-edit-head' },
				el('h1', { id: 'profile-name-display' }, user.name || 'Anonymous'),
				el('input', { id: 'profile-name-input', className: 'form-input is-hidden', value: user.name || '' }),
				el('button', { id: 'edit-profile-btn', className: 'btn btn-ghost' }, 'Edit Profile'),
				el('button', { id: 'save-profile-btn', className: 'btn btn-primary is-hidden' }, 'Save Changes')
			),
			el('p', { id: 'profile-designation-display', className: 'profile-designation' }, user.designation || 'Creator'),
			el('input', { id: 'profile-designation-input', className: 'form-input is-hidden', value: user.designation || '' }),
			el('p', { id: 'profile-bio-display', className: 'profile-bio' }, user.bio || 'Tell us about yourself...'),
			el('textarea', { id: 'profile-bio-input', className: 'form-input is-hidden', rows: '3' }, user.bio || ''),
			el(
				'div',
				{ className: 'profile-social' },
				el('span', {}, 'LinkedIn: '),
				el('a', { id: 'social-linkedin', href: user.socials?.linkedin || '#', target: '_blank' }, user.socials?.linkedin || 'Not linked'),
				el('input', { id: 'social-linkedin-input', className: 'form-input is-hidden', value: user.socials?.linkedin || '' })
			)
		)
	);

	// 2. Saved Content
	const savedEventsGrid = el('div', { id: 'saved-events-grid', className: 'grid-3' });
	const savedBlogsGrid = el('div', { id: 'saved-blogs-grid', className: 'grid-3 is-hidden' });

	const savedContent = el(
		'section',
		{ className: 'saved-content container' },
		el('h2', {}, 'Saved Content'),
		el(
			'div',
			{ className: 'tabs-nav', id: 'saved-tabs' },
			el('button', { className: 'tab-btn active', 'data-saved-tab': 'events' }, 'Saved Events'),
			el('button', { className: 'tab-btn', 'data-saved-tab': 'blogs' }, 'Saved Blogs')
		),
		savedEventsGrid,
		savedBlogsGrid
	);

	// 3. My Registrations
	const registeredGrid = el('div', { id: 'registered-events-grid', className: 'grid-3' });
	const registrations = el('section', { className: 'my-registrations container' }, el('h2', {}, 'My Registrations'), registeredGrid);

	// 4. My Blogs
	const myBlogsGrid = el('div', { id: 'my-blogs-grid', className: 'grid-3' });
	const myBlogs = el(
		'section',
		{ className: 'my-blogs container' },
		el(
			'div',
			{ className: 'my-blogs-head' },
			el('h2', {}, 'My Blogs'),
			el('a', { href: '/blog-editor', className: 'btn btn-primary my-blogs-cta' }, 'Write a New Blog')
		),
		myBlogsGrid
	);

	// 5. Modals
	const deleteBlogModal = el(
		'div',
		{ id: 'delete-blog-modal', className: 'modal-overlay is-hidden' },
		el(
			'div',
			{ className: 'modal-box' },
			el('h3', {}, 'Delete Blog?'),
			el('p', {}, 'This action cannot be undone.'),
			el('div', { className: 'modal-actions' }, el('button', { className: 'btn btn-ghost cancel' }, 'Cancel'), el('button', { className: 'btn btn-danger confirm' }, 'Delete'))
		)
	);

	const cancelRegModal = el(
		'div',
		{ id: 'cancel-reg-profile-modal', className: 'modal-overlay is-hidden' },
		el(
			'div',
			{ className: 'modal-box' },
			el('h3', {}, 'Cancel Registration?'),
			el('p', {}, 'Are you sure you want to cancel your registration for this event?'),
			el('div', { className: 'modal-actions' }, el('button', { className: 'btn btn-ghost cancel' }, 'No, Keep it'), el('button', { className: 'btn btn-danger confirm' }, 'Yes, Cancel'))
		)
	);

	block.append(header, savedContent, registrations, myBlogs, deleteBlogModal, cancelRegModal);

	// --- Handlers & Logic ---

	// Profile Edit Toggle
	const editBtn = block.querySelector('#edit-profile-btn');
	const saveBtn = block.querySelector('#save-profile-btn');
	const editFields = [
		'#profile-name',
		'#profile-designation',
		'#profile-bio',
		'#social-linkedin',
	];

	editBtn.addEventListener('click', () => {
		editBtn.classList.add('is-hidden');
		saveBtn.classList.remove('is-hidden');
		editFields.forEach((id) => {
			block.querySelector(`${id}-display`).classList.add('is-hidden');
			block.querySelector(`${id}-input`).classList.remove('is-hidden');
		});
	});

	saveBtn.addEventListener('click', () => {
		const patch = {
			name: block.querySelector('#profile-name-input').value,
			designation: block.querySelector('#profile-designation-input').value,
			bio: block.querySelector('#profile-bio-input').value,
			socials: { ...user.socials, linkedin: block.querySelector('#social-linkedin-input').value },
		};
		Storage.updateProfile(patch);
		window.location.reload();
	});

	// Avatar Upload
	block.querySelector('.avatar-upload-wrap').addEventListener('click', () => avatarInput.click());
	avatarInput.addEventListener('change', async () => {
		const file = avatarInput.files[0];
		if (file) {
			const base64 = await fileToBase64(file);
			Storage.updateProfile({ avatarSrc: base64 });
			avatarImg.src = base64;
			showToast('Avatar updated!', 'success');
		}
	});

	// Tab Switching
	block.querySelector('#saved-tabs').addEventListener('click', (e) => {
		const btn = e.target.closest('.tab-btn');
		if (btn) {
			const tab = btn.dataset.savedTab;
			block.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
			savedEventsGrid.classList.toggle('is-hidden', tab !== 'events');
			savedBlogsGrid.classList.toggle('is-hidden', tab !== 'blogs');
		}
	});

	// --- Renders ---

	const renderSavedEvents = () => {
		savedEventsGrid.textContent = '';
		const savedIds = user.savedEvents || [];
		const savedData = allEvents.filter((e) => savedIds.includes(String(e.id)));
		if (!savedData.length) savedEventsGrid.textContent = 'No saved events.';
		savedData.forEach((item) => {
			const card = buildEventCard(item);
			const unsave = el('button', { className: 'btn btn-ghost unsave-btn', onclick: () => {
				Storage.unsaveEvent(String(item.id));
				window.location.reload();
			} }, 'Unsave');
			card.querySelector('.card__body').append(unsave);
			savedEventsGrid.append(card);
		});
	};

	const renderSavedBlogs = () => {
		savedBlogsGrid.textContent = '';
		const savedIds = user.savedBlogs || [];
		const savedData = [...allBlogs, ...userBlogs].filter((b) => savedIds.includes(String(b.id)));
		if (!savedData.length) savedBlogsGrid.textContent = 'No saved blogs.';
		savedData.forEach((item) => {
			const card = buildBlogCard(item);
			const unsave = el('button', { className: 'btn btn-ghost unsave-btn', onclick: () => {
				Storage.unsaveBlog(String(item.id));
				window.location.reload();
			} }, 'Unsave');
			card.querySelector('.card__body').append(unsave);
			savedBlogsGrid.append(card);
		});
	};

	const renderRegistrations = () => {
		registeredGrid.textContent = '';
		const regIds = user.registeredEvents || [];
		const regData = allEvents.filter((e) => regIds.includes(String(e.id)));
		if (!regData.length) registeredGrid.textContent = 'No active registrations.';
		regData.forEach((item) => {
			const card = buildEventCard(item);
			const cancel = el('button', { className: 'btn btn-ghost cancel-btn' }, 'Cancel Registration');
			cancel.addEventListener('click', () => {
				cancelRegModal.classList.remove('is-hidden');
				cancelRegModal.querySelector('.confirm').onclick = () => {
					Storage.cancelRegistration(String(item.id));
					window.location.reload();
				};
			});
			card.querySelector('.card__body').append(cancel);
			registeredGrid.append(card);
		});
	};

	const renderMyBlogs = () => {
		myBlogsGrid.textContent = '';
		if (!userBlogs.length) myBlogsGrid.textContent = 'You haven\'t written any blogs yet.';
		userBlogs.forEach((item) => {
			const card = buildBlogCard(item);
			const delBtn = el('button', { className: 'btn btn-ghost delete-btn' }, 'Delete');
			delBtn.addEventListener('click', () => {
				deleteBlogModal.classList.remove('is-hidden');
				deleteBlogModal.querySelector('.confirm').onclick = () => {
					Storage.deleteUserBlog(item.id);
					window.location.reload();
				};
			});
			card.querySelector('.card__body').append(delBtn);
			myBlogsGrid.append(card);
		});
	};

	// Close modals
	block.querySelectorAll('.modal-overlay').forEach((modal) => {
		modal.querySelector('.cancel').addEventListener('click', () => modal.classList.add('is-hidden'));
	});

	renderSavedEvents();
	renderSavedBlogs();
	renderRegistrations();
	renderMyBlogs();
}