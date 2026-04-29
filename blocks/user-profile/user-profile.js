import authInit, { getUser, isLoggedIn } from '../../scripts/auth.js';
import { appPath, buildBlogCard, buildEventCard, escapeHtml, fileToBase64, normalizeAssetSrc, showToast } from '../../scripts/utils.js';

const USERS_KEY = 'ae_users';
const USER_KEY = 'ae_user';
const SESSION_KEY = 'ae_session';

function readJson(key, fallback) {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : fallback;
	} catch (error) {
		return fallback;
	}
}

function writeJson(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
		return true;
	} catch (error) {
		return false;
	}
}

function ensureArray(value) {
	return Array.isArray(value) ? value : [];
}

function ensureUser(user) {
	if (!user || typeof user !== 'object') return null;
	return {
		...user,
		savedBlogs: ensureArray(user.savedBlogs),
		savedEvents: ensureArray(user.savedEvents),
		registeredEvents: ensureArray(user.registeredEvents),
		myBlogs: ensureArray(user.myBlogs),
		socials: user.socials && typeof user.socials === 'object' ? user.socials : {},
		avatarSrc: user.avatarSrc || '',
	};
}

function persistUser(user) {
	const normalized = ensureUser(user);
	if (!normalized || !normalized.email) return normalized;

	const users = ensureArray(readJson(USERS_KEY, []));
	const nextUsers = users
		.filter((entry) => entry && typeof entry === 'object')
		.map((entry) => ensureUser(entry) || entry);
	const index = nextUsers.findIndex((entry) => String(entry.email || '').toLowerCase() === String(normalized.email).toLowerCase());
	if (index >= 0) {
		nextUsers[index] = normalized;
	} else {
		nextUsers.unshift(normalized);
	}

	writeJson(USERS_KEY, nextUsers);
	writeJson(USER_KEY, normalized);
	localStorage.setItem(SESSION_KEY, normalized.email);
	document.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: true, user: normalized } }));
	return normalized;
}

function getUserById(id) {
	const user = ensureUser(getUser());
	if (user && String(user.email || '').toLowerCase() === String(id || '').toLowerCase()) return user;
	const users = ensureArray(readJson(USERS_KEY, [])).map((entry) => ensureUser(entry) || entry);
	return users.find((entry) => String(entry.email || '').toLowerCase() === String(id || '').toLowerCase()) || null;
}

