const SVG_NS = 'http://www.w3.org/2000/svg';

function escapeHtml(value) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/\"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function formatDate(isoString) {
	const date = new Date(isoString);
	if (Number.isNaN(date.getTime())) return '';
	return new Intl.DateTimeFormat('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	}).format(date);
}

function formatShortDate(isoString) {
	const date = new Date(isoString);
	if (Number.isNaN(date.getTime())) return '';
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	}).format(date);
}

function truncate(text, maxLength) {
	const value = String(text ?? '');
	const max = Math.max(0, Number(maxLength) || 0);
	if (!max || value.length <= max) return value;
	return `${value.slice(0, max)}...`;
}

function generateId(prefix) {
	const value = String(prefix || 'item').trim() || 'item';
	return `${value}-${Date.now()}`;
}

function validateEmail(email) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function validateUrl(url) {
	const value = String(url || '').trim();
	return /^https:\/\/.+\..+/.test(value);
}

function getCodeBasePath() {
	return (window.hlx && window.hlx.codeBasePath) || '';
}

function appPath(path) {
	if (!path) return '';

	const value = String(path).trim();
	if (!value) return '';
	if (value.startsWith('#') || value.startsWith('?')) return value;
	if (/^(https?:|mailto:|tel:|data:)/i.test(value)) return value;

	const codeBasePath = getCodeBasePath().replace(/\/$/, '');

	if (value.startsWith('/')) {
		if (!codeBasePath || value.startsWith(`${codeBasePath}/`) || value === codeBasePath) {
			return value;
		}
		return `${codeBasePath}${value}`;
	}

	if (!codeBasePath) return `/${value}`;
	return `${codeBasePath}/${value}`;
}

function safeExternalUrl(url) {
	const value = String(url || '').trim();
	if (!value) return '';

	if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return value;
	return '';
}

function fetchJson(pathLike, init) {
	const url = appPath(pathLike);
	return fetch(url, init).then((response) => {
		if (!response || !response.ok) {
			const status = response ? response.status : 0;
			throw new Error(`FETCH_FAILED_${String(status)}`);
		}
		return response.json();
	});
}

function normalizeAssetSrc(src, fallback) {
	if (!src || typeof src !== 'string' || src.trim() === '') return fallback || '';
	const value = src.trim();
	if (value.startsWith('data:')) return value;
	if (value.startsWith('http://') || value.startsWith('https://')) return value;
	return appPath(value);
}

function fileToBase64(file) {
	return new Promise((resolve, reject) => {
		if (!file) {
			reject(new Error('FILE_REQUIRED'));
			return;
		}

		const reader = new FileReader();
		reader.onload = (event) => {
			resolve(String((event.target && event.target.result) || ''));
		};
		reader.onerror = () => {
			reject(new Error('FILE_READ_FAILED'));
		};
		reader.readAsDataURL(file);
	});
}

function showToast(message, type, duration) {
	const toastType = ['success', 'error', 'info'].includes(type) ? type : 'info';
	const timeout = typeof duration === 'number' ? duration : 3000;

	let container = document.getElementById('toast-container');
	if (!container) {
		container = document.createElement('div');
		container.id = 'toast-container';
		document.body.appendChild(container);
	}

	const toast = document.createElement('div');
	toast.className = `toast toast-${toastType}`;
	toast.textContent = String(message ?? '');

	container.appendChild(toast);

	setTimeout(() => {
		toast.classList.add('show');
	}, 50);

	setTimeout(() => {
		toast.classList.remove('show');
		setTimeout(() => {
			if (toast.parentNode) {
				toast.parentNode.removeChild(toast);
			}
		}, 250);
	}, timeout);
}

function createLink(href, className, ariaLabel) {
	const link = document.createElement('a');
	if (className) link.className = className;
	link.href = href;
	if (ariaLabel) link.setAttribute('aria-label', ariaLabel);
	return link;
}

function createImg(src, alt, className) {
	const image = document.createElement('img');
	if (className) image.className = className;
	image.src = src;
	image.alt = alt;
	return image;
}

function createSvgIcon() {
	const svg = document.createElementNS(SVG_NS, 'svg');
	svg.setAttribute('viewBox', '0 0 24 24');
	svg.setAttribute('width', '16');
	svg.setAttribute('height', '16');
	svg.setAttribute('fill', 'currentColor');
	svg.setAttribute('aria-hidden', 'true');

	const path = document.createElementNS(SVG_NS, 'path');
	path.setAttribute('d', 'M6.94 8.5H3.56V20h3.38V8.5zM5.25 3A1.97 1.97 0 1 0 5.2 6.94 1.97 1.97 0 0 0 5.25 3zM20.44 13.6c0-3.37-1.8-4.94-4.2-4.94-1.93 0-2.8 1.06-3.28 1.8V8.5H9.58V20h3.38v-6.14c0-1.62.3-3.2 2.3-3.2 1.98 0 2.01 1.85 2.01 3.3V20h3.37v-6.4z');
	svg.append(path);
	return svg;
}

function buildCardShell(cardClasses, href, ariaLabel) {
	const article = document.createElement('article');
	article.className = cardClasses;

	const link = createLink(href, 'card__full-link', ariaLabel);
	article.append(link);

	const body = document.createElement('div');
	body.className = 'card__body';
	article.append(body);

	return { article, body, link };
}

