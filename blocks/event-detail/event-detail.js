import { buildEventCard, formatShortDate, normalizeAssetSrc } from '../../scripts/utils.js';

function getTargetId() {
	const search = new URLSearchParams(window.location.search);
	const queryId = search.get('id');
	if (queryId) return queryId;

	const segments = window.location.pathname.split('/').filter(Boolean);
	return segments[segments.length - 1] || '';
}

function slugify(value) {
	return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function createMetaItem(label, value) {
	const item = document.createElement('div');
	item.className = 'detail-page__meta-item';
	const name = document.createElement('span');
	name.textContent = label;
	const content = document.createElement('strong');
	content.textContent = value || '—';
	item.append(name, content);
	return item;
}

async function loadEvents() {
	const response = await fetch('/data/events.json');
	const payload = await response.json();
	return Array.isArray(payload) ? payload : (payload.data || []);
}

function renderAgenda(event) {
	const section = document.createElement('section');
	section.className = 'detail-page__section';
	const heading = document.createElement('h2');
	heading.textContent = 'Agenda';
	section.append(heading);

	const list = document.createElement('div');
	list.className = 'detail-page__agenda';
	(event.agenda || []).forEach((item) => {
		const card = document.createElement('article');
		card.className = 'detail-page__agenda-item';
		card.innerHTML = `
			<strong>${item.time || ''}</strong>
			<h3>${item.activity || ''}</h3>
			<p>${item.description || ''}</p>
		`;
		list.append(card);
	});
	section.append(list);
	return section;
}

function renderPeopleSection(title, people) {
	const section = document.createElement('section');
	section.className = 'detail-page__section';
	const heading = document.createElement('h2');
	heading.textContent = title;
	section.append(heading);

	const grid = document.createElement('div');
	grid.className = 'detail-page__people-grid';
	(people || []).forEach((person) => {
		const card = document.createElement('article');
		card.className = 'detail-page__person';
		const avatar = document.createElement('img');
		avatar.src = normalizeAssetSrc(person.avatar, '');
		avatar.alt = person.name || 'Person';
		card.append(avatar);
		const body = document.createElement('div');
		body.innerHTML = `<h3>${person.name || ''}</h3><p>${person.designation || ''}</p><p>${person.bio || ''}</p>`;
		card.append(body);
		grid.append(card);
	});
	section.append(grid);
	return section;
}

export default async function decorate(block) {
	const targetId = getTargetId();
	const events = await loadEvents();
	const event = events.find((item) => String(item.id || '') === targetId || slugify(item.id) === slugify(targetId)) ||
		events.find((item) => slugify(item.title) === slugify(targetId)) || null;

	block.classList.add('detail-page', 'detail-page--event');
	block.textContent = '';

	if (!event) {
		const empty = document.createElement('div');
		empty.className = 'empty-state';
		empty.textContent = 'Event not found.';
		block.append(empty);
		return;
	}

	const hero = document.createElement('section');
	hero.className = 'detail-page__hero';

	const media = document.createElement('div');
	media.className = 'detail-page__hero-media';
	const image = document.createElement('img');
	image.src = normalizeAssetSrc(event.thumbnail, '');
	image.alt = event.title || 'Event';
	media.append(image);

	const copy = document.createElement('div');
	copy.className = 'detail-page__hero-copy';
	copy.innerHTML = `
		<p class="detail-page__eyebrow">${event.category || 'Event'}</p>
		<h1>${event.title || ''}</h1>
		<p class="detail-page__lede">${event.shortDescription || ''}</p>
	`;

	const meta = document.createElement('div');
	meta.className = 'detail-page__meta';
	meta.append(
		createMetaItem('Date', formatShortDate(event.date || '')),
		createMetaItem('Time', event.time || ''),
		createMetaItem('Venue', event.venue || ''),
		createMetaItem('Location', [event.location?.city, event.location?.state].filter(Boolean).join(', ')),
	);

	copy.append(meta);
	hero.append(media, copy);
	block.append(hero);

	const content = document.createElement('section');
	content.className = 'detail-page__section';
	content.innerHTML = `<h2>About this event</h2><p>${event.fullDescription || event.shortDescription || ''}</p>`;
	block.append(content);

	if (event.agenda && event.agenda.length) block.append(renderAgenda(event));
	if (event.hosts && event.hosts.length) block.append(renderPeopleSection('Hosts', event.hosts));
	if (event.presenters && event.presenters.length) block.append(renderPeopleSection('Presenters', event.presenters));
	if (event.guestSpeakers && event.guestSpeakers.length) block.append(renderPeopleSection('Guest speakers', event.guestSpeakers));

	if (event.closingQuote) {
		const quote = document.createElement('section');
		quote.className = 'detail-page__section detail-page__quote';
		quote.innerHTML = `<blockquote>${event.closingQuote}</blockquote>`;
		block.append(quote);
	}

	const related = events
		.filter((item) => item.id !== event.id && String(item.category || '') === String(event.category || ''))
		.slice(0, 3);

	if (related.length) {
		const section = document.createElement('section');
		section.className = 'detail-page__section';
		section.innerHTML = '<h2>Related events</h2>';
		const grid = document.createElement('div');
		grid.className = 'detail-page__related-grid';
		related.forEach((item) => grid.append(buildEventCard(item)));
		section.append(grid);
		block.append(section);
	}
}