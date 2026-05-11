import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// Decorates the footer by loading the authored fragment and structuring columns.
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';

  let fragment;
  try {
    fragment = await loadFragment(footerPath);
  } catch {
    block.innerHTML = '<div class="footer-fallback"><p>© 2026 AdobeSphere.</p></div>';
    return;
  }

  block.textContent = '';
  const root = document.createElement('div');
  root.className = 'footer-inner';
  while (fragment.firstElementChild) root.append(fragment.firstElementChild);

  [...root.children].forEach((col) => col.classList.add('footer-col'));

  const last = root.lastElementChild;
  if (last && last.children.length === 1 && last.querySelector('p')) {
    last.classList.remove('footer-col');
    last.classList.add('footer-bottom');
    root.append(last);
  }

  block.append(root);
}
