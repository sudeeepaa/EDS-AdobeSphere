export default async function decorate(block) {
  const config = {};

  [...block.children].forEach((row) => {
    const key = row.children[0]?.textContent.trim();
    const value = row.children[1]?.textContent.trim();
    if (key && value) config[key] = value;
  });

  block.innerHTML = '';

  try {
    const resp = await fetch('/data/events.json');
    const json = await resp.json();

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

    const ul = document.createElement('ul');

    events.forEach(event => {
      const li = document.createElement('li');

      li.innerHTML = `
        <img src="${event.thumbnail}" alt="${event.title}">
        <div class="card__body">
          <span class="badge">${event.category || "Event"}</span>
          <h3>${event.title}</h3>
          <p>${event.shortDescription}</p>
        </div>
      `;

      ul.appendChild(li);
    });

    block.appendChild(ul);

  } catch (e) {
    console.error(e);
    block.innerHTML = `<p class="empty-state">Failed to load events</p>`;
  }
}