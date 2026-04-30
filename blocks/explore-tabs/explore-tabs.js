import { buildBlogCard, buildCreatorCard, buildEventCard, initRevealObserver } from '../../scripts/utils.js';

/**
 * Debounce utility
 */
function debounce(fn, delay) {
  let timeoutId;
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Get event location label from event object
 */
function getEventLocationLabel(event) {
  if (!event) return '';
  const location = event.location || {};
  const city = String(location.city || '').trim();
  const state = String(location.state || '').trim();
  const country = String(location.country || '').trim();

  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state && country) return `${state}, ${country}`;
  return country;
}

/**
 * Filter and render events
 */
function filterEvents(allEvents, searchTerm, filters) {
  const category = (filters.eventCategory || '').toLowerCase();
  const locations = filters.eventLocations || [];
  const dateFilter = filters.eventDate || 'all';
  const search = searchTerm.toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const locationMap = {};
  locations.forEach((loc) => {
    locationMap[loc.toLowerCase()] = true;
  });

  return allEvents.filter((item) => {
    const itemDate = new Date(item.date);
    const itemCategory = String(item.category || '').toLowerCase();
    const itemLocationLabel = getEventLocationLabel(item);
    const itemLocation = [
      item.location && item.location.city,
      item.location && item.location.state,
      item.location && item.location.country
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const textBlob = [item.title, item.shortDescription, itemCategory, itemLocation]
      .join(' ')
      .toLowerCase();

    const categoryOk = !category || itemCategory === category;
    const locationOk = !locations.length || !!locationMap[String(itemLocationLabel || '').toLowerCase()];
    const searchOk = !search || textBlob.includes(search);

    let dateOk = true;
    if (dateFilter === 'upcoming') {
      dateOk = !Number.isNaN(itemDate.getTime()) && itemDate >= today;
    } else if (dateFilter === 'past') {
      dateOk = !Number.isNaN(itemDate.getTime()) && itemDate < today;
    }

    return categoryOk && locationOk && searchOk && dateOk;
  });
}

/**
 * Filter and render blogs
 */
function filterBlogs(allBlogs, searchTerm, filters) {
  const category = (filters.blogCategory || '').toLowerCase();
  const authorQuery = (filters.blogAuthor || '').toLowerCase();
  const sortBy = filters.blogSort || 'newest';
  const search = searchTerm.toLowerCase();

  let filtered = allBlogs.filter((item) => {
    const itemCategory = String(item.category || '').toLowerCase();
    const authorName = String((item.author && item.author.name) || '').toLowerCase();
    const textBlob = [item.title, item.excerpt, itemCategory, authorName].join(' ').toLowerCase();

    const categoryOk = !category || itemCategory === category;
    const authorOk = !authorQuery || authorName.includes(authorQuery);
    const searchOk = !search || textBlob.includes(search);

    return categoryOk && authorOk && searchOk;
  });

  filtered.sort((a, b) => {
    const da = new Date(a.publishedDate).getTime() || 0;
    const db = new Date(b.publishedDate).getTime() || 0;
    return sortBy === 'oldest' ? da - db : db - da;
  });

  return filtered;
}

/**
 * Filter and render creators
 */
function filterCreators(allCreators, searchTerm, filters) {
  const sortBy = filters.creatorSort || 'name-asc';
  const search = searchTerm.toLowerCase();

  let filtered = allCreators.filter((item) => {
    const textBlob = [item.name, item.bio, item.designation].join(' ').toLowerCase();
    const searchOk = !search || textBlob.includes(search);
    return searchOk;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'name-desc') {
      return String(b.name || '').localeCompare(String(a.name || ''));
    }
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  return filtered;
}

/**
 * Main block decorate function
 */
export default async function decorate(block) {
  // Clear block content
  block.textContent = '';

  const PAGE_SIZE = 12;

  // Initialize state
  const state = {
    activeTab: 'events',
    currentPage: 1,
    searchTerm: '',
    data: {
      events: [],
      blogs: [],
      creators: []
    },
    filters: {
      eventCategory: '',
      eventLocations: [],
      eventDate: 'all',
      blogCategory: '',
      blogAuthor: '',
      blogSort: 'newest',
      creatorSort: 'name-asc'
    }
  };

  // Load all data in parallel
  try {
    const [eventsRes, blogsRes, creatorsRes] = await Promise.all([
      fetch('/data/events.json'),
      fetch('/data/blogs.json'),
      fetch('/data/creators.json')
    ]);

    const eventsData = await eventsRes.json();
    const blogsData = await blogsRes.json();
    const creatorsData = await creatorsRes.json();

    // Handle both array and object formats
    state.data.events = Array.isArray(eventsData) ? eventsData : (eventsData.data || []);
    state.data.blogs = Array.isArray(blogsData) ? blogsData : (blogsData.data || []);
    state.data.creators = Array.isArray(creatorsData) ? creatorsData : (creatorsData.data || []);
  } catch (error) {
    console.error('Error loading explore data:', error);
  }

  // Build DOM structure
  const wrapper = document.createElement('div');
  wrapper.className = 'explore-wrapper';

  // Search input
  const searchDiv = document.createElement('div');
  searchDiv.className = 'explore-search';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search events, blogs, creators...';
  searchInput.setAttribute('aria-label', 'Search explore content');
  searchDiv.appendChild(searchInput);
  wrapper.appendChild(searchDiv);

  // Tab navigation
  const tabsNav = document.createElement('div');
  tabsNav.className = 'tabs-nav';
  tabsNav.setAttribute('role', 'tablist');
  tabsNav.setAttribute('aria-label', 'Explore content tabs');

  const tabButtons = [
    { id: 'events', label: 'Events & Campaigns' },
    { id: 'blogs', label: 'Blogs & Articles' },
    { id: 'creators', label: 'Creators' }
  ];

  const tabButtonElements = {};
  tabButtons.forEach(({ id, label }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tab-button';
    if (id === state.activeTab) btn.classList.add('active');
    btn.setAttribute('data-tab', id);
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', id === state.activeTab ? 'true' : 'false');
    btn.textContent = label;
    btn.addEventListener('click', () => switchTab(id));
    tabsNav.appendChild(btn);
    tabButtonElements[id] = btn;
  });
  wrapper.appendChild(tabsNav);

  // Filter bar
  const filterBar = document.createElement('div');
  filterBar.className = 'filter-bar';

  // Events filters
  const eventsFilters = document.createElement('div');
  eventsFilters.className = 'filter-group';
  eventsFilters.setAttribute('data-tab', 'events');

  const eventCategorySelect = document.createElement('select');
  eventCategorySelect.className = 'filter-select';
  eventCategorySelect.id = 'events-category';
  eventCategorySelect.addEventListener('change', (e) => {
    state.filters.eventCategory = e.target.value;
    state.currentPage = 1;
    renderResults();
  });

  const eventCategoryOption = document.createElement('option');
  eventCategoryOption.value = '';
  eventCategoryOption.textContent = 'All Categories';
  eventCategorySelect.appendChild(eventCategoryOption);

  // Populate event categories
  const eventCategories = new Set();
  state.data.events.forEach((e) => {
    if (e.category) eventCategories.add(e.category);
  });
  Array.from(eventCategories)
    .sort()
    .forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      eventCategorySelect.appendChild(opt);
    });

  eventsFilters.appendChild(eventCategorySelect);

  // Event date radio buttons
  const dateRadioGroup = document.createElement('div');
  dateRadioGroup.className = 'date-radios';
  dateRadioGroup.setAttribute('role', 'group');
  dateRadioGroup.setAttribute('aria-label', 'Event date filter');

  const dateOptions = [
    { value: 'all', label: 'All' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' }
  ];

  dateOptions.forEach(({ value, label }) => {
    const dateLabel = document.createElement('label');
    const dateInput = document.createElement('input');
    dateInput.type = 'radio';
    dateInput.name = 'event-date';
    dateInput.value = value;
    if (value === 'all') dateInput.checked = true;
    dateInput.addEventListener('change', (e) => {
      state.filters.eventDate = e.target.value;
      state.currentPage = 1;
      renderResults();
    });
    dateLabel.appendChild(dateInput);
    dateLabel.appendChild(document.createTextNode(label));
    dateRadioGroup.appendChild(dateLabel);
  });

  eventsFilters.appendChild(dateRadioGroup);

  // Event location checkboxes
  const locationLabel = document.createElement('div');
  locationLabel.className = 'filter-label';
  locationLabel.textContent = 'Filter by location';
  eventsFilters.appendChild(locationLabel);

  const locationCheckboxes = document.createElement('div');
  locationCheckboxes.className = 'location-checkboxes';
  locationCheckboxes.setAttribute('role', 'group');
  locationCheckboxes.setAttribute('aria-label', 'Event location filter');

  const locations = new Set();
  state.data.events.forEach((e) => {
    const loc = getEventLocationLabel(e);
    if (loc) locations.add(loc);
  });

  Array.from(locations)
    .sort()
    .forEach((loc) => {
      const locLabel = document.createElement('label');
      const locInput = document.createElement('input');
      locInput.type = 'checkbox';
      locInput.value = loc;
      locInput.addEventListener('change', () => {
        state.filters.eventLocations = Array.from(
          locationCheckboxes.querySelectorAll('input:checked')
        ).map((inp) => inp.value);
        state.currentPage = 1;
        renderResults();
      });
      locLabel.appendChild(locInput);
      locLabel.appendChild(document.createTextNode(loc));
      locationCheckboxes.appendChild(locLabel);
    });

  eventsFilters.appendChild(locationCheckboxes);
  filterBar.appendChild(eventsFilters);

  // Blogs filters
  const blogsFilters = document.createElement('div');
  blogsFilters.className = 'filter-group hidden';
  blogsFilters.setAttribute('data-tab', 'blogs');

  const blogCategorySelect = document.createElement('select');
  blogCategorySelect.className = 'filter-select';
  blogCategorySelect.id = 'blogs-category';
  blogCategorySelect.addEventListener('change', (e) => {
    state.filters.blogCategory = e.target.value;
    state.currentPage = 1;
    renderResults();
  });

  const blogCategoryOption = document.createElement('option');
  blogCategoryOption.value = '';
  blogCategoryOption.textContent = 'All Categories';
  blogCategorySelect.appendChild(blogCategoryOption);

  // Populate blog categories
  const blogCategories = new Set();
  state.data.blogs.forEach((b) => {
    if (b.category) blogCategories.add(b.category);
  });
  Array.from(blogCategories)
    .sort()
    .forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      blogCategorySelect.appendChild(opt);
    });

  blogsFilters.appendChild(blogCategorySelect);

  const authorSearchInput = document.createElement('input');
  authorSearchInput.type = 'text';
  authorSearchInput.className = 'filter-input';
  authorSearchInput.placeholder = 'Search by author';
  authorSearchInput.addEventListener('change', (e) => {
    state.filters.blogAuthor = e.target.value;
    state.currentPage = 1;
    renderResults();
  });
  blogsFilters.appendChild(authorSearchInput);

  const blogSortSelect = document.createElement('select');
  blogSortSelect.className = 'filter-select';
  blogSortSelect.id = 'blogs-sort';
  blogSortSelect.addEventListener('change', (e) => {
    state.filters.blogSort = e.target.value;
    state.currentPage = 1;
    renderResults();
  });

  const newestOpt = document.createElement('option');
  newestOpt.value = 'newest';
  newestOpt.textContent = 'Newest';
  blogSortSelect.appendChild(newestOpt);

  const oldestOpt = document.createElement('option');
  oldestOpt.value = 'oldest';
  oldestOpt.textContent = 'Oldest';
  blogSortSelect.appendChild(oldestOpt);

  blogsFilters.appendChild(blogSortSelect);
  filterBar.appendChild(blogsFilters);

  // Creators filters
  const creatorsFilters = document.createElement('div');
  creatorsFilters.className = 'filter-group hidden';
  creatorsFilters.setAttribute('data-tab', 'creators');

  const creatorSortSelect = document.createElement('select');
  creatorSortSelect.className = 'filter-select';
  creatorSortSelect.id = 'creators-sort';
  creatorSortSelect.addEventListener('change', (e) => {
    state.filters.creatorSort = e.target.value;
    state.currentPage = 1;
    renderResults();
  });

  const nameAscOpt = document.createElement('option');
  nameAscOpt.value = 'name-asc';
  nameAscOpt.textContent = 'Name A-Z';
  creatorSortSelect.appendChild(nameAscOpt);

  const nameDescOpt = document.createElement('option');
  nameDescOpt.value = 'name-desc';
  nameDescOpt.textContent = 'Name Z-A';
  creatorSortSelect.appendChild(nameDescOpt);

  creatorsFilters.appendChild(creatorSortSelect);
  filterBar.appendChild(creatorsFilters);

  wrapper.appendChild(filterBar);

  // Results grid
  const resultsGrid = document.createElement('div');
  resultsGrid.className = 'results-grid';
  wrapper.appendChild(resultsGrid);

  // Pagination
  const pagination = document.createElement('div');
  pagination.className = 'pagination';

  const prevButton = document.createElement('button');
  prevButton.type = 'button';
  prevButton.className = 'btn btn-ghost';
  prevButton.id = 'tab-prev';
  prevButton.textContent = 'Prev';
  prevButton.addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage -= 1;
      renderResults();
    }
  });

  const paginationInfo = document.createElement('span');
  paginationInfo.className = 'pagination__info';

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'btn btn-ghost';
  nextButton.id = 'tab-next';
  nextButton.textContent = 'Next';
  nextButton.addEventListener('click', () => {
    state.currentPage += 1;
    renderResults();
  });

  pagination.append(prevButton, paginationInfo, nextButton);
  wrapper.appendChild(pagination);

  // Append wrapper to block
  block.appendChild(wrapper);

  /**
   * Switch to a different tab
   */
  function switchTab(tabId) {
    state.activeTab = tabId;
    state.currentPage = 1;

    // Update button states
    Object.entries(tabButtonElements).forEach(([id, btn]) => {
      const isActive = id === tabId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Toggle filter visibility
    filterBar.querySelectorAll('.filter-group').forEach((group) => {
      const groupTab = group.getAttribute('data-tab');
      group.classList.toggle('hidden', groupTab !== tabId);
    });

    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    window.history.replaceState({}, '', url);

    renderResults();
  }

  /**
   * Render results based on active tab and filters
   */
  function renderResults() {
    const searchTerm = state.searchTerm;
    resultsGrid.textContent = '';

    let results = [];

    if (state.activeTab === 'events') {
      results = filterEvents(state.data.events, searchTerm, state.filters);
    } else if (state.activeTab === 'blogs') {
      results = filterBlogs(state.data.blogs, searchTerm, state.filters);
    } else if (state.activeTab === 'creators') {
      results = filterCreators(state.data.creators, searchTerm, state.filters);
    }

    if (results.length === 0) {
      pagination.hidden = true;
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.textContent = `No ${state.activeTab} found matching your search.`;
      resultsGrid.appendChild(emptyState);
      return;
    }

    const totalPages = Math.ceil(results.length / PAGE_SIZE);
    if (state.currentPage > totalPages) {
      state.currentPage = totalPages;
    }

    const pageItems = results.slice((state.currentPage - 1) * PAGE_SIZE, state.currentPage * PAGE_SIZE);

    pagination.hidden = totalPages <= 1;
    prevButton.disabled = state.currentPage === 1;
    nextButton.disabled = state.currentPage === totalPages;
    paginationInfo.textContent = `Page ${state.currentPage} of ${totalPages} (${results.length} results)`;

    pageItems.forEach((item) => {
      let card;
      if (state.activeTab === 'events') {
        card = buildEventCard(item);
      } else if (state.activeTab === 'blogs') {
        card = buildBlogCard(item);
      } else if (state.activeTab === 'creators') {
        card = buildCreatorCard(item);
      }
      if (card) resultsGrid.appendChild(card);
    });

    initRevealObserver();
  }

  // Debounced search handler
  const handleSearch = debounce((value) => {
    state.searchTerm = value;
    state.currentPage = 1;
    renderResults();
  }, 300);

  // Search input event listener
  searchInput.addEventListener('input', (e) => {
    handleSearch(e.target.value);
  });

  // Read initial tab from URL
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  if (tabParam && ['events', 'blogs', 'creators'].includes(tabParam)) {
    switchTab(tabParam);
  } else {
    renderResults();
  }
}
