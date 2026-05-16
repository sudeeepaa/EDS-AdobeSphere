/*
 * AdobeSphere — marquee block.
 *
 * Variants:
 *   - default (no extra class): auto-scrolling category pills. Authored rows
 *     declare the data SOURCES (not the categories themselves); the JS fetches
 *     each source, dedups its `category` field, and renders a pill per value.
 *     Authored row shape: [label] | [source]
 *       label  — free-text description, shown only in DA.live (ignored by JS).
 *       source — JSON file name under /scripts/data/, without `.json`.
 *     Example:
 *       | marquee                              |
 *       | Blog Categories   | blogs            |
 *       | Event Categories  | campaigns        |
 *     An `All` pill (→ /explore?tab=events) is always prepended.
 *
 *   - `marquee (timeline)`: horizontal milestone ribbon with a draggable
 *     progress bar. Authored row shape: [title] | [date] | [bullets].
 */

// Maps a data-source name to the /explore tab name it should filter.
const SOURCE_TO_TAB = { blogs: 'blogs', campaigns: 'events', creators: 'creators' };

// ─── shared helpers ─────────────────────────────────────────────────────────

// Returns the unique non-empty values for the given key across a list of items.
function uniqueValues(items, key) {
  const seen = new Set();
  (items || []).forEach((it) => {
    const v = it && it[key];
    if (v) seen.add(v);
  });
  return [...seen].sort((a, b) => String(a).localeCompare(String(b)));
}

// ─── pills variant ──────────────────────────────────────────────────────────

// Reads source-declaration rows from the block. Each row is [label, source];
// `label` is documentation for the author, `source` is the JSON file (no extension).
function readSources(block) {
  const sources = [];
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const source = (cells[1] ? cells[1].textContent : cells[0] ? cells[0].textContent : '')
      .trim().replace(/\.json$/i, '');
    if (source) sources.push(source);
  });
  return sources;
}

// Fetches each declared source and assembles the pill list: "All" first, then
// one alphabetical group per source, in the order the rows are authored.
async function fetchPillList(block) {
  const { Utils } = window.AdobeSphere;
  const sources = readSources(block);

  // Fallback if the author left the block empty.
  const effective = sources.length ? sources : ['blogs', 'campaigns'];

  const results = await Promise.all(
    effective.map((src) => Utils.fetchData(src).catch(() => null)),
  );

  const pills = [{ label: 'All', params: 'tab=events' }];
  effective.forEach((src, i) => {
    const tab = SOURCE_TO_TAB[src] || src;
    uniqueValues(results[i], 'category').forEach((c) => {
      pills.push({ label: c, params: `tab=${tab}&category=${encodeURIComponent(c)}` });
    });
  });
  return pills;
}

// Builds the /explore href for a given pill.
function pillHref(p) {
  if (!p.params) return '/explore';
  if (p.params.startsWith('/')) return p.params;
  if (p.params.startsWith('?')) return `/explore${p.params}`;
  return `/explore?${p.params}`;
}

// Builds a single pill anchor element with its click handler.
function buildPill(p, i, ctx) {
  const a = document.createElement('a');
  a.href = pillHref(p);
  a.dataset.label = p.label;
  a.textContent = p.label;

  const pillParams = new URLSearchParams(p.params);
  const isActive = pillParams.get('tab') === ctx.currentParams.get('tab')
    && (pillParams.get('category') || '') === (ctx.currentParams.get('category') || '');
  a.className = `marquee-pill${(isActive || (i === 0 && !ctx.currentParams.get('tab'))) ? ' active' : ''}`;

  a.addEventListener('click', (e) => {
    if (!ctx.isExplore) return;
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

    ctx.wrap.querySelectorAll('.marquee-pill').forEach((pill) => {
      pill.classList.toggle('active', pill.dataset.label === p.label);
    });
  });

  return a;
}

