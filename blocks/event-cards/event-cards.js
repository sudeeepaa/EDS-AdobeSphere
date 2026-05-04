import { readBlockConfig } from '../../scripts/aem.js';
import { formatShortDate, normalizeAssetSrc, truncate, initRevealObserver } from '../../scripts/utils.js';

/**
 * Builds an event card element.
 * @param {Object} event The event data.
 * @returns {HTMLElement} The card element.
 */
function buildCard(event) {
	const item = event || {};
	const article = document.createElement('article');
	article.className = 'card reveal';

	const link = document.createElement('a');
	link.className = 'card__full-link';
	link.href = `/events/template?id=${encodeURIComponent(item.id || '')}`;
	article.append(link);

	const image = document.createElement('img');
	image.className = 'card__image';
	image.src = normalizeAssetSrc(item.thumbnail, '');
	image.alt = item.title || 'Event';
	image.loading = 'lazy';
	image.width = 400;
	image.height = 250;
	article.append(image);

	const body = document.createElement('div');
	body.className = 'card__body';

	const category = document.createElement('span');
	category.className = 'badge';
	category.textContent = item.category || 'Event';
	body.append(category);

	const title = document.createElement('h3');
	title.className = 'card__title';
	title.textContent = item.title || 'Untitled Event';
	body.append(title);

	const meta = document.createElement('div');
	meta.className = 'card__meta';

	const dateSpan = document.createElement('span');
	dateSpan.textContent = formatShortDate(item.date || '');
	meta.append(dateSpan);

	const locationSpan = document.createElement('span');
	const city = item.location && item.location.city;
	const state = item.location && item.location.state;
	locationSpan.textContent = [city, state].filter(Boolean).join(', ') || 'TBD';
	meta.append(locationSpan);
	body.append(meta);

	const excerpt = document.createElement('p');
	excerpt.className = 'card__excerpt';
	excerpt.textContent = truncate(item.shortDescription || '', 120);
	body.append(excerpt);

	article.append(body);

	return article;
}

/**
 * Decorates the event cards block.
 * @param {Element} block The block element.
 */
export default async function decorate(block) {
	const config = readBlockConfig(block);
	const featuredOnly = String(config.featuredOnly || '').toLowerCase() === 'true';
	const limitValue = Number.parseInt(config.limit, 10);
	const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 6;
	const source = config.source || '/data/events.json';

	block.classList.add('event-cards');
	block.textContent = '';

	const grid = document.createElement('div');
	grid.className = 'events-grid grid-3';

	try {
		const response = await fetch(source);
		if (!response.ok) {
			throw new Error(`Failed to load events (${response.status})`);
		}

		const payload = await response.json();
		const data = Array.isArray(payload) ? payload : (payload.data || []);
		const items = data
			.filter((event) => event && (!featuredOnly || event.featured === true))
			.slice(0, limit);

		if (!items.length) {
			const empty = document.createElement('p');
			empty.className = 'event-cards__empty';
			empty.textContent = 'No featured events available right now.';
			block.append(empty);
			return;
		}

		items.forEach((event) => grid.append(buildCard(event)));
		block.append(grid);

		// Initialize reveal observer for smooth entrance animations
		initRevealObserver();
	} catch (error) {
		const errorMsg = document.createElement('p');
		errorMsg.className = 'event-cards__error';
		errorMsg.textContent = 'Unable to load events right now.';
		block.append(errorMsg);
		// eslint-disable-next-line no-console
		console.error('Failed to render event cards:', error);
	}
}
