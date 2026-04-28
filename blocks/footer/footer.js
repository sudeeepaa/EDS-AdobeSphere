import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  
  // Find all columns (sections) in the fragment
  const sections = [...fragment.querySelectorAll(':scope > .section')];
  
  if (sections.length === 0) {
    // Fallback if sections are not decorated
    sections.push(...fragment.querySelectorAll(':scope > div'));
  }
  
  // Create footer-grid to wrap columns
  const footerGrid = document.createElement('div');
  footerGrid.className = 'footer-grid';
  
  // Move all sections into the grid, except the last one (copyright)
  sections.forEach((section, index) => {
    if (index === sections.length - 1 && sections.length > 1) {
      const footerBottom = document.createElement('div');
      footerBottom.className = 'footer-bottom';
      footerBottom.append(section);
      block.append(footerBottom);
    } else {
      footerGrid.append(section);
    }
  });
  
  // Wrap grid in container
  const footer = document.createElement('div');
  footer.className = 'footer';
  footer.append(footerGrid);
  
  block.prepend(footer);
  
  // Replace [YEAR] placeholder with current year in copyright text
  const yearPlaceholders = block.querySelectorAll('*');
  yearPlaceholders.forEach((el) => {
    if (el.textContent.includes('[YEAR]')) {
      el.textContent = el.textContent.replace('[YEAR]', new Date().getFullYear());
    }
  });
}
