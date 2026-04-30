import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta
    ? new URL(footerMeta, window.location).pathname
    : '/footer';

  const fragment = await loadFragment(footerPath);

  // clear existing block
  block.textContent = '';

  // Find footer sections
  const sections = [...fragment.querySelectorAll(':scope > .section')];

  if (sections.length === 0) {
    sections.push(...fragment.querySelectorAll(':scope > div'));
  }

  // Create grid
  const footerGrid = document.createElement('div');
  footerGrid.className = 'footer-grid';

  // Footer wrapper
  const footer = document.createElement('div');
  footer.className = 'footer';

  // Move sections
  sections.forEach((section, index) => {
    if (index === sections.length - 1 && sections.length > 1) {
      const footerBottom = document.createElement('div');
      footerBottom.className = 'footer-bottom';
      footerBottom.append(section);
      footer.append(footerBottom);
    } else {
      footerGrid.append(section);
    }
  });

  footer.prepend(footerGrid);
  block.append(footer);

  /* FORCE FOOTER VISIBLE */
  block.style.display = 'block';
  block.style.visibility = 'visible';
  block.style.opacity = '1';

  footer.style.display = 'block';
  footer.style.visibility = 'visible';
  footer.style.opacity = '1';

  /* DEBUG CHECK */
  const footerContent = document.querySelector('.footer.block .footer');

  const data = {
    footerContentStyles: footerContent
      ? {
          visibility: window.getComputedStyle(footerContent).visibility,
          opacity: window.getComputedStyle(footerContent).opacity,
          display: window.getComputedStyle(footerContent).display,
        }
      : null,
  };

  console.log('Footer visibility check:', data);

  /* FULL FOOTER DEBUG */
  const footerWrapper = document.querySelector('footer.footer-wrapper');

  if (footerWrapper) {
    const footerRect = footerWrapper.getBoundingClientRect();

    const debugData = {
      footerRect,
      windowHeight: window.innerHeight,
      scrollY: window.scrollY,
      documentHeight: document.documentElement.scrollHeight,
      footerParents: [],
    };

    let parent = footerWrapper.parentElement;

    while (parent) {
      debugData.footerParents.push({
        tagName: parent.tagName,
        className: parent.className,
        overflow: window.getComputedStyle(parent).overflow,
        height: window.getComputedStyle(parent).height,
      });

      parent = parent.parentElement;
    }

    console.log('Footer Layout Debug:', debugData);
  }

  /* BRAND SECTION */
  const brandSection = footer.querySelector('.footer-grid > div:first-child');

  if (brandSection) {
    const brandElements = [
      ...brandSection.querySelectorAll('p, h1, h2, h3, h4, h5, h6'),
    ];

    const brandEl = brandElements.find((el) =>
      /adobe/i.test(el.textContent || '')
    );

    if (brandEl) {
      brandEl.classList.add('footer-logo');
      brandEl.innerHTML = '<span class="adobe">Adobe</span>sphere';
    }

    const taglineEl = brandElements.find(
      (el) => el !== brandEl && (el.textContent || '').trim()
    );

    if (taglineEl) {
      taglineEl.classList.add('footer-tagline');
    }
  }

  /* YEAR REPLACEMENT */
  const yearPlaceholders = block.querySelectorAll('*');

  yearPlaceholders.forEach((el) => {
    if (el.textContent.includes('[YEAR]')) {
      el.textContent = el.textContent.replace(
        '[YEAR]',
        new Date().getFullYear()
      );
    }
  });

  // Final loaded state
  footer.dataset.blockStatus = 'loaded';
  block.dataset.blockStatus = 'loaded';
}