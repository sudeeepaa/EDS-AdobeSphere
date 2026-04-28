import { readBlockConfig } from '../../scripts/aem.js';
import { formatShortDate, normalizeAssetSrc, truncate } from '../../scripts/utils.js';

function slugFromId(id) {
	return String(id || '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function getEvents(payload) {
	if (Array.isArray(payload)) return payload;
	if (payload && Array.isArray(payload.data)) return payload.data;
	return [];
}

function buildCard(event) {
	const item = event || {};
	const article = document.createElement('article');
	article.className = 'event-card';

	const link = document.createElement('a');
	const slug = slugFromId(item.id);
	link.href = `/events/${slug}`;

	const imageWrap = document.createElement('div');
	imageWrap.className = 'event-card__image';

	const image = document.createElement('img');
	image.src = normalizeAssetSrc(item.thumbnail, '');
	image.alt = item.title || 'Event';
	image.loading = 'lazy';
	image.width = 400;
	image.height = 250;
	imageWrap.append(image);

	const category = document.createElement('span');
	category.className = 'event-card__category';
	category.textContent = item.category || 'Event';
	imageWrap.append(category);

	const body = document.createElement('div');
	body.className = 'event-card__body';

	const title = document.createElement('h3');
	title.textContent = item.title || 'Untitled Event';

	const date = document.createElement('p');
	date.className = 'event-card__date';
	date.textContent = formatShortDate(item.date || '');

	const location = document.createElement('p');
	location.className = 'event-card__location';
	const city = item.location && item.location.city;
	const state = item.location && item.location.state;
	location.textContent = [city, state].filter(Boolean).join(', ') || 'TBD';

	const excerpt = document.createElement('p');
	excerpt.className = 'event-card__excerpt';
	excerpt.textContent = truncate(item.shortDescription || '', 120);

	body.append(title, date, location, excerpt);
	link.append(imageWrap, body);
	article.append(link);

	return article;
}

function showEmptyState(block, message) {
	const empty = document.createElement('p');
	empty.className = 'event-cards__empty';
	empty.textContent = message;
	block.replaceChildren(empty);
}

export default async function decorate(block) {
	const config = readBlockConfig(block);
	const featuredOnly = String(config.featuredOnly || '').toLowerCase() === 'true';
	const limitValue = Number.parseInt(config.limit, 10);
	const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 6;

	block.classList.add('event-cards');
	block.textContent = '';

	try {
		const response = await fetch('/data/events.json');
		if (!response.ok) {
			throw new Error(`Failed to load events (${response.status})`);
		}

		const payload = await response.json();
		const items = getEvents(payload)
			.filter((event) => event && (!featuredOnly || event.featured === true))
			.slice(0, limit);

		if (!items.length) {
			showEmptyState(block, 'No featured events available right now.');
			return;
		}

		const grid = document.createElement('div');
		grid.className = 'event-cards__grid';
		items.forEach((event) => grid.append(buildCard(event)));
		block.append(grid);
	} catch (error) {
		showEmptyState(block, 'Unable to load events right now.');
		// eslint-disable-next-line no-console
		console.error('Failed to render event cards:', error);
	}
}