function buildEventCard(eventItem) {
	const event = eventItem || {};
	const location = [event.location && event.location.city, event.location && event.location.state]
		.filter(Boolean)
		.join(', ');
	const thumbSrc = normalizeAssetSrc(event.thumbnail);
	const href = appPath(`pages/event.html?id=${encodeURIComponent(event.id || '')}`);

	const { article, body, link } = buildCardShell('card reveal', href, event.title || 'Event');

	if (thumbSrc) {
		article.insertBefore(createImg(thumbSrc, event.title || 'Event', 'card__image'), body);
	}

	const badge = document.createElement('span');
	badge.className = 'badge';
	badge.textContent = event.category || 'Event';
	body.append(badge);

	const title = document.createElement('h3');
	title.className = 'card__title';
	title.textContent = event.title || 'Untitled Event';
	body.append(title);

	const meta = document.createElement('div');
	meta.className = 'card__meta';

	const date = document.createElement('span');
	date.textContent = formatShortDate(event.date || '');
	meta.append(date);

	const place = document.createElement('span');
	place.textContent = location || 'TBD';
	meta.append(place);

	body.append(meta);

	const excerpt = document.createElement('p');
	excerpt.className = 'card__excerpt';
	excerpt.textContent = event.shortDescription || '';
	body.append(excerpt);

	link.setAttribute('tabindex', '-1');
	return article;
}

function buildBlogCard(blogItem) {
	const blog = blogItem || {};
	const author = blog.author || {};
	const coverSrc = normalizeAssetSrc(blog.coverImage);
	const authorAvatarSrc = normalizeAssetSrc(author.avatar);
	const href = appPath(`pages/blog.html?id=${encodeURIComponent(blog.id || '')}`);

	const { article, body, link } = buildCardShell('card reveal', href, blog.title || 'Blog');

	if (coverSrc) {
		article.insertBefore(createImg(coverSrc, blog.title || 'Blog', 'card__image'), body);
	}

	const badge = document.createElement('span');
	badge.className = 'badge badge--outline';
	badge.textContent = blog.category || 'Article';
	body.append(badge);

	const title = document.createElement('h3');
	title.className = 'card__title';
	title.textContent = blog.title || 'Untitled Article';
	body.append(title);

	const meta = document.createElement('div');
	meta.className = 'card__meta';

	const resolvedAuthorId = (!author.id || author.id === 'user-created') && blog.ownerIdentity
		? `user:${String(blog.ownerIdentity).trim().toLowerCase()}`
		: author.id;

	const authorWrapper = resolvedAuthorId
		? createLink(appPath(`pages/creator-profile.html?id=${encodeURIComponent(resolvedAuthorId)}`), 'blog-author-inline')
		: document.createElement('span');

	if (authorAvatarSrc) {
		authorWrapper.append(createImg(authorAvatarSrc, author.name || 'Author'));
	}
	authorWrapper.append(document.createTextNode(author.name || 'Author'));
	meta.append(authorWrapper);

	const date = document.createElement('span');
	date.textContent = formatShortDate(blog.publishedDate || '');
	meta.append(date);

	body.append(meta);

	const excerpt = document.createElement('p');
	excerpt.className = 'card__excerpt';
	excerpt.textContent = blog.excerpt || '';
	body.append(excerpt);

	link.setAttribute('tabindex', '-1');
	return article;
}

function buildCreatorCard(creatorItem) {
	const creator = creatorItem || {};
	const avatarSrc = normalizeAssetSrc(creator.avatar);
	const href = appPath(`pages/creator-profile.html?id=${encodeURIComponent(creator.id || '')}`);

	const { article, body, link } = buildCardShell('card creator-card reveal', href, creator.name || 'Creator');

	if (avatarSrc) {
		const avatar = createImg(avatarSrc, creator.name || 'Creator', 'creator-avatar');
		body.append(avatar);
	}

	const title = document.createElement('h3');
	title.className = 'card__title';
	title.textContent = creator.name || 'Unnamed Creator';
	body.append(title);

	const designation = document.createElement('p');
	designation.className = 'text-muted';
	designation.textContent = creator.designation || '';
	body.append(designation);

	const bio = document.createElement('p');
	bio.className = 'card__excerpt';
	bio.textContent = truncate(creator.bio || creator.fullBio || '', 100);
	body.append(bio);

	link.setAttribute('tabindex', '-1');
	return article;
}

function buildSocialLinks(socials, theme) {
	const linkedinUrl = socials && socials.linkedin ? socials.linkedin.trim() : '';
	if (!linkedinUrl || !linkedinUrl.startsWith('https://')) return '';

	const styleClass = theme === 'light' ? 'social-link social-link--light' : 'social-link social-link--dark';
	const link = createLink(linkedinUrl, styleClass, 'linkedin');
	link.target = '_blank';
	link.rel = 'noopener noreferrer';
	link.append(createSvgIcon());
	return link.outerHTML;
}

let revealObserver = null;

function initRevealObserver() {
	const nodes = document.querySelectorAll('.reveal:not(.visible)');
	if (!nodes.length) return revealObserver;

	if (!revealObserver) {
		revealObserver = new IntersectionObserver((entries, observer) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add('visible');
					observer.unobserve(entry.target);
				}
			});
		}, { threshold: 0.1 });
	}

	nodes.forEach((node) => {
		revealObserver.observe(node);
	});

	return revealObserver;
}

function byId(id) {
	return document.getElementById(id);
}

function onReady(fn) {
	if (typeof fn !== 'function') return;
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', fn);
	} else {
		fn();
	}
}

export {
	appPath,
	buildBlogCard,
	buildCreatorCard,
	buildEventCard,
	buildSocialLinks,
	byId,
	escapeHtml,
	fetchJson,
	fileToBase64,
	formatDate,
	formatShortDate,
	generateId,
	initRevealObserver,
	normalizeAssetSrc,
	onReady,
	safeExternalUrl,
	showToast,
	truncate,
	validateEmail,
	validateUrl,
};
