const CATEGORY_URLS = {
	'AI & Technology': '/explore?tab=blogs&category=AI+%26+Emerging+Technology',
	'Creative Tools': '/explore?tab=blogs&category=Creative+Tools+%26+Product+Updates',
	'Industry Trends': '/explore?tab=blogs&category=Industry+Trends+%26+Thought+Leadership',
	'Community & Events': '/explore?tab=blogs&category=Community+%2F+Events+%2F+Creator+Programs',
	Workshops: '/explore?tab=events&category=Workshops',
	Webinars: '/explore?tab=events&category=Webinars',
	Conferences: '/explore?tab=events&category=Conferences',
	All: '/explore',
};

function getTableRows(block) {
	return Array.from(block.querySelectorAll(':scope > div'));
}

function extractLabelAndHref(cell) {
	const link = cell.querySelector('a[href]');
	const label = (link ? link.textContent : cell.textContent || '').trim();
	const href = link ? link.getAttribute('href') || '' : '';

	if (!label) return null;

	return { label, href };
}

function extractPillsFromRow(row, rowIndex, rowCount) {
	const cells = Array.from(row.querySelectorAll(':scope > div'));
	if (!cells.length) return [];

	if (rowIndex === 0 && rowCount > 1 && cells.length === 1 && !cells[0].querySelector('a[href]')) {
		return [];
	}

	return cells.map(extractLabelAndHref).filter(Boolean);
}

function getMappedUrl(label, href) {
	if (href) return href;
	return CATEGORY_URLS[label] || '/explore';
}

function createPill(label, href) {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'category-pill';
	button.textContent = label;
	button.dataset.label = label;
	button.dataset.href = href || '';

	button.addEventListener('click', () => {
		window.location.href = getMappedUrl(label, href);
	});

	return button;
}

export default function decorate(block) {
	const rows = getTableRows(block);
	const pills = rows.flatMap((row, rowIndex) => extractPillsFromRow(row, rowIndex, rows.length))
		.map(({ label, href }) => createPill(label, href));

	block.classList.add('category-filter');
	block.textContent = '';

	const marquee = document.createElement('div');
	marquee.className = 'category-marquee';

	const track = document.createElement('div');
	track.className = 'category-marquee__track';

	const pillGroup = document.createElement('div');
	pillGroup.className = 'category-pills';
	pills.forEach((pill) => pillGroup.append(pill));

	track.append(pillGroup);

	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (!reduceMotion && pills.length) {
		const clone = pillGroup.cloneNode(true);
		clone.setAttribute('aria-hidden', 'true');
		clone.querySelectorAll('.category-pill').forEach((pill) => {
			const label = pill.dataset.label || pill.textContent.trim();
			const href = pill.dataset.href || '';
			pill.addEventListener('click', () => {
				window.location.href = getMappedUrl(label, href);
			});
		});
		track.append(clone);
	}

	marquee.append(track);
	block.append(marquee);
}