// Renders the default pills variant.
async function hydratePills(block) {
  // Resolve pills BEFORE clearing the block — fetchPillList reads the authored
  // source rows from block.children.
  const pills = await fetchPillList(block);

  block.textContent = '';

  if (!pills.length) {
    block.innerHTML = '<p class="marquee-empty">No categories available.</p>';
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'marquee-track';
  wrap.setAttribute('role', 'region');
  wrap.setAttribute('aria-label', 'Category quick filter');

  const row = document.createElement('div');
  row.className = 'marquee-pills';
  row.setAttribute('role', 'tablist');

  const ctx = {
    wrap,
    isExplore: window.location.pathname.startsWith('/explore'),
    currentParams: new URLSearchParams(window.location.search),
  };

  pills.forEach((p, i) => row.append(buildPill(p, i, ctx)));
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

// ─── timeline variant ───────────────────────────────────────────────────────

const TIMELINE_SPEED = 0.4;
const TIMELINE_FADE_MS = 280;

// Builds a single timeline card article from a milestone object.
function buildTimelineCard(m) {
  const article = document.createElement('article');
  article.className = 'timeline-item';
  article.setAttribute('role', 'listitem');

  const card = document.createElement('div');
  card.className = 'timeline-card';

  const header = document.createElement('header');
  header.className = 'timeline-header';

  const h3 = document.createElement('h3');
  h3.textContent = m.title;

  const time = document.createElement('time');
  time.textContent = m.date;

  header.append(h3, time);

  const ul = document.createElement('ul');
  ul.className = 'timeline-bullets';
  m.bullets.forEach((b) => {
    const li = document.createElement('li');
    li.textContent = b;
    ul.append(li);
  });

  card.append(header, ul);
  article.append(card);
  return article;
}

// Reads milestones from authored rows: [title] | [date] | [bullets].
function readMilestones(block) {
  const milestones = [];
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const title = cells[0] ? cells[0].textContent.trim() : '';
    const date = cells[1] ? cells[1].textContent.trim() : '';
    const bulletsHost = cells[2];
    let bullets = [];
    if (bulletsHost) {
      const lis = bulletsHost.querySelectorAll('li');
      bullets = lis.length
        ? [...lis].map((li) => li.textContent.trim())
        : bulletsHost.textContent.split('\n').map((s) => s.trim()).filter(Boolean);
    }
    if (title || date || bullets.length) milestones.push({ title, date, bullets });
  });
  return milestones;
}

