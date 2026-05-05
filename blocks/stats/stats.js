/**
 * AdobeSphere stats block — animated counters with optional CTA links.
 *
 * Authoring contract: each row is one stat.
 *   col 1 = label (Creators, Events, Blogs, …)
 *   col 2 = source (one of: creators | events | blogs | users) OR a literal number.
 *           When a source is given, the number is read live from the data layer.
 *           For `users` we count unique entries in `adobesphere_users` localStorage.
 *   col 3 (optional) = CTA link target (e.g. /explore?tab=creators)
 *   col 4 (optional) = CTA label (e.g. "View All Creators →")
 */

function escapeHtml(v) { return window.AdobeSphere.Utils.escapeHtml(v); }

function readRows(block) {
  const rows = [];
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    rows.push({
      label: cells[0] ? cells[0].textContent.trim() : '',
      source: cells[1] ? cells[1].textContent.trim() : '',
      href: cells[2] ? cells[2].textContent.trim() : '',
      cta: cells[3] ? cells[3].textContent.trim() : '',
    });
  });
  return rows;
}

async function resolveTarget(source) {
  if (!source) return 0;
  // Literal numbers pass through.
  const literal = parseInt(source, 10);
  if (!Number.isNaN(literal) && /^\d+$/.test(source.trim())) return literal;

  if (source === 'users') {
    try { return Object.keys(JSON.parse(localStorage.getItem('adobesphere_users') || '{}')).length; }
    catch { return 0; }
  }
  const file = source === 'events' ? 'campaigns' : source;
  const data = await window.AdobeSphere.Utils.fetchData(file);
  return Array.isArray(data) ? data.length : 0;
}

function countUp(el, target) {
  const duration = 1200;
  const start = performance.now();
  const from = 0;
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) ** 3;
    el.textContent = String(Math.round(from + (target - from) * eased));
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = String(target);
  };
  requestAnimationFrame(step);
}

export default async function decorate(block) {
  const rows = readRows(block);
  block.textContent = '';

  const grid = document.createElement('div');
  grid.className = 'stats-grid';
  block.append(grid);

  const tasks = rows.map(async (r) => {
    const target = await resolveTarget(r.source);
    const box = document.createElement('div');
    box.className = 'stats-box reveal';
    box.dataset.target = String(target);
    box.innerHTML = `
      <span class="stats-number">0</span>
      <p class="stats-label">${escapeHtml(r.label)}</p>
      ${r.href ? `<a class="stats-link" href="${escapeHtml(r.href)}">${escapeHtml(r.cta || 'View →')}</a>` : ''}`;
    grid.append(box);
    return { box, target };
  });

  const results = await Promise.all(tasks);

  // Animate when section enters the viewport.
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const box = e.target;
        const target = parseInt(box.dataset.target, 10) || 0;
        const numEl = box.querySelector('.stats-number');
        countUp(numEl, target);
        observer.unobserve(box);
      }
    });
  }, { threshold: 0.4 });

  results.forEach(({ box }) => observer.observe(box));
}
