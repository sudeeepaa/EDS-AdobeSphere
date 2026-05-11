// Delegates HTML escaping to the shared Utils helper.
function escapeHtml(v) { return window.AdobeSphere.Utils.escapeHtml(v); }

// Extracts or constructs an img element from an avatar cell.
function resolveAvatar(cell) {
  if (!cell) return null;
  const img = cell.querySelector('img');
  if (img) return img;
  const a = cell.querySelector('a[href]');
  if (a) {
    const newImg = document.createElement('img');
    newImg.src = window.AdobeSphere.Utils.normaliseAsset(a.href, '');
    newImg.alt = a.textContent.trim();
    newImg.loading = 'lazy';
    return newImg;
  }
  const text = cell.textContent.trim();
  if (text) {
    const newImg = document.createElement('img');
    newImg.src = window.AdobeSphere.Utils.normaliseAsset(text, '');
    newImg.alt = '';
    newImg.loading = 'lazy';
    return newImg;
  }
  return null;
}

// Decorates the mission block as a grid of contributor cards.
export default function decorate(block) {
  const rows = [...block.children];
  block.textContent = '';

  if (!rows.length) return;

  const grid = document.createElement('div');
  grid.className = 'mission-grid';

  rows.forEach((row) => {
    const cells = [...row.children];
    const card = document.createElement('article');
    card.className = 'mission-card reveal';

    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'mission-avatar';
    const avatar = resolveAvatar(cells[0]);
    if (avatar) avatarWrap.append(avatar);
    card.append(avatarWrap);

    const body = document.createElement('div');
    body.className = 'mission-body';
    if (cells[1]) {
      [...cells[1].children].forEach((el) => {
        const tag = el.tagName.toLowerCase();
        if ((tag === 'h2' || tag === 'h3' || tag === 'h4') && !el.className) {
          el.className = 'mission-name';
        } else if (tag === 'p' && !el.querySelector('a') && !el.className) {
          const prevSibling = el.previousElementSibling;
          if (prevSibling && prevSibling.classList.contains('mission-name') && !prevSibling.classList.contains('mission-designation-done')) {
            el.className = 'mission-role text-muted';
            prevSibling.classList.add('mission-designation-done');
          } else {
            el.className = 'mission-bio';
          }
        } else if (tag === 'div' || tag === 'p') {
          const links = el.querySelectorAll('a');
          if (links.length) el.className = 'mission-socials';
        }
        body.append(el);
      });
      if (!body.querySelector('.mission-name')) {
        const paras = [...body.children];
        if (paras[0]) paras[0].className = 'mission-name';
        if (paras[1]) paras[1].className = 'mission-role text-muted';
      }
    }
    card.append(body);
    grid.append(card);
  });

  block.append(grid);
}
