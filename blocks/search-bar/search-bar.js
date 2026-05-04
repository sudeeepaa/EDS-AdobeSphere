import { appPath, buildBlogCard, buildEventCard, buildCreatorCard } from '../../scripts/utils.js';

const DEFAULT_TYPES = [
	{ value: 'all', label: 'All' },
	{ value: 'events', label: 'Events' },
	{ value: 'blogs', label: 'Blogs' },
	{ value: 'creators', label: 'Creators' },
];

// Fetch and cache data
let cachedData = { events: [], blogs: [], creators: [] };
let dataLoaded = false;

async function loadData() {
	if (dataLoaded) return cachedData;

	try {
		const [eventsRes, blogsRes, creatorsRes] = await Promise.all([
			fetch(appPath('/data/events.json')),
			fetch(appPath('/data/blogs.json')),
			fetch(appPath('/data/creators.json')),
		]);

		const eventsData = await eventsRes.json();
		const blogsData = await blogsRes.json();
		const creatorsData = await creatorsRes.json();

		cachedData.events = Array.isArray(eventsData) ? eventsData : eventsData.data || [];
		cachedData.blogs = Array.isArray(blogsData) ? blogsData : blogsData.data || [];
		cachedData.creators = Array.isArray(creatorsData) ? creatorsData : creatorsData.data || [];

		dataLoaded = true;
		return cachedData;
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Failed to load search data:', error);
		return { events: [], blogs: [], creators: [] };
	}
}

function matchesQuery(item, query) {
	if (!query || query.trim() === '') return true;
	const searchStr = JSON.stringify(item).toLowerCase();
	const queryStr = query.toLowerCase();
	return searchStr.includes(queryStr);
}

function searchResults(query, type = 'all') {
	const results = { events: [], blogs: [], creators: [] };

	if (!query || query.trim().length < 1) return results;

	if (type === 'all' || type === 'events') {
		results.events = cachedData.events.filter((item) => matchesQuery(item, query)).slice(0, 6);
	}

	if (type === 'all' || type === 'blogs') {
		results.blogs = cachedData.blogs.filter((item) => matchesQuery(item, query)).slice(0, 6);
	}

	if (type === 'all' || type === 'creators') {
		results.creators = cachedData.creators.filter((item) => matchesQuery(item, query)).slice(0, 6);
	}

	return results;
}

function renderResultsPanel(resultsContainer, query, activeType) {
	resultsContainer.innerHTML = '';

	if (!query || query.trim().length < 1) {
		resultsContainer.classList.add('is-hidden');
		return;
	}

	const results = searchResults(query, activeType);
	const hasResults = results.events.length > 0 || results.blogs.length > 0 || results.creators.length > 0;

	if (!hasResults) {
		const noResults = document.createElement('div');
		noResults.className = 'search-bar__no-results';
		noResults.textContent = 'No results found';
		resultsContainer.append(noResults);
		resultsContainer.classList.remove('is-hidden');
		return;
	}

	resultsContainer.classList.remove('is-hidden');

	// Events Results
	if ((activeType === 'all' || activeType === 'events') && results.events.length > 0) {
		const eventSection = document.createElement('div');
		eventSection.className = 'search-bar__results-section';

		const sectionTitle = document.createElement('div');
		sectionTitle.className = 'search-bar__results-title';
		sectionTitle.textContent = 'Events';
		eventSection.append(sectionTitle);

		const eventList = document.createElement('div');
		eventList.className = 'search-bar__results-list';
		results.events.forEach((item) => {
			eventList.append(buildEventCard(item));
		});
		eventSection.append(eventList);
		resultsContainer.append(eventSection);
	}

	// Blogs Results
	if ((activeType === 'all' || activeType === 'blogs') && results.blogs.length > 0) {
		const blogSection = document.createElement('div');
		blogSection.className = 'search-bar__results-section';

		const sectionTitle = document.createElement('div');
		sectionTitle.className = 'search-bar__results-title';
		sectionTitle.textContent = 'Blogs';
		blogSection.append(sectionTitle);

		const blogList = document.createElement('div');
		blogList.className = 'search-bar__results-list';
		results.blogs.forEach((item) => {
			blogList.append(buildBlogCard(item));
		});
		blogSection.append(blogList);
		resultsContainer.append(blogSection);
	}

	// Creators Results
	if ((activeType === 'all' || activeType === 'creators') && results.creators.length > 0) {
		const creatorSection = document.createElement('div');
		creatorSection.className = 'search-bar__results-section';

		const sectionTitle = document.createElement('div');
		sectionTitle.className = 'search-bar__results-title';
		sectionTitle.textContent = 'Creators';
		creatorSection.append(sectionTitle);

		const creatorList = document.createElement('div');
		creatorList.className = 'search-bar__results-list';
		results.creators.forEach((item) => {
			creatorList.append(buildCreatorCard(item));
		});
		creatorSection.append(creatorList);
		resultsContainer.append(creatorSection);
	}
}

