import { waitForCurrentEvent } from '../../scripts/utils.js';

/**
 * Decorates the event agenda block.
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
	const event = await waitForCurrentEvent();

	block.textContent = '';

	if (!event.agenda || !event.agenda.length) {
		const empty = document.createElement('p');
		empty.textContent = 'Agenda details will be announced soon.';
		block.append(empty);
		return;
	}

	const timeline = document.createElement('div');
	timeline.id = 'agenda-timeline';

	event.agenda.forEach((item) => {
		const row = document.createElement('div');
		row.className = 'agenda-item reveal';

		const time = document.createElement('div');
		time.className = 'agenda-time';
		time.textContent = item.time || '';

		const content = document.createElement('div');
		content.className = 'agenda-content';

		const h3 = document.createElement('h3');
		h3.textContent = item.title || 'Untitled Session';

		const p = document.createElement('p');
		p.textContent = item.description || '';

		content.append(h3, p);
		row.append(time, content);
		timeline.append(row);
	});

	block.append(timeline);
}
