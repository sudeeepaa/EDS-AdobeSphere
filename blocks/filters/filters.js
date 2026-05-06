/**
 * AdobeSphere — filters block.
 *
 * A standalone block that renders filter controls for the cards block
 * on the Explore page. It reads its configuration from authored rows
 * and communicates with the adjacent cards block via a custom event.
 *
 * Authoring format in da.live:
 * ┌─────────────────────────────────────────────────────┐
 * │ filters (events)                                    │
 * ├──────────────────────┬──────────────────────────────┤
 * │ Source               │ events                       │
 * ├──────────────────────┼──────────────────────────────┤
 * │ Category Filter      │ true                         │
 * ├──────────────────────┼──────────────────────────────┤
 * │ Date Filter          │ true                         │
 * ├──────────────────────┼──────────────────────────────┤
 * │ Location Filter      │ true                         │
 * └──────────────────────┴──────────────────────────────┘
 *
 * For blogs:
 * ┌─────────────────────────────────────────────────────┐
 * │ filters (blogs)                                     │
 * ├──────────────────────┬──────────────────────────────┤
 * │ Source               │ blogs                        │
 * ├──────────────────────┼──────────────────────────────┤
 * │ Category Filter      │ true                         │
 * ├──────────────────────┼──────────────────────────────┤
 * │ Author Filter        │ true                         │
 * ├──────────────────────┼──────────────────────────────┤
 * │ Sort                 │ true                         │
 * └──────────────────────┴──────────────────────────────┘
 *
 * For creators:
 * ┌─────────────────────────────────────────────────────┐
 * │ filters (creators)                                  │
 * ├──────────────────────┬──────────────────────────────┤
 * │ Source               │ creators                     │
 * ├──────────────────────┼──────────────────────────────┤
 * │ Designation Filter   │ true                         │
 * ├──────────────────────┼──────────────────────────────┤
 * │ Sort                 │ true                         │
 * └──────────────────────┴──────────────────────────────┘
 *
 * The block fires `adobesphere:filter` with { source, state } whenever
 * any filter changes. The cards block listens for this event and re-renders.
 */

function escapeHtml(v) {
    return window.AdobeSphere.Utils.escapeHtml(v);
}

function uniqueValues(items, picker) {
    const seen = new Set();
    items.forEach((it) => {
        const v = picker(it);
        if (Array.isArray(v)) v.forEach((x) => x && seen.add(x));
        else if (v) seen.add(v);
    });
    return [...seen].sort((a, b) => String(a).localeCompare(String(b)));
}

// Smart defaults per source — every filter is ON unless the author
// explicitly overrides it with "false" in the da.live table.
const SOURCE_DEFAULTS = {
    events: { category_filter: 'true', date_filter: 'true', location_filter: 'true' },
    blogs: { category_filter: 'true', author_filter: 'true', sort: 'true' },
    creators: { designation_filter: 'true', sort: 'true' },
};

function readConfig(block) {
    const cfg = {};
    [...block.children].forEach((row) => {
        if (row.children.length !== 2) return;
        const key = row.children[0].textContent.trim().toLowerCase().replace(/\s+/g, '_');
        const val = row.children[1].textContent.trim().toLowerCase();
        cfg[key] = val;
        row.remove();
    });
    // Apply per-source defaults for any key not explicitly authored
    const src = cfg.source || 'events';
    const defaults = SOURCE_DEFAULTS[src] || {};
    Object.keys(defaults).forEach((k) => { if (!(k in cfg)) cfg[k] = defaults[k]; });
    return cfg;
}

function dispatchFilter(source, state) {
    window.dispatchEvent(new CustomEvent('adobesphere:filter', {
        detail: { source, state },
    }));
}

