/**
 * AdobeSphere — tabs block.
 *
 * Turns a list of tab names into a tabbed interface.
 * The block itself renders the tab buttons. The *subsequent sections* in the
 * document become the tab panels.
 *
 * Authoring format:
 * | tabs |
 * |---|
 * | Events & Campaigns | events |
 * | Blogs & Articles   | blogs  |
 * | Creators           | creators |
 *
 * The second column (optional) is the tab ID, used for URL ?tab=id matching.
 * The first row links to the immediately following section, the second row
 * links to the section after that, etc.
 */

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

  // Setup tab panels (the following sections)
  const section = block.closest('.section');
  let currentPanel = section.nextElementSibling;

  tabs.forEach((tab) => {
    if (!currentPanel) return;

    // Setup panel attributes
    currentPanel.id = `tabpanel-${tab.id}`;
    currentPanel.setAttribute('role', 'tabpanel');
    currentPanel.setAttribute('aria-labelledby', `tab-${tab.id}`);
    currentPanel.classList.add('tabs-panel');

    tab.panel = currentPanel;
    currentPanel = currentPanel.nextElementSibling;

    // Click handler
    tab.button.addEventListener('click', () => {
      // Update URL without reloading
      const url = new URL(window.location);
      url.searchParams.set('tab', tab.id);
      window.history.replaceState({}, '', url);

      // Deactivate all
      tabs.forEach((t) => {
        t.button.classList.remove('active');
        t.button.setAttribute('aria-selected', 'false');
        if (t.panel) {
          t.panel.classList.remove('active');
          t.panel.style.display = 'none';
        }
      });

      // Activate current
      tab.button.classList.add('active');
      tab.button.setAttribute('aria-selected', 'true');
      if (tab.panel) {
        tab.panel.classList.add('active');
        tab.panel.style.display = '';
      }
    });
  });

  // Hydrate from URL or default to first
  const urlParams = new URLSearchParams(window.location.search);
  const activeTabId = urlParams.get('tab');
  const targetTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  if (targetTab) {
    targetTab.button.click();
    const TAB_PRIORITY = ['events', 'blogs', 'creato', 'creators'];
    // 'creato' handles the truncated id that tabs.js derived from "Creators"
    // if the author omitted an explicit id column (see tabs.js id derivation).

    let pendingResults = {};
    let coordinatorRaf = null;

    function pickBestTab() {
      // Find highest-priority tab that has results.
      // If nothing matched at all, stay on current tab (don't disrupt user).
      const winner = TAB_PRIORITY.find((id) => pendingResults[id] > 0);
      pendingResults = {};

      if (!winner) return; // no results anywhere — let each tab show its own empty state

      const target = tabs.find((t) => t.id === winner || t.id.startsWith(winner.slice(0, 5)));
      if (target && !target.button.classList.contains('active')) {
        target.button.click();
      }
    }

    window.addEventListener('adobesphere:search:results', (e) => {
      const { type, count, q } = e.detail;

      // Only coordinate when there is an actual search query.
      // Empty query = user cleared search → don't auto-switch tabs.
      if (!q) { pendingResults = {}; return; }

      pendingResults[type] = count;

      // Debounce: wait one animation frame after the last report fires
      // so all three card blocks have had a chance to report.
      cancelAnimationFrame(coordinatorRaf);
      coordinatorRaf = requestAnimationFrame(pickBestTab);
    });
  }
}
