/**
 * AdobeSphere timeline block — Platform Journey auto-scroll ribbon.
 *
 * Authoring contract: each row is one milestone.
 *   col 1 = title (e.g. "Ideation & Vision")
 *   col 2 = date  (e.g. "Apr 09, 2026")
 *   col 3 = bullet points authored as a UL — each <li> becomes a separate line.
 *
 * Layout: auto-scrolling horizontal ribbon (marquee style). Cards loop
 * seamlessly. Hover / focus pauses the animation.
 * Reduced-motion: static horizontally-scrollable list with no animation.
 */

function escapeHtml(v) { return window.AdobeSphere.Utils.escapeHtml(v); }

export default function decorate(block) {
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

  block.textContent = '';
  if (!milestones.length) {
    block.innerHTML = '<p class="timeline-empty">No milestones authored yet.</p>';
    return;
  }

  function buildCard(m) {
    const article = document.createElement('article');
    article.className = 'timeline-item';
    article.setAttribute('role', 'listitem');
    article.innerHTML = `
      <div class="timeline-card">
        <header class="timeline-header">
          <h3>${escapeHtml(m.title)}</h3>
          <time>${escapeHtml(m.date)}</time>
        </header>
        <ul class="timeline-bullets">
          ${m.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}
        </ul>
      </div>`;
    return article;
  }

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const wrap = document.createElement('div');
  wrap.className = 'timeline-track-wrap';

  const track = document.createElement('div');
  track.className = 'timeline-track';
  track.setAttribute('role', 'list');
  track.setAttribute('aria-label', 'Platform journey milestones');

  milestones.forEach((m) => track.append(buildCard(m)));

  wrap.append(track);

  // Seamless auto-scroll: duplicate the track so the loop is invisible.
  if (!reduceMotion) {
    const clone = track.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelectorAll('[role="listitem"]').forEach((el) => el.setAttribute('tabindex', '-1'));
    wrap.append(clone);
    wrap.classList.add('timeline-auto-scroll');
  }

  block.append(wrap);
}
