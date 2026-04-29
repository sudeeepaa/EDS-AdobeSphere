import { appPath } from '../../scripts/utils.js';

const DEFAULT_TYPES = [
	{ value: 'all', label: 'All' },
	{ value: 'events', label: 'Events' },
	{ value: 'blogs', label: 'Blogs' },
	{ value: 'creators', label: 'Creators' },
];

const DEFAULT_CATEGORIES = [
	'',
	'AI & Emerging Technology',
	'Creative Tools & Product Updates',
	'Industry Trends & Thought Leadership',
	'Community / Events / Creator Programs',
];

function getRows(block) {
	return Array.from(block.querySelectorAll(':scope > div'));
}

function getCellText(cell) {
	return String(cell?.textContent || '').trim();
}

function parseConfig(block) {
	const rows = getRows(block);
	const config = {
		placeholder: 'Search events, blogs, creators...',
		buttonLabel: 'Search',
		types: DEFAULT_TYPES,
		categories: DEFAULT_CATEGORIES,
	};

	if (rows[0] && rows[0].children[0]) {
		const value = getCellText(rows[0].children[0]);
		if (value) config.placeholder = value;
	}

	if (rows[1]) {
		const types = Array.from(rows[1].children)
			.map((cell) => getCellText(cell))
			.filter(Boolean)
			.map((label) => ({ value: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label }));
		if (types.length) {
			config.types = [{ value: 'all', label: 'All' }, ...types];
		}
	}

	if (rows[2]) {
		const categories = Array.from(rows[2].children)
			.map((cell) => getCellText(cell))
			.filter(Boolean);
		if (categories.length) {
			config.categories = ['', ...categories];
		}
	}

	if (rows[3] && rows[3].children[0]) {
		const value = getCellText(rows[3].children[0]);
		if (value) config.buttonLabel = value;
	}

	return config;
}

function buildChipButton(group, value, label, activeValue) {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'search-bar__chip';
	button.dataset.value = value;
	button.textContent = label;
	button.setAttribute('aria-pressed', value === activeValue ? 'true' : 'false');
	if (value === activeValue) button.classList.add('is-active');
	return button;
}

function buildDestinationUrl({ query, type, category }) {
	const url = new URL(appPath('/explore'), window.location.origin);
	const normalizedQuery = String(query || '').trim();
	const normalizedType = String(type || 'all').trim();
	const normalizedCategory = String(category || '').trim();

	if (normalizedQuery) url.searchParams.set('q', normalizedQuery);
	if (normalizedType && normalizedType !== 'all') url.searchParams.set('type', normalizedType);
	if (normalizedCategory) url.searchParams.set('category', normalizedCategory);
	return `${url.pathname}${url.search}`;
}

export default function decorate(block) {
	const config = parseConfig(block);
	block.classList.add('search-bar');
	block.textContent = '';

	const shell = document.createElement('div');
	shell.className = 'search-bar__shell';

	const form = document.createElement('form');
	form.className = 'search-bar__form';
	form.setAttribute('role', 'search');

	const input = document.createElement('input');
	input.type = 'search';
	input.className = 'search-bar__input';
	input.placeholder = config.placeholder;
	input.setAttribute('aria-label', 'Search Adobesphere');

	const chips = document.createElement('div');
	chips.className = 'search-bar__chips';
	chips.setAttribute('role', 'group');
	chips.setAttribute('aria-label', 'Search type filters');

	let activeType = 'all';
	config.types.forEach(({ value, label }) => {
		const chip = buildChipButton(chips, value, label, activeType);
		chip.addEventListener('click', () => {
			activeType = value;
			chips.querySelectorAll('.search-bar__chip').forEach((button) => {
				const isActive = button.dataset.value === value;
				button.classList.toggle('is-active', isActive);
				button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
			});
		});
		chips.append(chip);
	});

	const select = document.createElement('select');
	select.className = 'search-bar__select';
	config.categories.forEach((category) => {
		const option = document.createElement('option');
		option.value = category;
		option.textContent = category || 'All Categories';
		select.append(option);
	});

	const submit = document.createElement('button');
	submit.type = 'submit';
	submit.className = 'btn btn-primary search-bar__button';
	submit.textContent = config.buttonLabel;

	form.append(input, chips, select, submit);
	shell.append(form);
	block.append(shell);

	form.addEventListener('submit', (event) => {
		event.preventDefault();
		window.location.href = buildDestinationUrl({
			query: input.value,
			type: activeType,
			category: select.value,
		});
	});
}
