import { formatShortDate, normalizeAssetSrc } from '../../scripts/utils.js';

/**
 * Decorates the event detail hero block.
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
	const params = new URLSearchParams(window.location.search);
	const id = params.get('id');

	block.textContent = '';

	try {
		const resp = await fetch('/data/events.json');
		if (!resp.ok) throw new Error('Failed to fetch events');

		const json = await resp.json();
		const allEvents = Array.isArray(json) ? json : (json.data || []);
		window.__allEvents = allEvents;

		const event = allEvents.find((e) => String(e.id) === id || e.slug === id);

		if (!event) {
			const error = document.createElement('div');
			error.className = 'event-not-found';
			const h1 = document.createElement('h1');
			h1.textContent = 'Event Not Found';
			const p = document.createElement('p');
			const a = document.createElement('a');
			a.href = '/events';
			a.textContent = 'Back to Events';
			p.append(a);
			error.append(h1, p);
			block.append(error);
			return;
		}

		window.__currentEvent = event;

		const hero = document.createElement('div');
		hero.className = 'event-hero';

		const img = document.createElement('img');
		img.id = 'event-hero-img';
		img.className = 'event-hero__img';
		img.src = normalizeAssetSrc(event.thumbnail, '');
		img.alt = event.title || 'Event Hero';

		const overlay = document.createElement('div');
		overlay.className = 'event-hero__overlay';
		overlay.setAttribute('aria-hidden', 'true');

		const content = document.createElement('div');
		content.className = 'event-hero__content container';

		const badge = document.createElement('span');
		badge.className = 'badge';
		badge.textContent = event.category || 'Event';

		const title = document.createElement('h1');
		title.textContent = event.title || 'Untitled Event';

		const date = document.createElement('p');
		date.textContent = formatShortDate(event.date);

		const loc = document.createElement('p');
		const city = event.location && event.location.city;
		const state = event.location && event.location.state;
		loc.textContent = city && state ? `${city}, ${state}` : (event.venue || 'TBD');

		content.append(badge, title, date, loc);
		hero.append(img, overlay, content);
		block.append(hero);
	} catch (err) {
		block.textContent = 'Error loading event details.';
		// eslint-disable-next-line no-console
		console.error('Event Hero Error:', err);
	}
}