export default async function decorate(block) {
    const cfg = readConfig(block);
    const source = cfg.source || 'events';

    // Load data to populate dynamic options (categories, locations, designations)
    const dataFile = source === 'events' ? 'campaigns' : source;
    const data = await window.AdobeSphere.Utils.fetchData(dataFile);
    const items = Array.isArray(data) ? data : [];

    // Initial filter state — mirrors what cards.js uses internally
    const state = source === 'events'
        ? { category: '', location: [], date: 'all' }
        : source === 'blogs'
            ? { category: '', author: '', sort: 'newest' }
            : { designation: [], sort: 'name-asc' };

    // Restore state from URL params so direct links like
    // /explore?tab=blogs&category=AI%20%26%20Emerging%20Technology work
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('category')) state.category = urlParams.get('category');
    if (urlParams.get('sort')) state.sort = urlParams.get('sort');
    if (urlParams.get('date')) state.date = urlParams.get('date');

    // Track whether this block's tab is currently active
    let isActive = false;

    // Find which tab panel this block belongs to
    const findTabPanel = () => {
        let parent = block.closest('.section');
        while (parent) {
            if (parent.id && parent.id.startsWith('tabpanel-')) {
                return parent;
            }
            parent = parent.nextElementSibling;
        }
        return null;
    };

    const tabPanel = findTabPanel();
    const getActiveTab = () => {
        if (tabPanel) {
            return tabPanel.id.replace('tabpanel-', '');
        }
        return null;
    };

    const updateVisibility = () => {
        const activeTab = getActiveTab();
        isActive = activeTab === source;
        
        if (isActive) {
            // When this tab becomes active, dispatch initial state
            dispatchFilter(source, { ...state });
        }
    };

    function render() {
        block.innerHTML = '';

        if (source === 'events') {
            const cats = cfg.category_filter === 'true' ? uniqueValues(items, (e) => e.category) : [];
            const cities = cfg.location_filter === 'true' ? uniqueValues(items, (e) => e.location && e.location.city) : [];

            if (cats.length) {
                const row = document.createElement('div');
                row.className = 'filter-row filter-row-full';
                const sel = document.createElement('select');
                sel.className = 'form-input';
                sel.dataset.filter = 'category';
                sel.innerHTML = `<option value="">All Categories</option>${cats.map((c) => `<option value="${escapeHtml(c)}"${state.category === c ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('')}`;
                sel.addEventListener('change', (e) => { state.category = e.target.value; state.page = 1; dispatchFilter(source, { ...state }); });
                row.append(sel);
                block.append(row);
            }

            if (cfg.date_filter === 'true') {
                const row = document.createElement('div');
                row.className = 'filter-row filter-row-split';
                const fs = document.createElement('fieldset');
                fs.className = 'filter-radios';
                fs.setAttribute('aria-label', 'Date');
                fs.innerHTML = `
          <label><input type="radio" name="filter-date-${source}" value="all"${state.date === 'all' ? ' checked' : ''}> All</label>
          <label><input type="radio" name="filter-date-${source}" value="upcoming"${state.date === 'upcoming' ? ' checked' : ''}> Upcoming</label>
          <label><input type="radio" name="filter-date-${source}" value="past"${state.date === 'past' ? ' checked' : ''}> Past</label>`;
                fs.querySelectorAll('input').forEach((r) => r.addEventListener('change', (e) => { state.date = e.target.value; dispatchFilter(source, { ...state }); }));

                const clearBtn = document.createElement('button');
                clearBtn.type = 'button';
                clearBtn.className = 'button ghost filter-clear';
                clearBtn.textContent = 'Clear Filters';
                clearBtn.addEventListener('click', () => {
                    Object.assign(state, { category: '', location: [], date: 'all' });
                    render();
                    dispatchFilter(source, { ...state });
                });

                row.append(fs, clearBtn);
                block.append(row);
            }

            if (cities.length) {
                const row = document.createElement('div');
                row.className = 'filter-row filter-row-full';
                const fs = document.createElement('fieldset');
                fs.className = 'filter-checkboxes';
                fs.setAttribute('aria-label', 'Location');
                const legend = document.createElement('legend');
                legend.textContent = 'Filter by location';
                const grid = document.createElement('div');
                grid.className = 'filter-checkbox-grid';
                grid.innerHTML = cities.map((c) => `<label><input type="checkbox" value="${escapeHtml(c)}"${state.location.includes(c) ? ' checked' : ''}> ${escapeHtml(c)}</label>`).join('');
                grid.querySelectorAll('input').forEach((cb) => cb.addEventListener('change', () => {
                    state.location = [...grid.querySelectorAll('input:checked')].map((x) => x.value);
                    dispatchFilter(source, { ...state });
                }));
                fs.append(legend, grid);
                row.append(fs);
                block.append(row);
            }
        }

        if (source === 'blogs') {
            const cats = cfg.category_filter === 'true' ? uniqueValues(items, (b) => b.category) : [];

            const row = document.createElement('div');
            row.className = 'filter-row filter-row-split';

            if (cats.length) {
                const sel = document.createElement('select');
                sel.className = 'form-input';
                sel.dataset.filter = 'category';
                sel.innerHTML = `<option value="">All Categories</option>${cats.map((c) => `<option value="${escapeHtml(c)}"${state.category === c ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('')}`;
                sel.addEventListener('change', (e) => { state.category = e.target.value; dispatchFilter(source, { ...state }); });
                row.append(sel);
            }

            if (cfg.author_filter === 'true') {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'form-input';
                input.placeholder = 'Search by author';
                input.dataset.filter = 'author';
                input.value = state.author || '';
                input.addEventListener('input', (e) => { state.author = e.target.value; dispatchFilter(source, { ...state }); });
                row.append(input);
            }

            if (cfg.sort === 'true') {
                const sel = document.createElement('select');
                sel.className = 'form-input';
                sel.dataset.filter = 'sort';
                sel.innerHTML = `<option value="newest"${state.sort === 'newest' ? ' selected' : ''}>Newest</option><option value="oldest"${state.sort === 'oldest' ? ' selected' : ''}>Oldest</option>`;
                sel.addEventListener('change', (e) => { state.sort = e.target.value; dispatchFilter(source, { ...state }); });
                row.append(sel);
            }

            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'button ghost filter-clear';
            clearBtn.textContent = 'Clear Filters';
            clearBtn.addEventListener('click', () => {
                Object.assign(state, { category: '', author: '', sort: 'newest' });
                render();
                dispatchFilter(source, { ...state });
            });
            row.append(clearBtn);
            block.append(row);
        }

        if (source === 'creators') {
            const designations = cfg.designation_filter === 'true' ? uniqueValues(items, (c) => c.designation) : [];

            const row = document.createElement('div');
            row.className = 'filter-row filter-row-split';

            if (cfg.sort === 'true') {
                const sel = document.createElement('select');
                sel.className = 'form-input';
                sel.dataset.filter = 'sort';
                sel.innerHTML = `
          <option value="name-asc"${state.sort === 'name-asc' ? ' selected' : ''}>Name A–Z</option>
          <option value="name-desc"${state.sort === 'name-desc' ? ' selected' : ''}>Name Z–A</option>
          <option value="testimonials"${state.sort === 'testimonials' ? ' selected' : ''}>Testimonials</option>`;
                sel.addEventListener('change', (e) => { state.sort = e.target.value; dispatchFilter(source, { ...state }); });
                row.append(sel);
            }

            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'button ghost filter-clear';
            clearBtn.textContent = 'Clear Filters';
            clearBtn.addEventListener('click', () => {
                Object.assign(state, { designation: [], sort: 'name-asc' });
                render();
                dispatchFilter(source, { ...state });
            });
            row.append(clearBtn);
            block.append(row);

            if (designations.length) {
                const row2 = document.createElement('div');
                row2.className = 'filter-row filter-row-full';
                const fs = document.createElement('fieldset');
                fs.className = 'filter-checkboxes';
                fs.setAttribute('aria-label', 'Designation');
                const legend = document.createElement('legend');
                legend.textContent = 'Filter by designation';
                const grid = document.createElement('div');
                grid.className = 'filter-checkbox-grid';
                grid.innerHTML = designations.map((d) => `<label><input type="checkbox" value="${escapeHtml(d)}"${state.designation.includes(d) ? ' checked' : ''}> ${escapeHtml(d)}</label>`).join('');
                grid.querySelectorAll('input').forEach((cb) => cb.addEventListener('change', () => {
                    state.designation = [...grid.querySelectorAll('input:checked')].map((x) => x.value);
                    dispatchFilter(source, { ...state });
                }));
                fs.append(legend, grid);
                row2.append(fs);
                block.append(row2);
            }
        }
    }

    render();
    updateVisibility();

    // Listen for tab changes — re-render and dispatch state when this tab becomes active
    window.addEventListener('adobesphere:switchtab', (e) => {
        const newTab = e.detail;
        if (newTab === source && !isActive) {
            isActive = true;
            render();
            dispatchFilter(source, { ...state });
        } else if (newTab !== source && isActive) {
            isActive = false;
        }
    });

    // Fire initial state so cards block syncs on load (e.g. URL has ?category=…)
    if (isActive) {
        dispatchFilter(source, { ...state });
    }
}