/**
 * AdobeSphere timeline block — Platform Journey auto-scroll ribbon.
 *
 * Authoring contract: each row is one milestone.
 *   col 1 = title  (e.g. "Ideation & Vision")
 *   col 2 = date   (e.g. "Apr 09, 2026")
 *   col 3 = bullet points authored as a UL — each <li> becomes a separate line.
 *
 * Behaviour:
 *   - Auto-scrolls left at a constant speed via requestAnimationFrame.
 *   - On reaching the last card the track fades out, resets to the first
 *     card, then fades back in — a clean chapter-restart (not an infinite
 *     duplicate-card marquee).
 *   - A red progress bar above the track fills from 0 → 100% each pass.
 *   - Hover / focus / touch pauses the animation.
 *   - prefers-reduced-motion: static horizontal scroller, no animation.
 */

const SPEED = 1.5; // px per requestAnimationFrame tick (~90 px/s at 60 fps)
const FADE_MS = 280; // opacity transition duration (ms) for loop reset

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
  const progressWrap = document.createElement('div');
  progressWrap.className = 'timeline-progress-wrap';
  progressWrap.setAttribute('aria-hidden', 'true');

  const progressBar = document.createElement('div');
  progressBar.className = 'timeline-progress-bar';
  progressWrap.append(progressBar);

  // ── Scrollable track wrapper ──────────────────────────────────────────
  const wrap = document.createElement('div');
  wrap.className = 'timeline-track-wrap';

  const track = document.createElement('div');
  track.className = 'timeline-track';
  track.setAttribute('role', 'list');
  track.setAttribute('aria-label', 'Platform journey milestones');
  milestones.forEach((m) => track.append(buildCard(m)));
  wrap.append(track);

  block.append(progressWrap, wrap);

  // ── Reduced-motion: static list, no JS animation ──────────────────────
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  // ── Auto-scroll state ─────────────────────────────────────────────────
  let pos = 0;
  let paused = false;
  let resetting = false;

  const getMax = () => Math.max(0, wrap.scrollWidth - wrap.clientWidth);

  const setProgress = (p, max) => {
    progressBar.style.width = `${max > 0 ? Math.min(p / max, 1) * 100 : 0}%`;
  };

  const resetLoop = () => {
    resetting = true;
    wrap.style.opacity = '0';
    setTimeout(() => {
      pos = 0;
      wrap.scrollLeft = 0;
      setProgress(0, getMax());
      wrap.style.opacity = '1';
      // Brief buffer so the fade-in starts before we resume ticking.
      setTimeout(() => { resetting = false; }, 50);
    }, FADE_MS);
  };

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

  // ── Pause on hover / focus ────────────────────────────────────────────
  wrap.addEventListener('mouseenter', () => { paused = true; });
  wrap.addEventListener('mouseleave', () => { paused = false; });
  wrap.addEventListener('focusin', () => { paused = true; });
  wrap.addEventListener('focusout', () => { paused = false; });

  // ── Pause on touch; resume after 1 s of inactivity ───────────────────
  wrap.addEventListener('touchstart', () => { paused = true; }, { passive: true });
  wrap.addEventListener('touchend', () => {
    setTimeout(() => {
      pos = wrap.scrollLeft; // sync pos with where the user left it
      paused = false;
    }, 1000);
  }, { passive: true });

  // Keep progress bar in sync with manual touch-scroll.
  wrap.addEventListener('scroll', () => {
    setProgress(wrap.scrollLeft, getMax());
  }, { passive: true });

  requestAnimationFrame(tick);
}
