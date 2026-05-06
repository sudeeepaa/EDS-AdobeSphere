/**
 * AdobeSphere — tabs block.
 *
 * Authoring format:
 * | tabs |
 * |---|
 * | Events & Campaigns | events   |
 * | Blogs & Articles   | blogs    |
 * | Creators           | creators |
 *
 * The second column is the tab ID used for URL ?tab=id matching and
 * for cross-tab search coordination with cards.js.
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

  // Link each tab to the section that immediately follows the tabs section
  const section = block.closest('.section');
  let currentPanel = section.nextElementSibling;

  tabs.forEach((tab) => {
    if (!currentPanel) return;
    currentPanel.id = `tabpanel-${tab.id}`;
    currentPanel.setAttribute('role', 'tabpanel');
    currentPanel.setAttribute('aria-labelledby', `tab-${tab.id}`);
    currentPanel.classList.add('tabs-panel');
    tab.panel = currentPanel;
    currentPanel = currentPanel.nextElementSibling;
  });

  // ── Activate a tab ─────────────────────────────────────────────────────
  // updateUrl = true  → writes ?tab=id to the address bar
  // updateUrl = false → silent (used on first load so /explore stays clean)
  function activateTab(tab, updateUrl) {
    tabs.forEach((t) => {
      t.button.classList.remove('active');
      t.button.setAttribute('aria-selected', 'false');
      if (t.panel) {
        t.panel.classList.remove('active');
        t.panel.style.display = 'none';
      }
    });

    tab.button.classList.add('active');
    tab.button.setAttribute('aria-selected', 'true');
    if (tab.panel) {
      tab.panel.classList.add('active');
      tab.panel.style.display = '';
    }

    if (updateUrl) {
      const url = new URL(window.location);
      url.searchParams.set('tab', tab.id);
      window.history.replaceState({}, '', url);
    }
  }

  // Manual tab clicks always update the URL
  tabs.forEach((tab) => {
    tab.button.addEventListener('click', () => activateTab(tab, true));
  });

  // ── Initial load ───────────────────────────────────────────────────────
  // Honour ?tab= if present (e.g. shared link), otherwise activate first
  // tab silently so the address bar stays as /explore
  const urlParams = new URLSearchParams(window.location.search);
  const activeTabId = urlParams.get('tab');
  const initialTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  if (initialTab) activateTab(initialTab, !!activeTabId);

  // ── Cross-tab search coordinator ───────────────────────────────────────
  // cards.js fires adobesphere:search:results { type, count, q } after every
  // renderGrid(). We collect results from all three datasets within one rAF,
  // then switch to the first tab (events → blogs → creators) that has matches.
  //
  // If nothing matches, we leave the current tab alone.
  // If the query is empty (user cleared search), we do nothing.

  const PRIORITY = ['events', 'blogs', 'creators'];
  let pending = {};
  let rafId = null;

  function switchToWinningTab() {
    const winner = PRIORITY.find((type) => (pending[type] || 0) > 0);
    pending = {};
    if (!winner) return;

    const target = tabs.find((t) => t.id === winner);
    if (target && !target.button.classList.contains('active')) {
      activateTab(target, true);
    }
  }

  window.addEventListener('adobesphere:search:results', (e) => {
    const { type, count, q } = e.detail;

    if (!q) {
      pending = {};
      return;
    }

    pending[type] = count;

    // Wait for all card blocks to report before deciding
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(switchToWinningTab);
  });

  // Marquee and direct links fire this to switch tab by id without a search
  window.addEventListener('adobesphere:switchtab', (e) => {
    const target = tabs.find((t) => t.id === e.detail);
    if (target) activateTab(target, true);
  });
}