// Wires interactive scrub/keyboard/scroll behaviors for the timeline.
function attachTimelineInteractions(block, els) {
  const { progressWrap, progressBar, thumb, wrap } = els;

  let pos = 0;
  let paused = false;
  let resetting = false;
  let scrubbing = false;
  let rafId = null;
  let inView = false;

  const getMax = () => Math.max(0, wrap.scrollWidth - wrap.clientWidth);

  const setProgress = (p, max) => {
    const pct = max > 0 ? Math.min(p / max, 1) * 100 : 0;
    progressBar.style.width = `${pct}%`;
    thumb.style.left = `${pct}%`;
    progressWrap.setAttribute('aria-valuenow', String(Math.round(pct)));
  };

  const resetLoop = () => {
    resetting = true;
    wrap.style.opacity = '0';
    setTimeout(() => {
      pos = 0;
      wrap.scrollLeft = 0;
      setProgress(0, getMax());
      wrap.style.opacity = '1';
      setTimeout(() => { resetting = false; }, 50);
    }, TIMELINE_FADE_MS);
  };

  const tick = () => {
    if (!paused && !resetting) {
      const max = getMax();
      if (max > 0) {
        if (pos >= max) {
          resetLoop();
        } else {
          pos = Math.min(pos + TIMELINE_SPEED, max);
          wrap.scrollLeft = pos;
          setProgress(pos, max);
        }
      }
    }
    if (inView) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  };

  const startScroll = () => {
    if (!rafId) rafId = requestAnimationFrame(tick);
  };

  const scrubTo = (clientX) => {
    const rect = progressWrap.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const max = getMax();
    pos = pct * max;
    wrap.scrollLeft = pos;
    setProgress(pos, max);
  };

  const startScrub = (clientX) => {
    scrubbing = true;
    paused = true;
    progressWrap.classList.add('scrubbing');
    scrubTo(clientX);
  };

  const endScrub = () => {
    if (!scrubbing) return;
    scrubbing = false;
    progressWrap.classList.remove('scrubbing');
    setTimeout(() => { paused = false; }, 800);
  };

  progressWrap.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startScrub(e.clientX);
  });

  document.addEventListener('mousemove', (e) => {
    if (scrubbing) scrubTo(e.clientX);
  });

  document.addEventListener('mouseup', endScrub);

  progressWrap.addEventListener('touchstart', (e) => {
    startScrub(e.touches[0].clientX);
  }, { passive: true });

  progressWrap.addEventListener('touchmove', (e) => {
    if (scrubbing) scrubTo(e.touches[0].clientX);
  }, { passive: true });

  progressWrap.addEventListener('touchend', endScrub, { passive: true });

  progressWrap.addEventListener('keydown', (e) => {
    const max = getMax();
    if (max <= 0) return;
    const step = max * 0.1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      pos = Math.min(pos + step, max);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      pos = Math.max(pos - step, 0);
    } else {
      return;
    }
    wrap.scrollLeft = pos;
    setProgress(pos, max);
  });

  progressWrap.addEventListener('focus', () => { paused = true; });
  progressWrap.addEventListener('blur', () => {
    setTimeout(() => { if (!scrubbing) paused = false; }, 500);
  });

  wrap.addEventListener('mouseenter', () => { paused = true; });
  wrap.addEventListener('mouseleave', () => { if (!scrubbing) paused = false; });
  wrap.addEventListener('focusin', () => { paused = true; });
  wrap.addEventListener('focusout', () => { paused = false; });

  wrap.addEventListener('touchstart', () => { paused = true; }, { passive: true });
  wrap.addEventListener('touchend', () => {
    setTimeout(() => {
      pos = wrap.scrollLeft;
      paused = false;
    }, 1000);
  }, { passive: true });

  wrap.addEventListener('scroll', () => {
    setProgress(wrap.scrollLeft, getMax());
  }, { passive: true });

  const observer = new IntersectionObserver(
    (entries) => {
      inView = entries[0].isIntersecting;
      if (inView) startScroll();
    },
    { threshold: 0.25 },
  );
  observer.observe(block);
}

// Renders the timeline variant — milestone ribbon with progress bar.
function hydrateTimeline(block) {
  const milestones = readMilestones(block);
  block.textContent = '';

  if (!milestones.length) {
    const p = document.createElement('p');
    p.className = 'timeline-empty';
    p.textContent = 'No milestones authored yet.';
    block.append(p);
    return;
  }

  const progressWrap = document.createElement('div');
  progressWrap.className = 'timeline-progress-wrap';
  progressWrap.setAttribute('tabindex', '0');
  progressWrap.setAttribute('role', 'slider');
  progressWrap.setAttribute('aria-label', 'Journey progress — use arrow keys to seek');
  progressWrap.setAttribute('aria-valuenow', '0');
  progressWrap.setAttribute('aria-valuemin', '0');
  progressWrap.setAttribute('aria-valuemax', '100');

  const progressTrack = document.createElement('div');
  progressTrack.className = 'timeline-progress-track';

  const progressBar = document.createElement('div');
  progressBar.className = 'timeline-progress-bar';
  progressTrack.append(progressBar);

  const thumb = document.createElement('div');
  thumb.className = 'timeline-progress-thumb';
  thumb.setAttribute('aria-hidden', 'true');

  progressWrap.append(progressTrack, thumb);

  const wrap = document.createElement('div');
  wrap.className = 'timeline-track-wrap';

  const track = document.createElement('div');
  track.className = 'timeline-track';
  track.setAttribute('role', 'list');
  track.setAttribute('aria-label', 'Platform journey milestones');
  milestones.forEach((m) => track.append(buildTimelineCard(m)));
  wrap.append(track);

  block.append(progressWrap, wrap);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  attachTimelineInteractions(block, { progressWrap, progressBar, thumb, wrap });
}

// ─── entry point ────────────────────────────────────────────────────────────

// Dispatches to the correct hydration path based on the variant class.
export default async function decorate(block) {
  if (block.classList.contains('timeline')) {
    hydrateTimeline(block);
    return;
  }
  await hydratePills(block);
}
