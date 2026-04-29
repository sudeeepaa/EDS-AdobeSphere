import { buildBlogCard, escapeHtml, formatShortDate, normalizeAssetSrc } from '../../scripts/utils.js';

function getTargetId() {
	const search = new URLSearchParams(window.location.search);
	const queryId = search.get('id');
	if (queryId) return queryId;
	return window.location.pathname.split('/').filter(Boolean).pop() || '';
}

function slugify(value) {
	return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function loadBlogs() {
	const response = await fetch('/data/blogs.json');
	const payload = await response.json();
	return Array.isArray(payload) ? payload : (payload.data || []);
}

function renderContentBlock(item) {
	const block = document.createElement('div');
	block.className = `blog-detail__content-block blog-detail__content-block--${item.type || 'paragraph'}`;

	if (item.type === 'heading') {
		const heading = document.createElement('h2');
		heading.textContent = item.text || '';
		block.append(heading);
		return block;
	}

	if (item.type === 'image') {
		const figure = document.createElement('figure');
		figure.className = 'blog-detail__figure';
		const image = document.createElement('img');
		image.src = normalizeAssetSrc(item.src, '');
		image.alt = item.alt || 'Inline image';
		figure.append(image);
		if (item.alt) {
			const caption = document.createElement('figcaption');
			caption.textContent = item.alt;
			figure.append(caption);
		}
		block.append(figure);
		return block;
	}

	if (item.type === 'quote') {
		const quote = document.createElement('blockquote');
		quote.textContent = item.text || '';
		block.append(quote);
		return block;
	}

	if (item.type === 'list') {
		const list = document.createElement('ul');
		(item.items || []).forEach((entry) => {
			const li = document.createElement('li');
			li.textContent = entry;
			list.append(li);
		});
		block.append(list);
		return block;
	}

	const paragraph = document.createElement('p');
	paragraph.textContent = item.text || '';
	block.append(paragraph);
	return block;
}

export default async function decorate(block) {
	const targetId = getTargetId();
	const blogs = await loadBlogs();
	const blog = blogs.find((item) => String(item.id || '') === targetId || slugify(item.id) === slugify(targetId)) ||
		blogs.find((item) => slugify(item.title) === slugify(targetId)) || null;

	block.classList.add('detail-page', 'detail-page--blog');
	block.textContent = '';

	if (!blog) {
		const empty = document.createElement('div');
		empty.className = 'empty-state';
		empty.textContent = 'Blog not found.';
		block.append(empty);
		return;
	}

	const hero = document.createElement('section');
	hero.className = 'detail-page__hero detail-page__hero--blog';
	const media = document.createElement('div');
	media.className = 'detail-page__hero-media';
	const image = document.createElement('img');
	image.src = normalizeAssetSrc(blog.coverImage, '');
	image.alt = blog.title || 'Blog';
	media.append(image);

	const copy = document.createElement('div');
	copy.className = 'detail-page__hero-copy';
	copy.innerHTML = `
		<p class="detail-page__eyebrow">${escapeHtml(blog.category || 'Blog')}</p>
		<h1>${escapeHtml(blog.title || '')}</h1>
		<p class="detail-page__lede">${escapeHtml(blog.excerpt || '')}</p>
	`;

	const author = blog.author || {};
	const meta = document.createElement('div');
	meta.className = 'detail-page__meta';
	meta.innerHTML = `
		<span><strong>Published</strong>${formatShortDate(blog.publishedDate || '')}</span>
		<span><strong>Author</strong>${escapeHtml(author.name || 'Author')}</span>
		<span><strong>Category</strong>${escapeHtml(blog.category || '')}</span>
	`;
	copy.append(meta);

	hero.append(media, copy);
	block.append(hero);

	const authorCard = document.createElement('section');
	authorCard.className = 'detail-page__section detail-page__author-card';
	authorCard.innerHTML = `
		<h2>About the author</h2>
		<div>
			<img src="${normalizeAssetSrc(author.avatar, '')}" alt="${escapeHtml(author.name || 'Author')}" />
			<div>
				<h3>${escapeHtml(author.name || 'Author')}</h3>
				<p>${escapeHtml(author.designation || '')}</p>
				<p>${escapeHtml(author.bio || '')}</p>
			</div>
		</div>
	`;
	block.append(authorCard);

	const contentSection = document.createElement('section');
	contentSection.className = 'detail-page__section';
	contentSection.innerHTML = '<h2>Article</h2>';
	const content = document.createElement('div');
	content.className = 'blog-detail__content';
	(blog.content || []).forEach((item) => content.append(renderContentBlock(item)));
	contentSection.append(content);
	block.append(contentSection);

	const related = blogs.filter((item) => item.id !== blog.id && String(item.category || '') === String(blog.category || '')).slice(0, 3);
	if (related.length) {
		const relatedSection = document.createElement('section');
		relatedSection.className = 'detail-page__section';
		relatedSection.innerHTML = '<h2>Related articles</h2>';
		const grid = document.createElement('div');
		grid.className = 'detail-page__related-grid';
		related.forEach((item) => grid.append(buildBlogCard(item)));
		relatedSection.append(grid);
		block.append(relatedSection);
	}
}