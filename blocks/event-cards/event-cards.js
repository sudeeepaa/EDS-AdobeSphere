export default async function decorate(block) {
  const config = {};

  [...block.children].forEach((row) => {
    const cols = [...row.children];
    if (cols.length < 2) return;

    const key = cols[0].textContent.trim().toLowerCase();
    const value = cols[1].textContent.trim();

    if (key) config[key] = value;
  });

  block.textContent = "";

  try {
    const resp = await fetch('/data/events.json');
    const events = await resp.json();

    let filtered = Array.isArray(events) ? events : [];

    if (config.featuredonly === "true") {
      filtered = filtered.filter(e => e.featured);
    }

    if (config.limit) {
      filtered = filtered.slice(0, Number(config.limit));
    }

    if (!filtered.length) {
      block.textContent = "No events available";
      return;
    }

    const grid = document.createElement("div");
    grid.className = "event-grid";

    filtered.forEach((event) => {
      const card = document.createElement("article");
      card.className = "card";

      const img = document.createElement("img");
      img.className = "card__image";
      img.src = event.thumbnail || "/assets/images/events/event-card-fallback.jpg";

      const body = document.createElement("div");
      body.className = "card__body";

      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = event.category || "Event";

      const title = document.createElement("h3");
      title.className = "card__title";
      title.textContent = event.title;

      const desc = document.createElement("p");
      desc.className = "card__excerpt";
      desc.textContent = event.shortDescription;

      body.append(badge, title, desc);
      card.append(img, body);
      grid.appendChild(card);
    });

    block.appendChild(grid);

  } catch (e) {
    console.error(e);
    block.textContent = "Failed to load events";
  }
}