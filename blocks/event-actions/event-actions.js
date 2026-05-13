// Extracts the event ID from the URL query string or last path segment.
function getUrlId() {
  const fromQuery = new URLSearchParams(window.location.search).get('id');
  if (fromQuery) return fromQuery;
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments.length >= 2) return decodeURIComponent(segments[segments.length - 1]);
  return null;
}

// Fetches the event entity matching the current URL.
async function fetchEvent() {
  const id = getUrlId();
  if (!id) return null;
  const data = await window.AdobeSphere.Utils.fetchData('campaigns');
  return Array.isArray(data) ? (data.find((it) => it.id === id) || null) : null;
}

// Returns true if the given date string is before today.
function isPastEvent(dateStr) {
  if (!dateStr) return false;
  const parts = String(dateStr).split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return false;
  const eventDate = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDate < today;
}

// Decorates the event-actions block with Save and Register/Cancel buttons.
export default async function decorate(block) {
  const row = block.querySelector(':scope > div');
  const cells = row ? [...row.children] : [];
  const saveLabel = (cells[0] && cells[0].textContent.trim()) || 'Save Event';
  const regLabel = (cells[1] && cells[1].textContent.trim()) || 'Register for this Event';

  const entity = await fetchEvent();
  if (!entity || !entity.id) {
    block.style.display = 'none';
    return;
  }

  const { Storage } = window.AdobeSphere;
  const eventId = entity.id;
  const past = isPastEvent(entity.date);

  const section = block.closest('.section');
  if (section && section.parentElement) {
    section.parentElement.insertBefore(block, section.nextSibling);
    if (!section.textContent.trim()) section.style.display = 'none';
  }

  block.textContent = '';
  block.classList.add('event-actions');

  const inner = document.createElement('div');
  inner.className = 'event-actions-inner';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'event-actions-save';
  const isSaved = Storage.isLoggedIn() && Storage.isSaved('events', eventId);

  // Updates the save button's icon and label to match the saved state.
  const updateSaveUI = (saved) => {
    saveBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3H18C18.55 3 19 3.45 19 4V21L12 17L5 21V4C5 3.45 5.45 3 6 3Z"
        stroke="currentColor" stroke-width="1.7" fill="${saved ? 'currentColor' : 'none'}"/>
    </svg><span>${saved ? 'Saved' : saveLabel}</span>`;
    saveBtn.classList.toggle('saved', saved);
  };

  updateSaveUI(isSaved);

  saveBtn.addEventListener('click', () => {
    if (!Storage.isLoggedIn()) { window.AdobeSphere.Utils.showAuthModal({ redirect: window.location.pathname + window.location.search }); return; }
    const wasSaved = Storage.isSaved('events', eventId);
    Storage.toggleSaved('events', eventId);
    updateSaveUI(!wasSaved);
  });

  const regBtn = document.createElement('button');
  regBtn.type = 'button';

  if (past) {
    regBtn.className = 'event-actions-register ended';
    regBtn.textContent = 'Event Ended';
    regBtn.disabled = true;
  } else {
    const isReg = () => Storage.isLoggedIn()
      && Storage.getRegistrations().some((r) => r.eventId === eventId);

    // Updates the register button's label and state to reflect current registration.
    const updateRegUI = (registered) => {
      regBtn.classList.toggle('registered', registered);
      regBtn.textContent = registered ? 'Cancel Registration' : regLabel;
    };

    regBtn.className = 'event-actions-register';
    updateRegUI(isReg());

    regBtn.addEventListener('click', () => {
      if (!Storage.isLoggedIn()) { window.AdobeSphere.Utils.showAuthModal({ redirect: window.location.pathname + window.location.search }); return; }
      if (isReg()) {
        Storage.cancelRegistration(eventId);
        updateRegUI(false);
        window.AdobeSphere.Utils.toast('Registration cancelled.', 'success');
      } else {
        window.dispatchEvent(new CustomEvent('adobesphere:show-registration'));
      }
    });

    window.addEventListener('adobesphere:registration-changed', (e) => {
      if (e.detail === eventId) updateRegUI(isReg());
    });
  }

  inner.append(saveBtn, regBtn);
  block.append(inner);
}
