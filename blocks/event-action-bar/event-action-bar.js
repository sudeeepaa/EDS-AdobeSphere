import { isLoggedIn, getUser } from '../../scripts/auth.js';
import Storage from '../../scripts/storage.js';
import { waitForCurrentEvent, showToast } from '../../scripts/utils.js';

/**
 * Creates a bookmark icon SVG.
 * @returns {SVGElement}
 */
function createBookmarkIcon() {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('viewBox', '0 0 24 24');
	svg.setAttribute('width', '20');
	svg.setAttribute('height', '20');
	svg.setAttribute('fill', 'none');
	svg.setAttribute('stroke', 'currentColor');
	svg.setAttribute('stroke-width', '2');
	svg.setAttribute('stroke-linecap', 'round');
	svg.setAttribute('stroke-linejoin', 'round');
	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path.setAttribute('d', 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z');
	svg.append(path);
	return svg;
}

/**
 * Decorates the event action bar block.
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
	const event = await waitForCurrentEvent();
	const id = String(event.id);

	block.textContent = '';

	const container = document.createElement('div');
	container.className = 'container event-action-bar__inner';

	// Save Button
	const saveBtn = document.createElement('button');
	saveBtn.id = 'save-event-btn';
	saveBtn.className = 'btn btn-ghost save-btn';

	const icon = createBookmarkIcon();
	const label = document.createElement('span');
	label.className = 'save-label';

	const updateSaveState = () => {
		const saved = Storage.isEventSaved(id);
		label.textContent = saved ? 'Saved' : 'Save Event';
		saveBtn.classList.toggle('active', saved);
	};

	saveBtn.append(icon, label);
	updateSaveState();

	saveBtn.addEventListener('click', () => {
		if (!isLoggedIn()) {
			window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
			return;
		}
		const saved = Storage.toggleSavedEvent(id);
		updateSaveState();
		showToast(saved ? 'Event saved to your profile.' : 'Event removed from your profile.', 'success');
	});

	// Register Button
	const regBtn = document.createElement('button');
	regBtn.id = 'register-btn';
	regBtn.className = 'btn btn-primary';

	const updateRegState = () => {
		const registered = Storage.isEventRegistered(id);
		regBtn.textContent = registered ? 'Registered' : 'Register for this Event';
		regBtn.disabled = registered;
	};

	updateRegState();

	regBtn.addEventListener('click', () => {
		if (!isLoggedIn()) {
			window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
			return;
		}

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		if (new Date(event.date) < today) {
			showToast('Registration is closed for past events.', 'error');
			return;
		}

		Storage.registerForEvent(id, getUser());
		updateRegState();
		showToast('You have successfully registered for this event!', 'success');
	});

	container.append(saveBtn, regBtn);
	block.append(container);
}
