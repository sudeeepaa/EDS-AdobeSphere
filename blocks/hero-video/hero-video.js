import authInit, { isLoggedIn } from '../../scripts/auth.js';
import decorateSearchBar from '../search-bar/search-bar.js';
import { appPath, normalizeAssetSrc } from '../../scripts/utils.js';

function getCellText(cell) {
	return String(cell?.textContent || '').trim();
}

function getLink(cell) {
	const link = cell?.querySelector('a');
	if (link) {
		return {
			href: appPath(link.getAttribute('href') || ''),
			text: String(link.textContent || '').trim(),
		};
	}

	const text = getCellText(cell);
	if (!text) return null;

	return {
		href: appPath(text),
		text,
	};
}

function createButton(linkData, variant) {
	if (!linkData) return null;

	const button = document.createElement('a');
	button.className = `btn ${variant}`;
	button.href = linkData.href;
	button.textContent = linkData.text || '';
	return button;
}

function createChevronIcon() {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('viewBox', '0 0 24 24');
	svg.setAttribute('aria-hidden', 'true');
	svg.setAttribute('focusable', 'false');

	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path.setAttribute('d', 'M6.7 9.8 12 15.1l5.3-5.3 1.4 1.4L12 17.9 5.3 11.2z');
	svg.append(path);
	return svg;
}

export default function decorate(block) {
	authInit();

	const rows = [...block.querySelectorAll(':scope > div')];
	const values = rows.map((row) => [...row.children]);

	const videoUrlRaw = getCellText(values[0] && values[0][0]);
	const posterUrlRaw = getCellText(values[1] && values[1][0]);
	
	// Validate that these look like paths or URLs, not heading text
	const isPathLike = (val) => val && (val.includes('/') || val.includes('.') || val.startsWith('http')) && !val.includes(' ');
	
	let videoUrl = isPathLike(videoUrlRaw) ? normalizeAssetSrc(videoUrlRaw, '') : '';
	let posterUrl = '';
	let heading = '';
	let subtext = '';
	let actionRow = [];

	if (isPathLike(posterUrlRaw)) {
		posterUrl = normalizeAssetSrc(posterUrlRaw, '');
		heading = getCellText(values[2] && values[2][0]);
		subtext = getCellText(values[3] && values[3][0]);
		actionRow = values[4] || [];
	} else {
		// Poster is missing, everything shifted up by one row
		heading = posterUrlRaw;
		subtext = getCellText(values[2] && values[2][0]);
		actionRow = values[3] || [];
	}
	const firstLink = getLink(actionRow[0]);
	const secondLink = getLink(actionRow[1]);

	block.textContent = '';

	const hero = document.createElement('div');
	hero.className = 'hero-video';

	const video = document.createElement('video');
	video.className = 'hero-video__bg';
	video.autoplay = true;
	video.muted = true;
	video.loop = true;
	video.playsInline = true;
	if (posterUrl) video.poster = posterUrl;

	if (videoUrl) {
		const source = document.createElement('source');
		source.src = videoUrl;
		source.type = 'video/mp4';
		video.append(source);
	}

	const gradient = document.createElement('div');
	gradient.className = 'hero-video__gradient';

	const overlay = document.createElement('div');
	overlay.className = 'hero-video__overlay';

	const content = document.createElement('div');
	content.className = 'hero-video__content';

	const title = document.createElement('h1');
	title.textContent = heading;

	const description = document.createElement('p');
	description.textContent = subtext;

	const actions = document.createElement('div');
	actions.className = 'hero-video__actions';

	const primaryButton = createButton(firstLink, 'btn-primary');
	const secondaryButton = createButton(secondLink, 'btn-secondary');
	if (primaryButton) actions.append(primaryButton);
	if (secondaryButton) actions.append(secondaryButton);

	if (primaryButton && secondaryButton) {
		const searchBarBlock = document.createElement('div');
		searchBarBlock.className = 'hero-video__search-bar';
		decorateSearchBar(searchBarBlock);
		content.append(searchBarBlock);
	}

	if (secondaryButton) {
		const href = secondaryButton.getAttribute('href') || '';
		if (href.includes('/signup') || href.includes('signup')) {
			if (isLoggedIn()) {
				secondaryButton.style.display = 'none';
			}
			document.addEventListener('auth:changed', (event) => {
				const loggedIn = event?.detail?.loggedIn;
				secondaryButton.style.display = loggedIn ? 'none' : '';
			});
		}
	}

	content.append(title, description, actions);

	const scrollIndicator = document.createElement('a');
	scrollIndicator.className = 'hero-video__scroll-indicator';
	scrollIndicator.href = '#next-section';
	scrollIndicator.setAttribute('aria-label', 'Scroll down');
	scrollIndicator.append(createChevronIcon());

	hero.append(video, gradient, overlay, content, scrollIndicator);
	block.append(hero);

	// Ensure the parent section is full-width
	const section = block.closest('.section');
	if (section) section.classList.add('full-width');
}
