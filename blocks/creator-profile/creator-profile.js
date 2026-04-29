import { buildBlogCard, buildEventCard, escapeHtml, normalizeAssetSrc } from '../../scripts/utils.js';

function getTargetId() {
	const search = new URLSearchParams(window.location.search);
	const queryId = search.get('id');
	if (queryId) return queryId;
	return window.location.pathname.split('/').filter(Boolean).pop() || '';
}

function slugify(value) {
	return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function loadCreators() {
	const response = await fetch('/data/creators.json');
	const payload = await response.json();
	return Array.isArray(payload) ? payload : (payload.data || []);
}

async function loadCollections() {
	const [blogsRes, eventsRes] = await Promise.all([
		fetch('/data/blogs.json'),
		fetch('/data/events.json'),
	]);
	const blogsPayload = await blogsRes.json();
	const eventsPayload = await eventsRes.json();
	return {
		blogs: Array.isArray(blogsPayload) ? blogsPayload : (blogsPayload.data || []),
		events: Array.isArray(eventsPayload) ? eventsPayload : (eventsPayload.data || []),
	};
}

function createTabButton(label, value, active) {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'creator-profile__tab';
	button.textContent = label;
	button.dataset.tab = value;
	button.setAttribute('aria-selected', active ? 'true' : 'false');
	if (active) button.classList.add('is-active');
	return button;
}

function buildIntroCard(creator) {
	const card = document.createElement('section');
	card.className = 'creator-profile__intro';
	card.innerHTML = `
		<div class="creator-profile__intro-media">
			<img src="${normalizeAssetSrc(creator.avatar, '')}" alt="${escapeHtml(creator.name || 'Creator')}" />
		</div>
		<div class="creator-profile__intro-copy">
			<p class="creator-profile__eyebrow">Creator profile</p>
			<h1>${escapeHtml(creator.name || '')}</h1>
			<p class="creator-profile__designation">${escapeHtml(creator.designation || '')}</p>
			<p class="creator-profile__bio">${escapeHtml(creator.fullBio || creator.bio || '')}</p>
			<blockquote>${escapeHtml(creator.featuredQuote || '')}</blockquote>
		</div>
	`;
	return card;
}

export default async function decorate(block) {
	const targetId = getTargetId();
	const creators = await loadCreators();
	const collections = await loadCollections();
	const creator = creators.find((item) => String(item.id || '') === targetId || slugify(item.id) === slugify(targetId)) ||
		creators.find((item) => slugify(item.name) === slugify(targetId)) || null;

	block.classList.add('creator-profile');
	block.textContent = '';

	if (!creator) {
		const empty = document.createElement('div');
		empty.className = 'empty-state';
		empty.textContent = 'Creator profile not found.';
		block.append(empty);
		return;
	}

	const shell = document.createElement('div');
	shell.className = 'creator-profile__shell';
	shell.append(buildIntroCard(creator));

	const stats = document.createElement('section');
	stats.className = 'creator-profile__stats';
	stats.innerHTML = `
		<div><strong>${creator.stats?.blogsPublished || 0}</strong><span>Blogs</span></div>
		<div><strong>${creator.stats?.eventsHosted || 0}</strong><span>Events</span></div>
		<div><strong>${creator.stats?.testimonialsGiven || 0}</strong><span>Testimonials</span></div>
	`;
	shell.append(stats);

	const tabs = document.createElement('div');
	tabs.className = 'creator-profile__tabs';
	const tabButtons = [
		createTabButton('Blogs', 'blogs', true),
		createTabButton('Events Hosted', 'events', false),
		createTabButton('About', 'about', false),
	];
	tabButtons.forEach((button) => tabs.append(button));
	shell.append(tabs);

	const panels = document.createElement('div');
	panels.className = 'creator-profile__panels';

	const blogPanel = document.createElement('section');
	blogPanel.className = 'creator-profile__panel';
	const blogGrid = document.createElement('div');
	blogGrid.className = 'detail-page__related-grid';
	const blogItems = collections.blogs.filter((blog) =>
		creator.blogIds?.includes(blog.id) || String(blog.author?.id || '') === String(creator.id || '')
	);
	if (!blogItems.length) {
		const empty = document.createElement('div');
		empty.className = 'empty-state';
		empty.textContent = 'No blogs published yet.';
		blogGrid.append(empty);
	} else {
		blogItems.forEach((item) => blogGrid.append(buildBlogCard(item)));
	}
	blogPanel.append(blogGrid);

	const eventPanel = document.createElement('section');
	eventPanel.className = 'creator-profile__panel is-hidden';
	const eventGrid = document.createElement('div');
	eventGrid.className = 'detail-page__related-grid';
	const eventItems = collections.events.filter((event) => creator.eventIds?.includes(event.id));
	if (!eventItems.length) {
		const empty = document.createElement('div');
		empty.className = 'empty-state';
		empty.textContent = 'No hosted events found.';
		eventGrid.append(empty);
	} else {
		eventItems.forEach((item) => eventGrid.append(buildEventCard(item)));
	}
	eventPanel.append(eventGrid);

	const aboutPanel = document.createElement('section');
	aboutPanel.className = 'creator-profile__panel is-hidden';
	aboutPanel.innerHTML = `
		<div class="creator-profile__about">
			<h2>About ${escapeHtml(creator.name || '')}</h2>
			<p>${escapeHtml(creator.fullBio || creator.bio || '')}</p>
			<div class="creator-profile__about-links">
				<a class="btn btn-primary" href="/explore?tab=blogs&category=${encodeURIComponent(creator.designation || '')}">Explore related blogs</a>
				<a class="btn btn-ghost" href="/explore?tab=creators">Back to creators</a>
			</div>
		</div>
	`;

	panels.append(blogPanel, eventPanel, aboutPanel);
	shell.append(panels);
	block.append(shell);

	const tabPanelMap = { blogs: blogPanel, events: eventPanel, about: aboutPanel };
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

	tabButtons.forEach((button) => button.addEventListener('click', () => setActiveTab(button.dataset.tab)));
	setActiveTab('blogs');
}