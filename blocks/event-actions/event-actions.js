/**
 * AdobeSphere — event-actions block.
 *
 * A sticky action bar with Save + Register buttons for event detail pages.
 *
 * ┌─────────────────────────────────────────────┐
 * │              event-actions                  │
 * ├──────────────────────┬──────────────────────┤
 * │ Save Event           │ Register for this    │
 * │                      │ Event                │
 * └──────────────────────┴──────────────────────┘
 *
 * Column 1  →  Save / Unsave toggle label
 * Column 2  →  Register / Cancel / Event Ended label
 *
 * The block auto-detects the event from the URL, then rewrites both
 * cells into interactive buttons with the correct initial state.
 */

const SOURCE_FILE = { events: 'campaigns' };

function getUrlId() {
  const fromQuery = new URLSearchParams(window.location.search).get('id');
  if (fromQuery) return fromQuery;
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments.length >= 2) return decodeURIComponent(segments[segments.length - 1]);
  return null;
}

async function fetchEvent() {
  const id = getUrlId();
  if (!id) return null;
  const data = await window.AdobeSphere.Utils.fetchData('campaigns');
  return Array.isArray(data) ? (data.find((it) => it.id === id) || null) : null;
}

function isPastEvent(dateStr) {
  if (!dateStr) return false;
  const parts = String(dateStr).split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return false;
  const eventDate = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDate < today;
}

export default async function decorate(block) {
  /* ── Read authored labels from the two cells ── */
  const row = block.querySelector(':scope > div');
  const cells = row ? [...row.children] : [];
  const saveLabel = (cells[0] && cells[0].textContent.trim()) || 'Save Event';
  const regLabel = (cells[1] && cells[1].textContent.trim()) || 'Register for this Event';

  /* ── Fetch the event entity ── */
  const entity = await fetchEvent();
  if (!entity || !entity.id) {
    block.style.display = 'none';
    return;
  }

  const { Storage } = window.AdobeSphere;
  const eventId = entity.id;
  const past = isPastEvent(entity.date);

  /* ── Lift block to <main> so position: sticky works across the entire page ── */
  const section = block.closest('.section');
  if (section && section.parentElement) {
    section.parentElement.insertBefore(block, section.nextSibling);
    if (!section.textContent.trim()) section.style.display = 'none';
  }

  /* ── Clear authored content, rebuild as buttons ── */
  block.textContent = '';
  block.classList.add('event-actions');

  const inner = document.createElement('div');
  inner.className = 'event-actions-inner';

  /* ── Save / Unsave button ── */
  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'event-actions-save';
  const isSaved = Storage.isLoggedIn() && Storage.isSaved('events', eventId);

  const updateSaveUI = (saved) => {
    saveBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3H18C18.55 3 19 3.45 19 4V21L12 17L5 21V4C5 3.45 5.45 3 6 3Z"
        stroke="currentColor" stroke-width="1.7" fill="${saved ? 'currentColor' : 'none'}"/>
    </svg><span>${saved ? 'Saved' : saveLabel}</span>`;
    saveBtn.classList.toggle('saved', saved);
  };

  updateSaveUI(isSaved);

  saveBtn.addEventListener('click', () => {
    if (!Storage.isLoggedIn()) { window.location.href = '/login'; return; }
    const wasSaved = Storage.isSaved('events', eventId);
    Storage.toggleSaved('events', eventId);
    updateSaveUI(!wasSaved);
  });

  /* ── Register / Cancel Registration / Event Ended button ── */
  const regBtn = document.createElement('button');
  regBtn.type = 'button';

  if (past) {
    regBtn.className = 'event-actions-register ended';
    regBtn.textContent = 'Event Ended';
    regBtn.disabled = true;
  } else {
    const isReg = Storage.isLoggedIn()
      && Storage.getRegistrations().some((r) => r.eventId === eventId);

    const updateRegUI = (registered) => {
      regBtn.classList.toggle('registered', registered);
      regBtn.textContent = registered ? 'Cancel Registration' : regLabel;
    };

    regBtn.className = 'event-actions-register';
    updateRegUI(isReg);

    regBtn.addEventListener('click', () => {
      if (!Storage.isLoggedIn()) { window.location.href = '/login'; return; }
      const alreadyReg = Storage.getRegistrations().some((r) => r.eventId === eventId);
      if (alreadyReg) {
        Storage.cancelRegistration(eventId);
        updateRegUI(false);
      } else {
        Storage.registerForEvent(eventId);
        updateRegUI(true);
      }
    });
  }

  inner.append(saveBtn, regBtn);
  block.append(inner);
}
