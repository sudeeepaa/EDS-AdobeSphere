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
  });

  // ── Core activate function ─────────────────────────────────────────────
  // updateUrl = true  → writes ?tab= to the address bar (manual click / search)
  // updateUrl = false → silent activation on first load (keeps /explore clean)
  function activateTab(tab, updateUrl) {
    // Deactivate all
    tabs.forEach((t) => {
      t.button.classList.remove('active');
      t.button.setAttribute('aria-selected', 'false');
      if (t.panel) {
        t.panel.classList.remove('active');
        t.panel.style.display = 'none';
      }
    });

    // Activate target
    tab.button.classList.add('active');
    tab.button.setAttribute('aria-selected', 'true');
    if (tab.panel) {
      tab.panel.classList.add('active');
      tab.panel.style.display = '';
    }

    // Only touch the URL when explicitly requested
    if (updateUrl) {
      const url = new URL(window.location);
      url.searchParams.set('tab', tab.id);
      window.history.replaceState({}, '', url);
    }
  }

  // Wire click handlers — always update the URL on a real user click
  tabs.forEach((tab) => {
    tab.button.addEventListener('click', () => activateTab(tab, true));
  });

  // ── Initial activation ─────────────────────────────────────────────────
  // If ?tab= is already in the URL (e.g. shared link), honour it and keep
  // the URL unchanged. If there is no ?tab= (bare /explore), activate the
  // first tab silently so the address bar stays clean.
  const urlParams = new URLSearchParams(window.location.search);
  const activeTabId = urlParams.get('tab');
  const targetTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  if (targetTab) {
    activateTab(targetTab, !!activeTabId);
  }

  // ── Cross-tab search coordinator ───────────────────────────────────────
  // Listens for adobesphere:search:results events broadcast by each cards
  // block after every renderGrid(). Collects all reports within one rAF
  // window, then switches to the highest-priority tab that has results.
  //
  // Priority order matches TAB_PRIORITY below — easy to adjust.
  // Empty query (user cleared search) skips coordination entirely so the
  // tab doesn't jump around unexpectedly.

  const TAB_PRIORITY = ['events', 'blogs', 'creato', 'creators'];

  let pendingResults = {};
  let coordinatorRaf = null;

  function pickBestTab() {
    const winner = TAB_PRIORITY.find((id) => (pendingResults[id] || 0) > 0);
    pendingResults = {};

    if (!winner) return; // nothing matched — let each tab show its own empty state

    const target = tabs.find((t) => t.id === winner || t.id.startsWith(winner.slice(0, 5)));
    if (target && !target.button.classList.contains('active')) {
      activateTab(target, true); // update URL so the user can see / share the result tab
    }
  }

  window.addEventListener('adobesphere:search:results', (e) => {
    const { type, count, q } = e.detail;

    // Don't auto-switch when the search is empty
    if (!q) {
      pendingResults = {};
      return;
    }

    pendingResults[type] = count;

    // Wait one animation frame so all three card blocks have reported
    // before we decide which tab wins — prevents a mid-flight switch.
    cancelAnimationFrame(coordinatorRaf);
    coordinatorRaf = requestAnimationFrame(pickBestTab);
  });
  // ── end coordinator ────────────────────────────────────────────────────
}