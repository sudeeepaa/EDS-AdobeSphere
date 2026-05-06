/**
 * AdobeSphere marquee block — auto-scrolling category pill row.
 *
 * Authoring contract: each row is a pill. Each row's first cell is the label,
 * the second (optional) cell is `tab=events&category=Workshops` query string.
 *
 * Default behaviour: pills are scrolled left at a constant rate. Hover/focus
 * pauses the animation. Reduced-motion users get a regular horizontal scroller.
 */

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

function pillHref(p) {
  if (!p.params) return '/explore';
  if (p.params.startsWith('?') || p.params.startsWith('/')) return p.params.startsWith('/') ? p.params : `/explore${p.params}`;
  return `/explore?${p.params}`;
}

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

  // Mark the pill whose params match the current URL on load
  const currentParams = new URLSearchParams(window.location.search);

  pills.forEach((p, i) => {
    const a = document.createElement('a');
    a.href = pillHref(p);
    a.dataset.label = p.label;
    a.textContent = p.label;

    // Check if this pill matches the current URL state
    const pillParams = new URLSearchParams(p.params);
    const isActive = pillParams.get('tab') === currentParams.get('tab')
      && (pillParams.get('category') || '') === (currentParams.get('category') || '');
    a.className = `marquee-pill${(isActive || i === 0 && !currentParams.get('tab')) ? ' active' : ''}`;

    // In-page filter when already on /explore; full nav otherwise
    a.addEventListener('click', (e) => {
      if (!isExplore) return; // let normal anchor navigation happen
      e.preventDefault();

      const params = new URLSearchParams(p.params);
      const tab = params.get('tab') || 'events';
      const category = params.get('category') || '';

      // Update URL
      const url = new URL(window.location);
      url.searchParams.set('tab', tab);
      if (category) url.searchParams.set('category', category);
      else url.searchParams.delete('category');
      window.history.replaceState({}, '', url);

      // Switch tab
      window.dispatchEvent(new CustomEvent('adobesphere:switchtab', { detail: tab }));

      // Apply filter to the matching cards block
      const filterState = tab === 'events'
        ? { category, location: [], date: 'all' }
        : tab === 'blogs'
          ? { category, author: '', sort: 'newest' }
          : { designation: [], sort: 'name-asc' };

      window.dispatchEvent(new CustomEvent('adobesphere:filter', {
        detail: { source: tab, state: filterState },
      }));

      // Update active pill across both the real row and the aria-hidden clone
      wrap.querySelectorAll('.marquee-pill').forEach((pill) => {
        pill.classList.toggle('active', pill.dataset.label === p.label);
      });
    });

    row.append(a);
  });
  wrap.append(row);

  // Duplicate for seamless animation, unless user prefers reduced motion.
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) {
    const clone = row.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    [...clone.children].forEach((c) => c.setAttribute('tabindex', '-1'));
    wrap.append(clone);
  }

  block.append(wrap);
}