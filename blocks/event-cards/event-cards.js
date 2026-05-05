export default async function decorate(block) {
  const config = {};

  // Read authored config
  [...block.children].forEach((row) => {
    const key = row.children[0]?.textContent.trim();
    const value = row.children[1]?.textContent.trim();
    if (key && value) config[key] = value;
  });

  block.innerHTML = "";

  try {
    const resp = await fetch('/data/events.json');
    const events = await resp.json();

    let filtered = Array.isArray(events) ? events : [];

    if (config.featuredOnly === "true") {
      filtered = filtered.filter(e => e.featured === true);
    }

    if (config.limit) {
      filtered = filtered.slice(0, Number(config.limit));
    }

    if (!filtered.length) {
      block.innerHTML = `<p class="empty-state">No events available</p>`;
      return;
    }

    block.innerHTML = filtered.map(buildEventCard).join("");

  } catch (e) {
    console.error(e);
    block.innerHTML = `<p class="empty-state">Failed to load events</p>`;
  }
}

function buildEventCard(event) {
  return `
    <article class="card">
      <img class="card__image" src="${event.thumbnail || ''}" alt="${event.title}">
      <div class="card__body">
        <span class="badge">${event.category || "Event"}</span>
        <h3 class="card__title">${event.title || ""}</h3>
        <p class="card__excerpt">${event.shortDescription || ""}</p>
      </div>
    </article>
  `;
}