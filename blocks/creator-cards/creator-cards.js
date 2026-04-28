import { readBlockConfig } from '../../scripts/aem.js';
import { normalizeAssetSrc, truncate } from '../../scripts/utils.js';

function getCreators(payload) {
	if (Array.isArray(payload)) return payload;
	if (payload && Array.isArray(payload.data)) return payload.data;
	return [];
}

function creatorId(value) {
	return String(value || '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9:-]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function createStat(text) {
	const stat = document.createElement('span');
	stat.textContent = text;
	return stat;
}

function buildCard(creator) {
	const item = creator || {};
	const stats = item.stats || {};

	const article = document.createElement('article');
	article.className = 'creator-card';

	const link = document.createElement('a');
	link.href = `/creators/${creatorId(item.id)}`;

	const avatarWrap = document.createElement('div');
	avatarWrap.className = 'creator-card__avatar';

	const avatar = document.createElement('img');
	avatar.src = normalizeAssetSrc(item.avatar, '');
	avatar.alt = item.name || 'Creator';
	avatar.loading = 'lazy';
	avatarWrap.append(avatar);

	const info = document.createElement('div');
	info.className = 'creator-card__info';

	const name = document.createElement('h3');
	name.textContent = item.name || 'Unnamed Creator';

	const designation = document.createElement('p');
	designation.className = 'creator-card__designation';
	designation.textContent = item.designation || '';

	const bio = document.createElement('p');
	bio.className = 'creator-card__bio';
	bio.textContent = truncate(item.bio || item.fullBio || '', 100);

	const statRow = document.createElement('div');
	statRow.className = 'creator-card__stats';
	statRow.append(
		createStat(`${Number(stats.blogsPublished) || 0} Blogs`),
		createStat(`${Number(stats.eventsHosted) || 0} Events`),
	);

	info.append(name, designation, bio, statRow);
	link.append(avatarWrap, info);
	article.append(link);

	return article;
}

function showEmptyState(block, message) {
	const empty = document.createElement('p');
	empty.className = 'creator-cards__empty';
	empty.textContent = message;
	block.replaceChildren(empty);
}

export default async function decorate(block) {
	const config = readBlockConfig(block);
	const featuredOnly = String(config.featuredOnly || '').toLowerCase() === 'true';
	const limitValue = Number.parseInt(config.limit, 10);
	const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 8;

	block.classList.add('creator-cards');
	block.textContent = '';

	try {
		const response = await fetch('/data/creators.json');
		if (!response.ok) {
			throw new Error(`Failed to load creators (${response.status})`);
		}

		const payload = await response.json();
		const creators = getCreators(payload)
			.filter((creator) => creator && (!featuredOnly || creator.featured === true))
			.slice(0, limit);

		if (!creators.length) {
			showEmptyState(block, 'No featured creators available yet.');
			return;
		}

		const grid = document.createElement('div');
		grid.className = 'creator-cards__grid';
		creators.forEach((creator) => grid.append(buildCard(creator)));
		block.append(grid);
	} catch (error) {
		showEmptyState(block, 'Unable to load creators right now.');
		// eslint-disable-next-line no-console
		console.error('Failed to render creator cards:', error);
	}
}