function getResolvedItem(items, ref) {
	const list = ensureArray(items);
	const target = String(ref || '').trim().toLowerCase();
	if (!target) return null;
	return list.find((item) => {
		if (!item) return false;
		if (String(item.id || '').toLowerCase() === target) return true;
		const titleSlug = String(item.title || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
		if (titleSlug === target) return true;
		return false;
	}) || null;
}

async function loadCollections() {
	const [eventsRes, blogsRes, creatorsRes] = await Promise.all([
		fetch(appPath('/data/events.json')),
		fetch(appPath('/data/blogs.json')),
		fetch(appPath('/data/creators.json')),
	]);

	const eventsData = await eventsRes.json();
	const blogsData = await blogsRes.json();
	const creatorsData = await creatorsRes.json();

	return {
		events: Array.isArray(eventsData) ? eventsData : (eventsData.data || []),
		blogs: Array.isArray(blogsData) ? blogsData : (blogsData.data || []),
		creators: Array.isArray(creatorsData) ? creatorsData : (creatorsData.data || []),
	};
}

function createSectionHeading(title, description) {
	const header = document.createElement('div');
	header.className = 'user-profile__section-heading';
	const h2 = document.createElement('h2');
	h2.textContent = title;
	header.append(h2);
	if (description) {
		const p = document.createElement('p');
		p.textContent = description;
		header.append(p);
	}
	return header;
}

function createTabButton(label, value, active) {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'user-profile__tab';
	button.textContent = label;
	button.dataset.tab = value;
	button.setAttribute('aria-selected', active ? 'true' : 'false');
	if (active) button.classList.add('is-active');
	return button;
}

function resolveItemArray(items, collections) {
	return ensureArray(items)
		.map((entry) => {
			if (entry && typeof entry === 'object') return entry;
			const ref = String(entry || '').trim();
			const fromEvents = getResolvedItem(collections.events, ref);
			if (fromEvents) return { ...fromEvents, _source: 'event' };
			const fromBlogs = getResolvedItem(collections.blogs, ref);
			if (fromBlogs) return { ...fromBlogs, _source: 'blog' };
			return null;
		})
		.filter(Boolean);
}

function buildProfileHeader(user) {
	const card = document.createElement('section');
	card.className = 'user-profile__card user-profile__card--hero';

	const avatarWrap = document.createElement('div');
	avatarWrap.className = 'user-profile__avatar-wrap';
	const avatar = document.createElement('img');
	avatar.className = 'user-profile__avatar';
	avatar.src = normalizeAssetSrc(user.avatarSrc || user.avatar || '/media/profiles/project-owner-made-by.jpg.jpg', '');
	avatar.alt = user.name || 'User avatar';
	avatarWrap.append(avatar);

	const body = document.createElement('div');
	body.className = 'user-profile__hero-copy';

	const eyebrow = document.createElement('p');
	eyebrow.className = 'user-profile__eyebrow';
	eyebrow.textContent = 'My Profile';

	const name = document.createElement('h1');
	name.className = 'user-profile__name';
	name.textContent = user.name || 'Your profile';

	const role = document.createElement('p');
	role.className = 'user-profile__role';
	role.textContent = user.designation || user.email || '';

	const bio = document.createElement('p');
	bio.className = 'user-profile__bio';
	bio.textContent = user.bio || 'Add a short bio so your profile reflects your work and interests.';

	const actions = document.createElement('div');
	actions.className = 'user-profile__hero-actions';

	const editButton = document.createElement('button');
	editButton.type = 'button';
	editButton.className = 'btn btn-primary';
	editButton.textContent = 'Edit profile';
	editButton.dataset.action = 'edit-profile';

	const signOutButton = document.createElement('a');
	signOutButton.className = 'btn btn-ghost';
	signOutButton.href = appPath('/login');
	signOutButton.textContent = 'Switch account';

	actions.append(editButton, signOutButton);
	body.append(eyebrow, name, role, bio, actions);
	card.append(avatarWrap, body);
	return card;
}

function buildFormField(label, input) {
	const field = document.createElement('label');
	field.className = 'user-profile__field';
	const span = document.createElement('span');
	span.textContent = label;
	field.append(span, input);
	return field;
}

function buildEditForm(user) {
	const form = document.createElement('form');
	form.className = 'user-profile__form';

	const avatarInput = document.createElement('input');
	avatarInput.type = 'text';
	avatarInput.className = 'user-profile__input';
	avatarInput.placeholder = 'Avatar URL or /media path';
	avatarInput.value = user.avatarSrc || '';

	const avatarUpload = document.createElement('input');
	avatarUpload.type = 'file';
	avatarUpload.accept = 'image/*';
	avatarUpload.hidden = true;

	const avatarButton = document.createElement('button');
	avatarButton.type = 'button';
	avatarButton.className = 'btn btn-secondary';
	avatarButton.textContent = 'Upload avatar';

	const avatarRow = document.createElement('div');
	avatarRow.className = 'user-profile__upload-row';
	avatarRow.append(avatarButton, avatarUpload);

	const nameInput = document.createElement('input');
	nameInput.type = 'text';
	nameInput.className = 'user-profile__input';
	nameInput.value = user.name || '';

	const designationInput = document.createElement('input');
	designationInput.type = 'text';
	designationInput.className = 'user-profile__input';
	designationInput.value = user.designation || '';

	const bioInput = document.createElement('textarea');
	bioInput.className = 'user-profile__textarea';
	bioInput.rows = 5;
	bioInput.value = user.bio || '';

	const linkedinInput = document.createElement('input');
	linkedinInput.type = 'url';
	linkedinInput.className = 'user-profile__input';
	linkedinInput.placeholder = 'https://www.linkedin.com/in/...';
	linkedinInput.value = user.socials?.linkedin || '';

	const websiteInput = document.createElement('input');
	websiteInput.type = 'url';
	websiteInput.className = 'user-profile__input';
	websiteInput.placeholder = 'https://yourportfolio.com';
	websiteInput.value = user.socials?.website || '';

	const saveButton = document.createElement('button');
	saveButton.type = 'submit';
	saveButton.className = 'btn btn-primary';
	saveButton.textContent = 'Save changes';

	const cancelButton = document.createElement('button');
	cancelButton.type = 'button';
	cancelButton.className = 'btn btn-ghost';
	cancelButton.textContent = 'Cancel';
	cancelButton.dataset.action = 'cancel-edit';

	const actions = document.createElement('div');
	actions.className = 'user-profile__form-actions';
	actions.append(saveButton, cancelButton);

	form.append(
		buildFormField('Avatar', avatarInput),
		avatarRow,
		buildFormField('Name', nameInput),
		buildFormField('Designation', designationInput),
		buildFormField('Bio', bioInput),
		buildFormField('LinkedIn', linkedinInput),
		buildFormField('Website', websiteInput),
		actions,
	);

	avatarButton.addEventListener('click', () => avatarUpload.click());
	avatarUpload.addEventListener('change', async () => {
		const file = avatarUpload.files && avatarUpload.files[0];
		if (!file) return;
		try {
			avatarInput.value = await fileToBase64(file);
			showToast('Avatar added to the draft.', 'success');
		} catch (error) {
			showToast('Could not read the selected file.', 'error');
		}
	});

	return {
		form,
		fields: {
			avatarInput,
			nameInput,
			designationInput,
			bioInput,
			linkedinInput,
			websiteInput,
		},
	};
}

function createItemGrid(title, description, items, builder, emptyMessage) {
	const section = document.createElement('section');
	section.className = 'user-profile__card';
	section.append(createSectionHeading(title, description));

	const grid = document.createElement('div');
	grid.className = 'user-profile__grid';

	if (!items.length) {
		const empty = document.createElement('div');
		empty.className = 'empty-state';
		empty.textContent = emptyMessage;
		grid.append(empty);
	} else {
		items.forEach((item) => grid.append(builder(item)));
	}

	section.append(grid);
	return section;
}

export default async function decorate(block) {
	authInit();
	if (!isLoggedIn()) {
		window.location.href = appPath('/login?redirect=/user-profile');
		return;
	}

	const currentUser = ensureUser(getUser());
	if (!currentUser) {
		window.location.href = appPath('/login?redirect=/user-profile');
		return;
	}

	const collections = await loadCollections();
	const savedBlogs = resolveItemArray(currentUser.savedBlogs, collections).map((item) => ({ ...item, _source: 'blog' }));
	const savedEvents = resolveItemArray(currentUser.savedEvents, collections).map((item) => ({ ...item, _source: 'event' }));
	const publishedBlogs = ensureArray(currentUser.myBlogs).map((item) => {
		if (item && typeof item === 'object') return item;
		return collections.blogs.find((blog) => String(blog.id || '') === String(item || '')) || null;
	}).filter(Boolean);

	block.classList.add('user-profile');
	block.textContent = '';

	const shell = document.createElement('div');
	shell.className = 'user-profile__shell';

	const header = buildProfileHeader(currentUser);
	const editPanel = document.createElement('section');
	editPanel.className = 'user-profile__card user-profile__card--edit is-hidden';
	editPanel.append(createSectionHeading('Edit profile', 'Update your public identity and links.'));

	const { form, fields } = buildEditForm(currentUser);
	editPanel.append(form);

	const tabs = document.createElement('div');
	tabs.className = 'user-profile__tabs';
	const tabButtons = [
		createTabButton('Overview', 'overview', true),
		createTabButton(`Saved Items (${savedBlogs.length + savedEvents.length})`, 'saved', false),
		createTabButton(`Published Blogs (${publishedBlogs.length})`, 'blogs', false),
	];
	tabButtons.forEach((button) => tabs.append(button));

	const panels = document.createElement('div');
	panels.className = 'user-profile__panels';

	const overviewPanel = document.createElement('div');
	overviewPanel.className = 'user-profile__panel';
	overviewPanel.append(createItemGrid('Profile snapshot', 'A quick view of your public info.', [currentUser].map((user) => {
		const item = document.createElement('div');
		item.className = 'user-profile__snapshot';
		item.innerHTML = `
			<p><strong>Email</strong><span>${escapeHtml(user.email || '')}</span></p>
			<p><strong>Designation</strong><span>${escapeHtml(user.designation || '')}</span></p>
			<p><strong>Bio</strong><span>${escapeHtml(user.bio || 'Not set yet')}</span></p>
		`;
		return item;
	}), 'No profile data available.'));

	const savedPanel = document.createElement('div');
	savedPanel.className = 'user-profile__panel is-hidden';
	const savedSection = document.createElement('section');
	savedSection.className = 'user-profile__saved-group';
	savedSection.append(createItemGrid('Saved blogs', 'Articles you bookmarked for later.', savedBlogs, (blog) => buildBlogCard(blog), 'No saved blogs yet.'));
	savedSection.append(createItemGrid('Saved events', 'Events you want to revisit.', savedEvents, (event) => buildEventCard(event), 'No saved events yet.'));
	savedPanel.append(savedSection);

	const blogsPanel = document.createElement('div');
	blogsPanel.className = 'user-profile__panel is-hidden';
	const blogGrid = document.createElement('div');
	blogGrid.className = 'user-profile__grid';

	if (!publishedBlogs.length) {
		const empty = document.createElement('div');
		empty.className = 'empty-state';
		empty.textContent = 'You have not published any blogs yet.';
		blogGrid.append(empty);
	} else {
		publishedBlogs.forEach((blog) => {
			const wrapper = document.createElement('div');
			wrapper.className = 'user-profile__published-item';
			const card = buildBlogCard(blog);
			const remove = document.createElement('button');
			remove.type = 'button';
			remove.className = 'user-profile__remove-button';
			remove.textContent = 'Delete';
			remove.addEventListener('click', () => {
				const nextUser = ensureUser({
					...currentUser,
					myBlogs: ensureArray(currentUser.myBlogs).filter((entry) => {
						if (entry && typeof entry === 'object') return entry.id !== blog.id;
						return String(entry || '') !== String(blog.id || '');
					}),
				});
				persistUser(nextUser);
				showToast('Blog removed from your profile.', 'info');
				window.location.reload();
			});
			wrapper.append(card, remove);
			blogGrid.append(wrapper);
		});
	}
	blogsPanel.append(createSectionHeading('Published blogs', 'Posts you have published from the editor.'), blogGrid);

	panels.append(overviewPanel, savedPanel, blogsPanel);
	shell.append(header, editPanel, tabs, panels);
	block.append(shell);

	const editButton = shell.querySelector('[data-action="edit-profile"]');
	const cancelButton = shell.querySelector('[data-action="cancel-edit"]');
	const tabPanelMap = {
		overview: overviewPanel,
		saved: savedPanel,
		blogs: blogsPanel,
	};

	function setActiveTab(tab) {
		Object.entries(tabPanelMap).forEach(([key, panel]) => {
			panel.classList.toggle('is-hidden', key !== tab);
		});
		tabButtons.forEach((button) => {
			const active = button.dataset.tab === tab;
			button.classList.toggle('is-active', active);
			button.setAttribute('aria-selected', active ? 'true' : 'false');
		});
	}

	editButton.addEventListener('click', () => {
		editPanel.classList.toggle('is-hidden');
	});

	cancelButton.addEventListener('click', () => {
		editPanel.classList.add('is-hidden');
	});

	tabButtons.forEach((button) => {
		button.addEventListener('click', () => setActiveTab(button.dataset.tab));
	});

	form.addEventListener('submit', (event) => {
		event.preventDefault();
		const nextUser = ensureUser({
			...currentUser,
			avatarSrc: fields.avatarInput.value.trim(),
			name: fields.nameInput.value.trim(),
			designation: fields.designationInput.value.trim(),
			bio: fields.bioInput.value.trim(),
			socials: {
				...(currentUser.socials || {}),
				linkedin: fields.linkedinInput.value.trim(),
				website: fields.websiteInput.value.trim(),
			},
		});
		persistUser(nextUser);
		showToast('Profile updated.', 'success');
		window.location.reload();
	});

	const hash = String(window.location.hash || '').replace('#', '').trim();
	if (hash === 'saved') setActiveTab('saved');
	else if (hash === 'blogs') setActiveTab('blogs');
	else setActiveTab('overview');
}