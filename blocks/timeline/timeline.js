function getRows(block) {
	return Array.from(block.querySelectorAll(':scope > div'));
}

function getCellContent(cell) {
	if (!cell) return '';
	return cell.innerHTML.trim();
}

function extractLines(cell) {
	if (!cell) return [];
	const html = cell.innerHTML.replace(/<br\s*\/?>/gi, '\n');
	return html
		.split(/\n+/)
		.map((part) => part.replace(/<[^>]+>/g, '').trim())
		.filter(Boolean);
}

function buildTimelineItem(row) {
	const cells = Array.from(row.querySelectorAll(':scope > div'));
	if (cells.length < 2) return null;

	let title = '';
	let date = '';
	let bodyHtml = '';

	if (cells.length >= 3) {
		title = (cells[0].textContent || '').trim();
		date = (cells[1].textContent || '').trim();
		bodyHtml = cells.slice(2).map(getCellContent).join('');
	} else {
		const titleDateLines = extractLines(cells[0]);
		title = titleDateLines[0] || (cells[0].textContent || '').trim();
		date = titleDateLines[1] || '';
		bodyHtml = getCellContent(cells[1]);
	}

	const article = document.createElement('article');
	article.className = 'timeline-group reveal';
	article.setAttribute('role', 'listitem');

	const card = document.createElement('div');
	card.className = 'timeline-card';

	const cap = document.createElement('div');
	cap.className = 'timeline-cap';

	const capTitle = document.createElement('div');
	capTitle.className = 'timeline-cap-title';
	capTitle.textContent = title;

	const capDate = document.createElement('div');
	capDate.className = 'timeline-cap-date';
	capDate.textContent = date;

	const body = document.createElement('div');
	body.className = 'timeline-body';
	body.innerHTML = bodyHtml;

	const pointer = document.createElement('div');
	pointer.className = 'timeline-pointer';
	pointer.setAttribute('aria-hidden', 'true');

	cap.append(capTitle, capDate);
	card.append(cap, body, pointer);
	article.append(card);

	return article;
}

function startAutoScroll(track) {
	const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (prefersReducedMotion) return;

	const speedPxPerSecond = 42;
	let direction = 1;
	let paused = false;
	let lastTimestamp = 0;
	let lastMouseMove = 0;
	let frameId;

	const getMaxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);

	const step = (timestamp) => {
		if (!lastTimestamp) lastTimestamp = timestamp;
		const elapsed = Math.min(64, timestamp - lastTimestamp);
		lastTimestamp = timestamp;

		if (!paused) {
			const maxScroll = getMaxScroll();
			if (maxScroll > 0) {
				let nextScroll = track.scrollLeft + (direction * speedPxPerSecond * elapsed) / 1000;

				if (nextScroll >= maxScroll) {
					nextScroll = maxScroll;
					direction = -1;
				} else if (nextScroll <= 0) {
					nextScroll = 0;
					direction = 1;
				}

				track.scrollLeft = nextScroll;
			}
		}

		frameId = window.requestAnimationFrame(step);
	};

	const pause = () => {
		paused = true;
	};

	const resume = () => {
		paused = false;
		lastTimestamp = 0;
	};

	track.addEventListener('mouseenter', () => {
		if (Date.now() - lastMouseMove <= 450) pause();
	});

	track.addEventListener('mousemove', () => {
		lastMouseMove = Date.now();
	});

	track.addEventListener('mouseleave', resume);
	track.addEventListener('focusin', pause);
	track.addEventListener('focusout', resume);
	track.addEventListener('pointerdown', pause);

	frameId = window.requestAnimationFrame(step);

	return () => {
		window.cancelAnimationFrame(frameId);
		track.removeEventListener('mouseleave', resume);
		track.removeEventListener('focusin', pause);
		track.removeEventListener('focusout', resume);
	};
}

export default function decorate(block) {
	const rows = getRows(block);
	block.classList.add('timeline');
	block.textContent = '';

	const track = document.createElement('div');
	track.className = 'timeline-track';
	track.setAttribute('role', 'list');
	track.tabIndex = 0;

	rows
		.map(buildTimelineItem)
		.filter(Boolean)
		.forEach((item) => track.append(item));

	block.append(track);
	startAutoScroll(track);
}