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
	const rows = [...block.querySelectorAll(':scope > div')];
	const values = rows.map((row) => [...row.children]);

	const videoUrl = normalizeAssetSrc(getCellText(values[0] && values[0][0]), '');
	const posterUrl = normalizeAssetSrc(getCellText(values[1] && values[1][0]), '');
	const heading = getCellText(values[2] && values[2][0]);
	const subtext = getCellText(values[3] && values[3][0]);

	const actionRow = values[4] || [];
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

	content.append(title, description, actions);

	const scrollIndicator = document.createElement('a');
	scrollIndicator.className = 'hero-video__scroll-indicator';
	scrollIndicator.href = '#next-section';
	scrollIndicator.setAttribute('aria-label', 'Scroll down');
	scrollIndicator.append(createChevronIcon());

	hero.append(video, gradient, overlay, content, scrollIndicator);
	block.append(hero);
}
