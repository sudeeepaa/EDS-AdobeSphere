import { readBlockConfig } from '../../scripts/aem.js';
import { buildBlogCard } from '../../scripts/utils.js';

function getBlogs(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

function showEmptyState(block, message) {
  const empty = document.createElement('p');
  empty.className = 'blog-cards__empty';
  empty.textContent = message;
  block.replaceChildren(empty);
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const featuredOnly = String(config.featuredOnly || config.featured || '').toLowerCase() === 'true';
  const limitValue = Number.parseInt(config.limit, 10);
  const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 6;
  const sourcePath = config.source || '/data/blogs.json';

  block.classList.add('blog-cards');
  block.textContent = '';

  try {
    const response = await fetch(sourcePath);
    if (!response.ok) {
      throw new Error(`Failed to load blogs (${response.status})`);
    }

    const payload = await response.json();
    const items = getBlogs(payload)
      .filter((blog) => blog && (!featuredOnly || blog.featured === true))
      .slice(0, limit);

    if (!items.length) {
      showEmptyState(block, 'No articles available right now.');
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'blog-cards__grid';
    items.forEach((blog) => grid.append(buildBlogCard(blog)));
    block.append(grid);
  } catch (error) {
    showEmptyState(block, 'Unable to load articles right now.');
    // eslint-disable-next-line no-console
    console.error('Failed to render blog cards:', error);
  }
}
