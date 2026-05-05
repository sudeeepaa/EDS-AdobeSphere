import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * AdobeSphere footer.
 *
 * Authoring contract (the linked /footer fragment is a single block authored as a
 * 4-column row: brand | quick links | content links | bottom-line).
 * The block accepts whatever sections the author writes — we only enforce the
 * outer wrapper class and the heading underline pattern.
 */
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

  // Tag column wrappers so we can lay them out in a grid.
  [...root.children].forEach((col) => col.classList.add('footer-col'));

  // The author's last column (single paragraph) becomes the bottom strip.
  const last = root.lastElementChild;
  if (last && last.children.length === 1 && last.querySelector('p')) {
    last.classList.remove('footer-col');
    last.classList.add('footer-bottom');
    root.append(last); // ensure it's last
  }

  block.append(root);
}
