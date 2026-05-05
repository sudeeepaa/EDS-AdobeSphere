export default async function decorate(block) {
  const config = {};

  [...block.children].forEach((row) => {
    const key = row.children[0]?.textContent.trim();
    const value = row.children[1]?.textContent.trim();
    if (key && value) config[key] = value;
  });

  block.innerHTML = "";

  try {
    const resp = await fetch('/data/blogs.json');
    const blogs = await resp.json();

    let filtered = Array.isArray(blogs) ? blogs : [];

    if (config.featuredOnly === "true") {
      filtered = filtered.filter(b => b.featured === true);
    }

    if (config.limit) {
      filtered = filtered.slice(0, Number(config.limit));
    }

    if (!filtered.length) {
      block.innerHTML = `<p class="empty-state">No blogs available</p>`;
      return;
    }

    const ul = document.createElement('ul');

    filtered.forEach(blog => {
      const li = document.createElement('li');

      li.innerHTML = `
        <img src="${blog.coverImage || ''}" alt="${blog.title}">
        <div class="card__body">
          <span class="badge">${blog.category || "Article"}</span>
          <h3>${blog.title || ""}</h3>
          <p>${blog.excerpt || ""}</p>
        </div>
      `;

      ul.appendChild(li);
    });

    block.appendChild(ul);

  } catch (e) {
    console.error(e);
    block.innerHTML = `<p class="empty-state">Failed to load blogs</p>`;
  }
}