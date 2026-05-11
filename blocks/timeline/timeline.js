const SPEED = 0.4;
const FADE_MS = 280;

// Builds a single timeline card article from a milestone object.
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

// Decorates the timeline block with an auto-scrolling progress-bar ribbon.
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
  milestones.forEach((m) => track.append(buildCard(m)));
  wrap.append(track);

  block.append(progressWrap, wrap);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  let pos = 0;
  let paused = false;
  let resetting = false;
  let scrubbing = false;
  let rafId = null;
  let inView = false;

  // Returns the maximum scrollable distance for the track.
  const getMax = () => Math.max(0, wrap.scrollWidth - wrap.clientWidth);

  // Updates the progress bar width and thumb position from the current scroll position.
  const setProgress = (p, max) => {
    const pct = max > 0 ? Math.min(p / max, 1) * 100 : 0;
    progressBar.style.width = `${pct}%`;
    thumb.style.left = `${pct}%`;
    progressWrap.setAttribute('aria-valuenow', String(Math.round(pct)));
  };

  // Fades the track out, resets scroll to the start, then fades back in.
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

  // Advances the scroll position by SPEED px per frame and loops at the end.
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
    if (inView) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  };

  // Starts the rAF loop if not already running.
  const startScroll = () => {
    if (!rafId) rafId = requestAnimationFrame(tick);
  };

  // Seeks the track to the position corresponding to a pointer x-coordinate.
  const scrubTo = (clientX) => {
    const rect = progressWrap.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const max = getMax();
    pos = pct * max;
    wrap.scrollLeft = pos;
    setProgress(pos, max);
  };

  // Begins a scrub operation and pauses auto-scroll.
  const startScrub = (clientX) => {
    scrubbing = true;
    paused = true;
    progressWrap.classList.add('scrubbing');
    scrubTo(clientX);
  };

  // Ends a scrub operation and resumes auto-scroll after a short delay.
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
