// Reads pill label and query-string data from block rows.
function readPills(block) {
  const pills = [];
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const label = cells[0] ? cells[0].textContent.trim() : '';
    const params = cells[1] ? cells[1].textContent.trim() : '';
    if (label) pills.push({ label, params });
  });
  return pills;
}

// Builds the /explore href for a given pill.
function pillHref(p) {
  if (!p.params) return '/explore';
  if (p.params.startsWith('?') || p.params.startsWith('/')) return p.params.startsWith('/') ? p.params : `/explore${p.params}`;
  return `/explore?${p.params}`;
}

// Decorates the marquee block as an auto-scrolling category pill row.
export default function decorate(block) {
  const pills = readPills(block);
  block.textContent = '';

  if (!pills.length) {
    block.innerHTML = '<p class="marquee-empty">No categories configured.</p>';
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'marquee-track';
  wrap.setAttribute('role', 'region');
  wrap.setAttribute('aria-label', 'Category quick filter');

  const row = document.createElement('div');
  row.className = 'marquee-pills';
  row.setAttribute('role', 'tablist');

  const isExplore = window.location.pathname.startsWith('/explore');
  const currentParams = new URLSearchParams(window.location.search);

  pills.forEach((p, i) => {
    const a = document.createElement('a');
    a.href = pillHref(p);
    a.dataset.label = p.label;
    a.textContent = p.label;

    const pillParams = new URLSearchParams(p.params);
    const isActive = pillParams.get('tab') === currentParams.get('tab')
      && (pillParams.get('category') || '') === (currentParams.get('category') || '');
    a.className = `marquee-pill${(isActive || i === 0 && !currentParams.get('tab')) ? ' active' : ''}`;

    a.addEventListener('click', (e) => {
      if (!isExplore) return;
      e.preventDefault();

      const params = new URLSearchParams(p.params);
      const tab = params.get('tab') || 'events';
      const category = params.get('category') || '';

      const url = new URL(window.location);
      url.searchParams.set('tab', tab);
      if (category) url.searchParams.set('category', category);
      else url.searchParams.delete('category');
      window.history.replaceState({}, '', url);

      window.dispatchEvent(new CustomEvent('adobesphere:switchtab', { detail: tab }));

      const filterState = tab === 'events'
        ? { category, location: [], date: 'all' }
        : tab === 'blogs'
          ? { category, author: '', sort: 'newest' }
          : { designation: [], sort: 'name-asc' };

      window.dispatchEvent(new CustomEvent('adobesphere:filter', {
        detail: { source: tab, state: filterState },
      }));

      wrap.querySelectorAll('.marquee-pill').forEach((pill) => {
        pill.classList.toggle('active', pill.dataset.label === p.label);
      });
    });

    row.append(a);
  });
  wrap.append(row);

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) {
    const clone = row.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    [...clone.children].forEach((c) => c.setAttribute('tabindex', '-1'));
    wrap.append(clone);
  }

  block.append(wrap);
}
