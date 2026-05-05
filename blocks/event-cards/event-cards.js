export default async function decorate(block) {
  const config = {};

  [...block.children].forEach((row) => {
    const key = row.children[0]?.textContent.trim();
    const value = row.children[1]?.textContent.trim();
    if (key && value) config[key] = value;
  });

  block.textContent = '';

  try {
    const resp = await fetch('/data/events.json');
    const json = await resp.json();

    // ✅ HANDLE BOTH formats
    let events = Array.isArray(json) ? json : json.data || [];

    if (config.featuredOnly === "true") {
      events = events.filter(e => e.featured === true);
    }

    if (config.limit) {
      events = events.slice(0, Number(config.limit));
    }

    if (!events.length) {
      block.innerHTML = `<p class="empty-state">No events available</p>`;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'event-cards__grid';

    events.forEach((event) => {
      const card = document.createElement('article');
      card.className = 'card';

      card.innerHTML = `
        <img class="card__image" src="${event.thumbnail}" alt="${event.title}">
        <div class="card__body">
          <span class="badge">${event.category || "Event"}</span>
          <h3 class="card__title">${event.title}</h3>
          <p class="card__excerpt">${event.shortDescription}</p>
        </div>
      `;

      grid.appendChild(card);
    });

    block.appendChild(grid);

  } catch (e) {
    console.error(e);
    block.innerHTML = `<p class="empty-state">Failed to load events</p>`;
  }
}