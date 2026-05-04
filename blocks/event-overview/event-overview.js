import { waitForCurrentEvent } from '../../scripts/utils.js';

/**
 * Formats event date and time.
 * @param {Object} event
 * @returns {string}
 */
function formatDateTimeFull(event) {
	const date = new Date(event.date);
	if (Number.isNaN(date.getTime())) return 'TBD';
	const options = {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	};
	const dateStr = date.toLocaleDateString('en-US', options);
	const timeStr = event.time || 'All Day';
	return `${dateStr} | ${timeStr}`;
}

/**
 * Decorates the event overview block.
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
	const event = await waitForCurrentEvent();

	block.textContent = '';

	const h2 = document.createElement('h2');
	h2.textContent = 'Event Overview';

	const grid = document.createElement('div');
	grid.className = 'event-overview-grid';

	const pDate = document.createElement('p');
	pDate.textContent = `Date & Time: ${formatDateTimeFull(event)}`;

	const pVenue = document.createElement('p');
	pVenue.textContent = `Venue: ${event.venue || 'TBD'}`;

	const pCat = document.createElement('p');
	pCat.textContent = `Category: ${event.category || 'Event'}`;

	grid.append(pDate, pVenue, pCat);

	const pDesc = document.createElement('p');
	pDesc.className = 'event-full-description';
	pDesc.textContent = event.description || event.fullDescription || '';

	block.append(h2, grid, pDesc);
}
