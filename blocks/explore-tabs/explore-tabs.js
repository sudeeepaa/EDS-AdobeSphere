import { readBlockConfig } from '../../scripts/aem.js';
import {
	buildBlogCard,
	buildCreatorCard,
	buildEventCard,
	initRevealObserver,
} from '../../scripts/utils.js';

/**
 * Helper to create DOM elements.
 * @param {string} tag
 * @param {Object} attrs
 * @param {...any} children
 * @returns {HTMLElement}
 */
function el(tag, attrs = {}, ...children) {
	const element = document.createElement(tag);
	Object.entries(attrs).forEach(([key, value]) => {
		if (key === 'className') {
			element.className = value;
		} else if (key.startsWith('on') && typeof value === 'function') {
			element.addEventListener(key.substring(2).toLowerCase(), value);
		} else {
			element.setAttribute(key, value);
		}
	});
	children.forEach((child) => {
		if (child instanceof Node) {
			element.appendChild(child);
		} else if (child !== null && child !== undefined) {
			element.appendChild(document.createTextNode(String(child)));
		}
	});
	return element;
}

/**
 * Decorates the explore tabs block.
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
	const config = readBlockConfig(block);
	const eventsSource = config['events-source'] || '/data/events.json';
	const blogsSource = config['blogs-source'] || '/data/blogs.json';
	const creatorsSource = config['creators-source'] || '/data/creators.json';
	const pageSize = parseInt(config['page-size'], 10) || 9;

	const state = {
		activeTab: 'events',
		searchQuery: '',
		eventsPage: 1,
		blogsPage: 1,
		creatorsPage: 1,
		pageSize,
		data: { events: [], blogs: [], creators: [] },
		filters: {
			eventCategory: '',
			eventDate: 'all',
			eventLocations: [],
			blogCategory: '',
			blogAuthor: '',
			blogSort: 'newest',
			creatorSort: 'name-asc',
			creatorDesignations: [],
		},
	};

	// Clear block and add class
	block.classList.add('explore-tabs');
	block.textContent = '';

	// Build Tab Navigation
	const tabsNav = el(
		'div',
		{ className: 'tabs-nav', role: 'tablist' },
		el('button', { className: 'tab-button active', 'data-tab': 'events', role: 'tab' }, 'Events & Campaigns'),
		el('button', { className: 'tab-button', 'data-tab': 'blogs', role: 'tab' }, 'Blogs & Articles'),
		el('button', { className: 'tab-button', 'data-tab': 'creators', role: 'tab' }, 'Creators')
	);

	// Build Filter Bar
	const filterBar = el(
		'div',
		{ id: 'filter-bar', className: 'filter-bar' },
		// Events Filter Group
		el(
			'div',
			{ className: 'filter-group', 'data-filter-group': 'events' },
			el('select', { id: 'events-category', className: 'filter-select' }, el('option', { value: '' }, 'All Categories')),
			el(
				'div',
				{ className: 'date-radios' },
				el('label', {}, el('input', { type: 'radio', name: 'event-date', value: 'all', checked: 'true' }), ' All'),
				el('label', {}, el('input', { type: 'radio', name: 'event-date', value: 'upcoming' }), ' Upcoming'),
				el('label', {}, el('input', { type: 'radio', name: 'event-date', value: 'past' }), ' Past')
			),
			el('div', { className: 'location-checkboxes' })
		),
		// Blogs Filter Group
		el(
			'div',
			{ className: 'filter-group is-hidden', 'data-filter-group': 'blogs' },
			el('select', { id: 'blogs-category', className: 'filter-select' }, el('option', { value: '' }, 'All Categories')),
			el('input', {
				id: 'blogs-author',
				className: 'filter-input',
				type: 'text',
				placeholder: 'Search by author',
			}),
			el(
				'select',
				{ id: 'blogs-sort', className: 'filter-select' },
				el('option', { value: 'newest' }, 'Newest First'),
				el('option', { value: 'oldest' }, 'Oldest First')
			)
		),
		// Creators Filter Group
		el(
			'div',
			{ className: 'filter-group is-hidden', 'data-filter-group': 'creators' },
			el(
				'select',
				{ id: 'creators-sort', className: 'filter-select' },
				el('option', { value: 'name-asc' }, 'Name A-Z'),
				el('option', { value: 'name-desc' }, 'Name Z-A')
			),
			el('div', { className: 'designation-checkboxes' })
		),
		el('button', { id: 'clear-filters', className: 'btn btn-ghost' }, 'Clear Filters')
	);

	// Build Grids and Pagination
	const gridsContainer = el('div', { className: 'grids-container' });
	const paginationContainer = el('div', { className: 'pagination-container' });

	['events', 'blogs', 'creators'].forEach((tab) => {
		const grid = el('div', { id: `${tab}-grid`, className: `grid-3 explore-grid ${tab !== 'events' ? 'is-hidden' : ''}` });
		const pagination = el(
			'div',
			{ id: `${tab}-pagination`, className: `explore-pagination ${tab !== 'events' ? 'is-hidden' : ''}` },
			el('button', { className: 'btn btn-ghost prev' }, 'Prev'),
			el('span', { className: 'page-info' }, 'Page 1 of 1'),
			el('button', { className: 'btn btn-ghost next' }, 'Next')
		);
		gridsContainer.append(grid);
		paginationContainer.append(pagination);
	});

	block.append(tabsNav, filterBar, gridsContainer, paginationContainer);

	// Fetch Data
	try {
		const [eventsData, blogsData, creatorsData] = await Promise.all([
			fetch(eventsSource).then((r) => r.json()),
			fetch(blogsSource).then((r) => r.json()),
			fetch(creatorsSource).then((r) => r.json()),
		]);

		state.data.events = Array.isArray(eventsData) ? eventsData : eventsData.data || [];
		state.data.blogs = Array.isArray(blogsData) ? blogsData : blogsData.data || [];
		state.data.creators = Array.isArray(creatorsData) ? creatorsData : creatorsData.data || [];

		populateFilters(state, block);
		readUrlParams(state);
		renderActiveTab(state, block);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Failed to fetch explore data:', error);
	}

	// Event Listeners
	attachEventListeners(state, block);
}

function populateFilters(state, block) {
	// Event Categories
	const eventCats = [...new Set(state.data.events.map((e) => e.category).filter(Boolean))].sort();
	const eventCatSelect = block.querySelector('#events-category');
	eventCats.forEach((cat) => eventCatSelect.append(el('option', { value: cat }, cat)));

	// Event Locations
	const eventLocs = [
		...new Set(
			state.data.events
				.map((e) => {
					const city = e.location && e.location.city;
					const stateName = e.location && e.location.state;
					return [city, stateName].filter(Boolean).join(', ');
				})
				.filter(Boolean)
		),
	].sort();
	const eventLocContainer = block.querySelector('.location-checkboxes');
	eventLocs.forEach((loc) => {
		const label = el('label', {}, el('input', { type: 'checkbox', value: loc }), ` ${loc}`);
		eventLocContainer.append(label);
	});

	// Blog Categories
	const blogCats = [...new Set(state.data.blogs.map((b) => b.category).filter(Boolean))].sort();
	const blogCatSelect = block.querySelector('#blogs-category');
	blogCats.forEach((cat) => blogCatSelect.append(el('option', { value: cat }, cat)));

	// Creator Designations
	const designations = [...new Set(state.data.creators.map((c) => c.designation).filter(Boolean))].sort();
	const designationContainer = block.querySelector('.designation-checkboxes');
	designations.forEach((des) => {
		const label = el('label', {}, el('input', { type: 'checkbox', value: des }), ` ${des}`);
		designationContainer.append(label);
	});
}

function readUrlParams(state) {
	const params = new URLSearchParams(window.location.search);
	if (params.has('tab')) state.activeTab = params.get('tab');
	if (params.has('q')) state.searchQuery = params.get('q');
	if (params.has('category')) {
		const cat = params.get('category');
		if (state.activeTab === 'events') state.filters.eventCategory = cat;
		if (state.activeTab === 'blogs') state.filters.blogCategory = cat;
	}
}

function renderActiveTab(state, block) {
	const { activeTab, searchQuery, pageSize, filters } = state;

	// Show/Hide Groups and Grids
	block.querySelectorAll('.filter-group').forEach((g) => {
		g.classList.toggle('is-hidden', g.dataset.filterGroup !== activeTab);
	});
	block.querySelectorAll('.explore-grid').forEach((g) => {
		g.classList.toggle('is-hidden', g.id !== `${activeTab}-grid`);
	});
	block.querySelectorAll('.explore-pagination').forEach((p) => {
		p.classList.toggle('is-hidden', p.id !== `${activeTab}-pagination`);
	});
	block.querySelectorAll('.tab-button').forEach((b) => {
		b.classList.toggle('active', b.dataset.tab === activeTab);
	});

	// Filter Data
	let filtered = [];
	if (activeTab === 'events') {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		filtered = state.data.events.filter((item) => {
			const catMatch = !filters.eventCategory || item.category === filters.eventCategory;
			const searchMatch = !searchQuery || JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase());
			const locMatch = !filters.eventLocations.length || filters.eventLocations.includes([item.location?.city, item.location?.state].filter(Boolean).join(', '));
			let dateMatch = true;
			const itemDate = new Date(item.date);
			if (filters.eventDate === 'upcoming') dateMatch = itemDate >= today;
			if (filters.eventDate === 'past') dateMatch = itemDate < today;
			return catMatch && searchMatch && locMatch && dateMatch;
		});
	} else if (activeTab === 'blogs') {
		filtered = state.data.blogs.filter((item) => {
			const catMatch = !filters.blogCategory || item.category === filters.blogCategory;
			const authorMatch = !filters.blogAuthor || (item.author?.name || '').toLowerCase().includes(filters.blogAuthor.toLowerCase());
			const searchMatch = !searchQuery || JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase());
			return catMatch && authorMatch && searchMatch;
		});
		filtered.sort((a, b) => {
			const dateA = new Date(a.publishedDate);
			const dateB = new Date(b.publishedDate);
			return filters.blogSort === 'newest' ? dateB - dateA : dateA - dateB;
		});
	} else if (activeTab === 'creators') {
		filtered = state.data.creators.filter((item) => {
			const searchMatch = !searchQuery || JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase());
			const desMatch = !filters.creatorDesignations.length || filters.creatorDesignations.includes(item.designation);
			return searchMatch && desMatch;
		});
		filtered.sort((a, b) => {
			return filters.creatorSort === 'name-asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
		});
	}

	// Pagination
	const currentPage = state[`${activeTab}Page`];
	const totalPages = Math.ceil(filtered.length / pageSize) || 1;
	const start = (currentPage - 1) * pageSize;
	const itemsToShow = filtered.slice(start, start + pageSize);

	const grid = block.querySelector(`#${activeTab}-grid`);
	grid.textContent = '';
	if (itemsToShow.length === 0) {
		grid.append(el('p', { className: 'no-results' }, 'No results found.'));
	} else {
		itemsToShow.forEach((item) => {
			if (activeTab === 'events') grid.append(buildEventCard(item));
			else if (activeTab === 'blogs') grid.append(buildBlogCard(item));
			else if (activeTab === 'creators') grid.append(buildCreatorCard(item));
		});
	}

	// Update Pagination UI
	const pagEl = block.querySelector(`#${activeTab}-pagination`);
	pagEl.querySelector('.page-info').textContent = `Page ${currentPage} of ${totalPages}`;
	pagEl.querySelector('.prev').disabled = currentPage <= 1;
	pagEl.querySelector('.next').disabled = currentPage >= totalPages;

	initRevealObserver();
}

function attachEventListeners(state, block) {
	// Tab Clicks
	block.querySelector('.tabs-nav').addEventListener('click', (e) => {
		const btn = e.target.closest('.tab-button');
		if (btn) {
			state.activeTab = btn.dataset.tab;
			renderActiveTab(state, block);
			updateUrl(state);
		}
	});

	// Filter Changes
	block.addEventListener('change', (e) => {
		const target = e.target;
		if (target.id === 'events-category') state.filters.eventCategory = target.value;
		if (target.name === 'event-date') state.filters.eventDate = target.value;
		if (target.closest('.location-checkboxes')) {
			state.filters.eventLocations = Array.from(block.querySelectorAll('.location-checkboxes input:checked')).map((i) => i.value);
		}
		if (target.id === 'blogs-category') state.filters.blogCategory = target.value;
		if (target.id === 'blogs-sort') state.filters.blogSort = target.value;
		if (target.id === 'creators-sort') state.filters.creatorSort = target.value;
		if (target.closest('.designation-checkboxes')) {
			state.filters.creatorDesignations = Array.from(block.querySelectorAll('.designation-checkboxes input:checked')).map((i) => i.value);
		}
		state[`${state.activeTab}Page`] = 1;
		renderActiveTab(state, block);
	});

	block.querySelector('#blogs-author').addEventListener('input', (e) => {
		state.filters.blogAuthor = e.target.value;
		state.blogsPage = 1;
		renderActiveTab(state, block);
	});

	// Clear Filters
	block.querySelector('#clear-filters').addEventListener('click', () => {
		state.filters = {
			eventCategory: '',
			eventDate: 'all',
			eventLocations: [],
			blogCategory: '',
			blogAuthor: '',
			blogSort: 'newest',
			creatorSort: 'name-asc',
			creatorDesignations: [],
		};
		// Reset inputs - for radios, check the 'all' option, for checkboxes and other radios uncheck
		block.querySelectorAll('input[type="radio"]').forEach((i) => {
			i.checked = i.value === 'all';
		});
		block.querySelectorAll('input[type="checkbox"]').forEach((i) => {
			i.checked = false;
		});
		block.querySelectorAll('select').forEach((s) => (s.value = ''));
		block.querySelectorAll('input[type="text"]').forEach((i) => (i.value = ''));
		state[`${state.activeTab}Page`] = 1;
		renderActiveTab(state, block);
	});

	// Pagination Clicks
	block.querySelectorAll('.explore-pagination').forEach((pag) => {
		pag.addEventListener('click', (e) => {
			const tab = pag.id.split('-')[0];
			if (e.target.classList.contains('prev') && state[`${tab}Page`] > 1) {
				state[`${tab}Page`]--;
				renderActiveTab(state, block);
			}
			if (e.target.classList.contains('next')) {
				const grid = block.querySelector(`#${tab}-grid`);
				// We need the total count to disable "next", but renderActiveTab already does it.
				// Just increment and render.
				state[`${tab}Page`]++;
				renderActiveTab(state, block);
			}
		});
	});

	// Custom Search Event
	document.addEventListener('explore:search', (e) => {
		state.searchQuery = e.detail?.query || '';
		state.eventsPage = 1;
		state.blogsPage = 1;
		state.creatorsPage = 1;
		renderActiveTab(state, block);
		updateUrl(state);
	});
}

function updateUrl(state) {
	const url = new URL(window.location);
	url.searchParams.set('tab', state.activeTab);
	if (state.searchQuery) url.searchParams.set('q', state.searchQuery);
	else url.searchParams.delete('q');
	window.history.replaceState({}, '', url);
}
