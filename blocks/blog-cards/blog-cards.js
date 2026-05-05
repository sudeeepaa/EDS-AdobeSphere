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

    block.innerHTML = filtered.map(buildBlogCard).join("");

  } catch (e) {
    console.error(e);
    block.innerHTML = `<p class="empty-state">Failed to load blogs</p>`;
  }
}

function buildBlogCard(blog) {
  return `
    <article class="card">
      <img class="card__image" src="${blog.coverImage || ''}" alt="${blog.title}">
      <div class="card__body">
        <span class="badge">${blog.category || "Article"}</span>
        <h3 class="card__title">${blog.title || ""}</h3>
        <p class="card__excerpt">${blog.excerpt || ""}</p>
      </div>
    </article>
  `;
}