export default async function decorate(block) {
	// Load data immediately
	await loadData();

	block.classList.add('search-bar');
	block.textContent = '';

	const shell = document.createElement('div');
	shell.className = 'search-bar__shell';

	const form = document.createElement('form');
	form.className = 'search-bar__form';
	form.setAttribute('role', 'search');

	const inputWrapper = document.createElement('div');
	inputWrapper.className = 'search-bar__input-wrapper';

	const input = document.createElement('input');
	input.type = 'search';
	input.className = 'search-bar__input';
	input.placeholder = 'Search events, blogs, creators...';
	input.setAttribute('aria-label', 'Search Adobesphere');

	const button = document.createElement('button');
	button.type = 'submit';
	button.className = 'search-bar__button';
	button.setAttribute('aria-label', 'Search');
	button.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>';

	let activeType = 'all';

	const chipsContainer = document.createElement('div');
	chipsContainer.className = 'search-bar__chips-container';

	const chips = document.createElement('div');
	chips.className = 'search-bar__chips';
	chips.setAttribute('role', 'group');
	chips.setAttribute('aria-label', 'Search type filters');

	DEFAULT_TYPES.forEach(({ value, label }) => {
		const chip = document.createElement('button');
		chip.type = 'button';
		chip.className = 'search-bar__chip';
		chip.dataset.value = value;
		chip.textContent = label;
		chip.setAttribute('aria-pressed', value === activeType ? 'true' : 'false');
		if (value === activeType) chip.classList.add('is-active');

		chip.addEventListener('click', (e) => {
			e.preventDefault();
			activeType = value;
			chips.querySelectorAll('.search-bar__chip').forEach((btn) => {
				const isActive = btn.dataset.value === value;
				btn.classList.toggle('is-active', isActive);
				btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
			});
			renderResultsPanel(resultsContainer, input.value, activeType);
		});
		chips.append(chip);
	});

	const resultsContainer = document.createElement('div');
	resultsContainer.className = 'search-bar__results is-hidden';

	// Real-time search
	input.addEventListener('input', (e) => {
		renderResultsPanel(resultsContainer, e.target.value, activeType);
	});

	// Handle form submit
	form.addEventListener('submit', (e) => {
		e.preventDefault();
		renderResultsPanel(resultsContainer, input.value, activeType);
	});

	// Close results when clicking outside
	document.addEventListener('click', (e) => {
		if (!shell.contains(e.target)) {
			resultsContainer.classList.add('is-hidden');
		}
	});

	// Open results when focusing input
	input.addEventListener('focus', () => {
		if (input.value.trim().length > 0) {
			resultsContainer.classList.remove('is-hidden');
		}
	});

	inputWrapper.append(input, button);
	form.append(inputWrapper);
	chipsContainer.append(chips);
	shell.append(form, chipsContainer, resultsContainer);
	block.append(shell);
}
