export default async function decorate(block) {
  const config = {};

  [...block.children].forEach((row) => {
    const key = row.children[0]?.textContent.trim();
    const value = row.children[1]?.textContent.trim();
    if (key && value) config[key] = value;
  });

  block.innerHTML = "";

  try {
    const resp = await fetch('/data/creators.json');
    const creators = await resp.json();

    let filtered = Array.isArray(creators) ? creators : [];

    if (config.featuredOnly === "true") {
      filtered = filtered.filter(c => c.featured === true);
    }

    if (config.limit) {
      filtered = filtered.slice(0, Number(config.limit));
    }

    if (!filtered.length) {
      block.innerHTML = `<p class="empty-state">No creators available</p>`;
      return;
    }

    block.innerHTML = filtered.map(buildCreatorCard).join("");

  } catch (e) {
    console.error(e);
    block.innerHTML = `<p class="empty-state">Failed to load creators</p>`;
  }
}

function buildCreatorCard(c) {
  return `
    <article class="card creator-card">
      <img class="creator-avatar" src="${c.avatar || ''}" alt="${c.name}">
      <h3 class="card__title">${c.name || ""}</h3>
      <p class="text-muted">${c.designation || ""}</p>
    </article>
  `;
}