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
		results.events = cachedData.events.filter((item) => matchesQuery(item, query)).slice(0, 5);
	}

	if (type === 'all' || type === 'blogs') {
		results.blogs = cachedData.blogs.filter((item) => matchesQuery(item, query)).slice(0, 5);
	}

	if (type === 'all' || type === 'creators') {
		results.creators = cachedData.creators.filter((item) => matchesQuery(item, query)).slice(0, 5);
	}

	return results;
}

function buildChipButton(value, label, activeValue) {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'search-bar__chip';
	button.dataset.value = value;
	button.textContent = label;
	button.setAttribute('aria-pressed', value === activeValue ? 'true' : 'false');
	if (value === activeValue) button.classList.add('is-active');
	return button;
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

	const inputContainer = document.createElement('div');
	inputContainer.className = 'search-bar__input-container';

	const input = document.createElement('input');
	input.type = 'search';
	input.className = 'search-bar__input';
	input.placeholder = 'Search events, blogs, creators...';
	input.setAttribute('aria-label', 'Search Adobesphere');

	const chips = document.createElement('div');
	chips.className = 'search-bar__chips';
	chips.setAttribute('role', 'group');
	chips.setAttribute('aria-label', 'Search type filters');

	let activeType = 'all';
	DEFAULT_TYPES.forEach(({ value, label }) => {
		const chip = buildChipButton(value, label, activeType);
		chip.addEventListener('click', () => {
			activeType = value;
			chips.querySelectorAll('.search-bar__chip').forEach((button) => {
				const isActive = button.dataset.value === value;
				button.classList.toggle('is-active', isActive);
				button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
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

	// Close results when clicking outside
	document.addEventListener('click', (e) => {
		if (!shell.contains(e.target) && !resultsContainer.contains(e.target)) {
			resultsContainer.classList.add('is-hidden');
		}
	});

	// Open results when focusing input
	input.addEventListener('focus', () => {
		if (input.value.trim().length > 0) {
			resultsContainer.classList.remove('is-hidden');
		}
	});

	inputContainer.append(input, chips);
	shell.append(inputContainer, resultsContainer);
	block.append(shell);
}
