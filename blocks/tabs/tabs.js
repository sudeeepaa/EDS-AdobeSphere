// Decorates the tabs block and wires panel visibility, URL sync, and search coordination.
export default function decorate(block) {
  const tabsList = document.createElement('div');
  tabsList.className = 'tabs-list';
  tabsList.setAttribute('role', 'tablist');

  const rows = [...block.children];
  const tabs = [];

  rows.forEach((row, i) => {
    const cells = [...row.children];
    if (!cells.length) return;

    const name = cells[0].textContent.trim();
    const explicitId = cells[1] ? cells[1].textContent.trim().toLowerCase() : '';
    const id = explicitId || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tabs-tab';
    button.id = `tab-${id}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', 'false');
    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.textContent = name;
    button.dataset.id = id;

    tabsList.append(button);
    tabs.push({ button, id, index: i });
    row.remove();
  });

  block.append(tabsList);

  const section = block.closest('.section');

  const inlineSiblings = [];
  let sib = block.nextElementSibling;
  while (sib) { inlineSiblings.push(sib); sib = sib.nextElementSibling; }

  const hasInline = inlineSiblings.length > 0;
  let currentPanel = section.nextElementSibling;

  tabs.forEach((tab, i) => {
    if (i === 0 && hasInline) {
      section.id = `tabpanel-${tab.id}`;
      section.setAttribute('role', 'tabpanel');
      section.setAttribute('aria-labelledby', `tab-${tab.id}`);
      tab.inline = inlineSiblings;
    } else {
      if (!currentPanel) return;
      currentPanel.id = `tabpanel-${tab.id}`;
      currentPanel.setAttribute('role', 'tabpanel');
      currentPanel.setAttribute('aria-labelledby', `tab-${tab.id}`);
      currentPanel.classList.add('tabs-panel');
      tab.panel = currentPanel;
      currentPanel = currentPanel.nextElementSibling;
    }
  });

  // Activates a tab, shows its panel, and optionally updates the URL.
  function activateTab(tab, updateUrl, fromEvent = false) {
    tabs.forEach((t) => {
      t.button.classList.remove('active');
      t.button.setAttribute('aria-selected', 'false');
      if (t.inline) {
        t.inline.forEach((el) => { el.style.display = 'none'; });
      } else if (t.panel) {
        t.panel.classList.remove('active');
        t.panel.style.display = 'none';
      }
    });

    tab.button.classList.add('active');
    tab.button.setAttribute('aria-selected', 'true');
    if (tab.inline) {
      tab.inline.forEach((el) => { el.style.display = ''; });
    } else if (tab.panel) {
      tab.panel.classList.add('active');
      tab.panel.style.display = '';
    }

    if (updateUrl) {
      const url = new URL(window.location);
      url.searchParams.set('tab', tab.id);
      window.history.replaceState({}, '', url);
    }

    if (!fromEvent) {
      window.dispatchEvent(new CustomEvent('adobesphere:switchtab', { detail: tab.id }));
    }
  }

  tabs.forEach((tab) => {
    tab.button.addEventListener('click', () => activateTab(tab, true));
  });

  const urlParams = new URLSearchParams(window.location.search);
  const activeTabId = urlParams.get('tab');
  const initialTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  if (initialTab) activateTab(initialTab, !!activeTabId);

  import('../../scripts/aem.js').then(({ loadSection }) => {
    tabs.forEach(({ panel }) => {
      if (panel) loadSection(panel);
    });
  });

  let pending = {};
  let rafId = null;

  // Switches to the tab whose results best match the query on primary fields.
  // Tiebreaks on total result count so partial matches still navigate somewhere useful.
  function switchToWinningTab() {
    let winner = null;
    let bestQuality = 0;
    let bestCount = 0;

    Object.keys(pending).forEach((type) => {
      const { count, quality } = pending[type];
      if (
        quality > bestQuality
        || (quality === bestQuality && count > bestCount)
      ) {
        winner = type;
        bestQuality = quality;
        bestCount = count;
      }
    });

    pending = {};
    if (!winner) return;

    const target = tabs.find((t) => t.id === winner);
    if (target && !target.button.classList.contains('active')) {
      activateTab(target, true);
    }
  }

  window.addEventListener('adobesphere:search:results', (e) => {
    const {
      type, count, quality, q,
    } = e.detail;

    if (!q) {
      pending = {};
      return;
    }

    pending[type] = { count, quality: quality || 0 };

    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(switchToWinningTab);
  });

  window.addEventListener('adobesphere:switchtab', (e) => {
    const target = tabs.find((t) => t.id === e.detail);
    if (target) activateTab(target, true, true);
  });
}
