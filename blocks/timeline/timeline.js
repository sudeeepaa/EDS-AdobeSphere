/**
 * AdobeSphere timeline block — Platform Journey auto-scroll ribbon.
 *
 * Authoring contract: each row is one milestone.
 *   col 1 = title  (e.g. "Ideation & Vision")
 *   col 2 = date   (e.g. "Apr 09, 2026")
 *   col 3 = bullet points authored as a UL — each <li> becomes a separate line.
 *
 * Progress bar:
 *   - Click anywhere on the bar to jump to that position.
 *   - Drag (mouse or touch) to scrub through the timeline.
 *   - Tab to the bar and use ← → arrow keys (10% steps) for keyboard access.
 *   - Hovering reveals a circular handle at the current position.
 *
 * Auto-scroll:
 *   - rAF-driven scrollLeft on the card wrapper (~90 px/s).
 *   - Reaches end → fade out → reset to start → fade in.
 *   - Pauses on hover / focus / touch / scrubbing.
 *
 * prefers-reduced-motion: static swipeable list, no animation, bar hidden.
 */

const SPEED = 1.5; // px per rAF tick ≈ 90 px/s at 60 fps
const FADE_MS = 280; // loop-reset opacity transition (ms)

function buildCard(m) {
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
    const p = document.createElement('p');
    p.className = 'timeline-empty';
    p.textContent = 'No milestones authored yet.';
    block.append(p);
    return;
  }

  // ── Progress bar ──────────────────────────────────────────────────────
  // Structure: progressWrap (clickable area) > progressTrack > progressBar
  //                                          > thumb (circle handle)
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

  // ── Scrollable card wrapper ───────────────────────────────────────────
  const wrap = document.createElement('div');
  wrap.className = 'timeline-track-wrap';

  const track = document.createElement('div');
  track.className = 'timeline-track';
  track.setAttribute('role', 'list');
  track.setAttribute('aria-label', 'Platform journey milestones');
  milestones.forEach((m) => track.append(buildCard(m)));
  wrap.append(track);

  block.append(progressWrap, wrap);

  // ── Reduced-motion: static list, no animation ─────────────────────────
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  // ── Shared state ──────────────────────────────────────────────────────
  let pos = 0;
  let paused = false;
  let resetting = false;
  let scrubbing = false;

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
    }, FADE_MS);
  };

  // ── rAF tick ──────────────────────────────────────────────────────────
  const tick = () => {
    if (!paused && !resetting) {
      const max = getMax();
      if (max > 0) {
        if (pos >= max) {
          resetLoop();
        } else {
          pos = Math.min(pos + SPEED, max);
          wrap.scrollLeft = pos;
          setProgress(pos, max);
        }
      }
    }
    requestAnimationFrame(tick);
  };

  // ── Scrub helpers ─────────────────────────────────────────────────────
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

  // ── Mouse: click to seek, drag to scrub ──────────────────────────────
  progressWrap.addEventListener('mousedown', (e) => {
    e.preventDefault(); // prevent text selection while dragging
    startScrub(e.clientX);
  });

  document.addEventListener('mousemove', (e) => {
    if (scrubbing) scrubTo(e.clientX);
  });

  document.addEventListener('mouseup', endScrub);

  // ── Touch: tap to seek, drag to scrub ────────────────────────────────
  progressWrap.addEventListener('touchstart', (e) => {
    startScrub(e.touches[0].clientX);
  }, { passive: true });

  progressWrap.addEventListener('touchmove', (e) => {
    if (scrubbing) scrubTo(e.touches[0].clientX);
  }, { passive: true });

  progressWrap.addEventListener('touchend', endScrub, { passive: true });

  // ── Keyboard: ← → arrow keys seek by 10% ─────────────────────────────
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

  // ── Card area: hover / focus pauses; touch syncs pos on resume ────────
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

  // Keep progress bar synced when user touch-scrolls the card area.
  wrap.addEventListener('scroll', () => {
    setProgress(wrap.scrollLeft, getMax());
  }, { passive: true });

  requestAnimationFrame(tick);
}
