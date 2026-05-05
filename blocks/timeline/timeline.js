/**
 * AdobeSphere timeline block — Platform Journey ribbon.
 *
 * Authoring contract: each row is one milestone.
 *   col 1 = title (e.g. "Ideation & Vision")
 *   col 2 = date  (e.g. "Apr 09, 2026")
 *   col 3 = bullet points authored as a UL — each <li> becomes a separate line.
 *
 * Layout: horizontally scrollable ribbon of cards, each connected by a red dot.
 * On mobile, cards stack vertically into a single column.
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

  const track = document.createElement('div');
  track.className = 'timeline-track';
  track.setAttribute('role', 'list');

  milestones.forEach((m) => {
    const article = document.createElement('article');
    article.className = 'timeline-item reveal';
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
        <span class="timeline-dot" aria-hidden="true"></span>
      </div>`;
    track.append(article);
  });

  block.append(track);
}
