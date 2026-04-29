import { readBlockConfig } from '../../scripts/aem.js';
import { initRevealObserver, normalizeAssetSrc } from '../../scripts/utils.js';

function getCreators(payload) {
	if (Array.isArray(payload)) return payload;
	if (payload && Array.isArray(payload.data)) return payload.data;
	return [];
}

function createTestimonialCard(item) {
	const article = document.createElement('article');
	article.className = 'testimonial-card reveal';

	const quote = document.createElement('blockquote');
	quote.textContent = item.quote || '';

	const author = document.createElement('div');
	author.className = 'testimonial-author';

	const avatar = document.createElement('img');
	avatar.src = normalizeAssetSrc(item.avatar, '');
	avatar.alt = item.name || 'Creator';
	avatar.loading = 'lazy';

	const authorCopy = document.createElement('div');

	const authorName = document.createElement('p');
	authorName.className = 'testimonial-author-name';
	authorName.textContent = item.name || 'Unnamed Creator';

	const authorRole = document.createElement('p');
	authorRole.className = 'testimonial-author-role';
	authorRole.textContent = item.designation || '';

	authorCopy.append(authorName, authorRole);
	author.append(avatar, authorCopy);
	article.append(quote, author);

	return article;
}

function showEmptyState(block, message) {
	const empty = document.createElement('p');
	empty.className = 'empty-state';
	empty.textContent = message;
	block.replaceChildren(empty);
}

export default async function decorate(block) {
	const config = readBlockConfig(block);
	const sourcePath = config.source || '/data/creators.json';
	const limitValue = Number.parseInt(config.limit, 10);
	const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 6;

	block.classList.add('testimonials');
	block.textContent = '';

	try {
		const response = await fetch(sourcePath);
		if (!response.ok) {
			throw new Error(`Failed to load creators (${response.status})`);
		}

		const payload = await response.json();
		const testimonials = getCreators(payload)
			.filter((creator) => creator && creator.isTestimonial === true)
			.slice(0, limit);

		if (!testimonials.length) {
			showEmptyState(block, 'No testimonials available right now.');
			return;
		}

		const grid = document.createElement('div');
		grid.className = 'testimonials-grid';
		testimonials.forEach((creator) => grid.append(createTestimonialCard(creator)));
		block.append(grid);
		initRevealObserver();
	} catch (error) {
		showEmptyState(block, 'Unable to load testimonials right now.');
		// eslint-disable-next-line no-console
		console.error('Failed to render testimonials:', error);
	}
}
