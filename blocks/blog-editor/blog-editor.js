import authInit, { getUser, isLoggedIn } from '../../scripts/auth.js';
import {
	appPath,
	escapeHtml,
	fileToBase64,
	generateId,
	normalizeAssetSrc,
	showToast,
} from '../../scripts/utils.js';

const USERS_KEY = 'ae_users';
const USER_KEY = 'ae_user';
const SESSION_KEY = 'ae_session';
const DRAFT_PREFIX = 'ae_blog_editor_draft';
const AUTOSAVE_DELAY = 500;

const BLOCK_TYPES = [
	{ value: 'paragraph', label: 'Text', helper: 'Paragraph' },
	{ value: 'heading', label: 'Heading', helper: 'Section title' },
	{ value: 'image', label: 'Image', helper: 'Visual block' },
	{ value: 'quote', label: 'Quote', helper: 'Pull quote' },
	{ value: 'list', label: 'List', helper: 'Bulleted list' },
];

const CATEGORY_OPTIONS = [
	'AI & Emerging Technology',
	'Creative Tools & Product Updates',
	'Industry Trends & Thought Leadership',
	'Community / Events / Creator Programs',
];

const state = {
	user: null,
	draft: null,
	blocks: [],
	saveTimer: null,
	shell: null,
	refs: {},
};

function readJson(key, fallback) {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : fallback;
	} catch (error) {
		return fallback;
	}
}

function writeJson(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
		return true;
	} catch (error) {
		return false;
;
}
}

function ensureArray(value) {
	return Array.isArray(value) ? value : [];
}

function ensureUser(user) {
	if (!user || typeof user !== 'object') return null;
	return {
		...user,
		savedBlogs: ensureArray(user.savedBlogs),
		savedEvents: ensureArray(user.savedEvents),
		registeredEvents: ensureArray(user.registeredEvents),
		myBlogs: ensureArray(user.myBlogs),
		avatarSrc: user.avatarSrc || '',
		socials: user.socials && typeof user.socials === 'object' ? user.socials : {},
	};
}

function getCurrentUser() {
	return ensureUser(getUser());
}

function draftKey(email) {
	return `${DRAFT_PREFIX}:${String(email || 'guest').trim().toLowerCase()}`;
}

function persistUser(user) {
	const normalized = ensureUser(user);
	if (!normalized || !normalized.email) return null;

	const users = readJson(USERS_KEY, []);
	const nextUsers = (Array.isArray(users) ? users : [])
		.filter((entry) => entry && typeof entry === 'object')
		.map((entry) => ensureUser(entry) || entry);

	const index = nextUsers.findIndex((entry) => String(entry.email || '').toLowerCase() === String(normalized.email).toLowerCase());
	if (index >= 0) {
		nextUsers[index] = normalized;
	} else {
		nextUsers.unshift(normalized);
	}

	writeJson(USERS_KEY, nextUsers);
	writeJson(USER_KEY, normalized);
	localStorage.setItem(SESSION_KEY, normalized.email);
	document.dispatchEvent(new CustomEvent('auth:changed', {
		detail: {
			loggedIn: true,
			user: normalized,
		},
	}));
	return normalized;
}

function createEmptyDraft(user) {
	return {
		id: generateId('draft'),
		title: '',
		category: CATEGORY_OPTIONS[0],
		excerpt: '',
		coverImage: '',
		featured: false,
		blocks: [],
		prompt: '',
		tone: 'insightful',
		audience: user?.designation || 'creators',
		updatedAt: '',
		publishedAt: '',
	};
}

function normalizeBlock(block) {
	const type = BLOCK_TYPES.some((item) => item.value === block?.type) ? block.type : 'paragraph';
	const base = {
		id: block?.id || generateId('block'),
		type,
	};

	if (type === 'image') {
		return {
			...base,
			src: String(block?.src || ''),
			alt: String(block?.alt || ''),
		};
	}

	if (type === 'quote') {
		return {
			...base,
			text: String(block?.text || ''),
			cite: String(block?.cite || ''),
		};
	}

	if (type === 'list') {
		const items = ensureArray(block?.items).map((item) => String(item || '').trim()).filter(Boolean);
		return {
			...base,
			items: items.length ? items : [''],
		};
	}

	return {
		...base,
		text: String(block?.text || ''),
	};
}

function normalizeDraft(draft, user) {
	const fallback = createEmptyDraft(user);
	const source = draft && typeof draft === 'object' ? draft : fallback;
	return {
		...fallback,
		...source,
		blocks: ensureArray(source.blocks).map(normalizeBlock),
	};
}

function loadDraft(user) {
	const key = draftKey(user?.email);
	return normalizeDraft(readJson(key, null), user);
}

function saveDraft() {
	if (!state.user) return;
	const draft = {
		...state.draft,
		blocks: state.blocks,
		updatedAt: new Date().toISOString(),
	};
	state.draft = draft;
	writeJson(draftKey(state.user.email), draft);
	updateStatus('Draft saved');
}

function queueAutosave() {
	if (state.saveTimer) {
		window.clearTimeout(state.saveTimer);
	}
	updateStatus('Saving draft...');
	state.saveTimer = window.setTimeout(() => {
		saveDraft();
		renderPreview();
	}, AUTOSAVE_DELAY);
}

function setDraftField(field, value) {
	state.draft[field] = value;
	queueAutosave();
	renderPreview();
}

function addBlock(type, insertIndex) {
	const nextBlock = normalizeBlock({ type });
	const index = typeof insertIndex === 'number' ? insertIndex : state.blocks.length;
	state.blocks.splice(index, 0, nextBlock);
	renderBlocks();
	renderPreview();
	queueAutosave();
	requestAnimationFrame(() => {
		const blockNode = state.refs.blocks?.querySelector(`[data-block-id="${nextBlock.id}"]`);
		const firstField = blockNode && blockNode.querySelector('input, textarea, select');
		if (firstField) firstField.focus();
		if (blockNode && blockNode.scrollIntoView) {
			blockNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	});
}

function updateBlock(blockId, patch) {
	state.blocks = state.blocks.map((block) => {
		if (block.id !== blockId) return block;
		return normalizeBlock({ ...block, ...patch, id: block.id });
	});
	queueAutosave();
	renderPreview();
}

function removeBlock(blockId) {
	state.blocks = state.blocks.filter((block) => block.id !== blockId);
	renderBlocks();
	renderPreview();
	queueAutosave();
}

function moveBlock(blockId, direction) {
	const index = state.blocks.findIndex((block) => block.id === blockId);
	if (index < 0) return;
	const targetIndex = index + direction;
	if (targetIndex < 0 || targetIndex >= state.blocks.length) return;
	const nextBlocks = [...state.blocks];
	const [item] = nextBlocks.splice(index, 1);
	nextBlocks.splice(targetIndex, 0, item);
	state.blocks = nextBlocks;
	renderBlocks();
	renderPreview();
	queueAutosave();
}

function duplicateBlock(blockId) {
	const block = state.blocks.find((entry) => entry.id === blockId);
	if (!block) return;
	const clone = normalizeBlock({ ...block, id: generateId('block') });
	const index = state.blocks.findIndex((entry) => entry.id === blockId);
	state.blocks.splice(index + 1, 0, clone);
	renderBlocks();
	renderPreview();
	queueAutosave();
}

function readBlockValue(block) {
	if (block.type === 'image') {
		return {
			src: String(block.src || '').trim(),
			alt: String(block.alt || '').trim(),
		};
	}

	if (block.type === 'quote') {
		return {
			text: String(block.text || '').trim(),
			cite: String(block.cite || '').trim(),
		};
	}

	if (block.type === 'list') {
		return {
			items: String((block.items || []).join('\n')).trim(),
		};
	}

	return {
		text: String(block.text || '').trim(),
	};
}

function createBlockEditor(block, index) {
	const card = document.createElement('article');
	card.className = 'blog-editor__block';
	card.dataset.blockId = block.id;
	card.dataset.blockType = block.type;

	const header = document.createElement('div');
	header.className = 'blog-editor__block-header';

	const labelWrap = document.createElement('div');
	labelWrap.className = 'blog-editor__block-label-wrap';

	const badge = document.createElement('span');
	badge.className = 'blog-editor__block-index';
	badge.textContent = `Block ${index + 1}`;

	const typeLabel = document.createElement('span');
	typeLabel.className = 'blog-editor__block-label';
	typeLabel.textContent = BLOCK_TYPES.find((item) => item.value === block.type)?.label || 'Text';

	labelWrap.append(badge, typeLabel);

	const controls = document.createElement('div');
	controls.className = 'blog-editor__block-controls';

	const typeSelect = document.createElement('select');
	typeSelect.className = 'blog-editor__select';
	BLOCK_TYPES.forEach((item) => {
		const option = document.createElement('option');
		option.value = item.value;
		option.textContent = `${item.label} block`;
		if (item.value === block.type) option.selected = true;
		typeSelect.append(option);
	});

	const upButton = document.createElement('button');
	upButton.type = 'button';
	upButton.className = 'btn btn-ghost blog-editor__icon-button';
	upButton.textContent = '↑';
	upButton.setAttribute('aria-label', 'Move block up');

	const downButton = document.createElement('button');
	downButton.type = 'button';
	downButton.className = 'btn btn-ghost blog-editor__icon-button';
	downButton.textContent = '↓';
	downButton.setAttribute('aria-label', 'Move block down');

	const duplicateButton = document.createElement('button');
	duplicateButton.type = 'button';
	duplicateButton.className = 'btn btn-ghost blog-editor__icon-button';
	duplicateButton.textContent = '+';
	duplicateButton.setAttribute('aria-label', 'Duplicate block');

	const removeButton = document.createElement('button');
	removeButton.type = 'button';
	removeButton.className = 'btn btn-ghost blog-editor__icon-button blog-editor__icon-button--danger';
	removeButton.textContent = '×';
	removeButton.setAttribute('aria-label', 'Remove block');

	controls.append(typeSelect, upButton, downButton, duplicateButton, removeButton);
	header.append(labelWrap, controls);

	const body = document.createElement('div');
	body.className = 'blog-editor__block-body';

	const helper = document.createElement('p');
	helper.className = 'blog-editor__block-helper';
	helper.textContent = BLOCK_TYPES.find((item) => item.value === block.type)?.helper || 'Paragraph';
	body.append(helper);

	if (block.type === 'image') {
		const grid = document.createElement('div');
		grid.className = 'blog-editor__field-grid';

		const srcField = document.createElement('label');
		srcField.className = 'blog-editor__field';
		srcField.innerHTML = '<span>Image source</span>';
		const srcInput = document.createElement('input');
		srcInput.className = 'blog-editor__input';
		srcInput.type = 'text';
		srcInput.placeholder = 'https://... or /media/...';
		srcInput.value = block.src || '';
		srcField.append(srcInput);

		const altField = document.createElement('label');
		altField.className = 'blog-editor__field';
		altField.innerHTML = '<span>Alt text</span>';
		const altInput = document.createElement('input');
		altInput.className = 'blog-editor__input';
		altInput.type = 'text';
		altInput.placeholder = 'Describe the image';
		altInput.value = block.alt || '';
		altField.append(altInput);

		grid.append(srcField, altField);

		const uploadRow = document.createElement('div');
		uploadRow.className = 'blog-editor__upload-row';

		const uploadButton = document.createElement('button');
		uploadButton.type = 'button';
		uploadButton.className = 'btn btn-secondary';
		uploadButton.textContent = 'Upload image';

		const uploadInput = document.createElement('input');
		uploadInput.type = 'file';
		uploadInput.accept = 'image/*';
		uploadInput.hidden = true;

		uploadRow.append(uploadButton, uploadInput);
		body.append(grid, uploadRow);

		srcInput.addEventListener('input', () => updateBlock(block.id, { src: srcInput.value }));
		altInput.addEventListener('input', () => updateBlock(block.id, { alt: altInput.value }));
		uploadButton.addEventListener('click', () => uploadInput.click());
		uploadInput.addEventListener('change', async () => {
			const file = uploadInput.files && uploadInput.files[0];
			if (!file) return;
			try {
				const dataUrl = await fileToBase64(file);
				updateBlock(block.id, { src: dataUrl, alt: altInput.value || file.name });
				srcInput.value = dataUrl;
				showToast('Image inserted into the block.', 'success');
			} catch (error) {
				showToast('Could not read the selected image.', 'error');
			}
		});
	} else if (block.type === 'list') {
		const field = document.createElement('label');
		field.className = 'blog-editor__field';
		field.innerHTML = '<span>List items</span>';
		const textarea = document.createElement('textarea');
		textarea.className = 'blog-editor__textarea';
		textarea.rows = 6;
		textarea.placeholder = 'One item per line';
		textarea.value = ensureArray(block.items).join('\n');
		field.append(textarea);
		body.append(field);
		textarea.addEventListener('input', () => {
			const items = textarea.value.split(/\n+/).map((entry) => entry.trim()).filter(Boolean);
			updateBlock(block.id, { items: items.length ? items : [''] });
		});
	} else if (block.type === 'quote') {
		const quoteField = document.createElement('label');
		quoteField.className = 'blog-editor__field';
		quoteField.innerHTML = '<span>Quote</span>';
		const quoteInput = document.createElement('textarea');
		quoteInput.className = 'blog-editor__textarea';
		quoteInput.rows = 5;
		quoteInput.placeholder = 'Write a quote or pulled insight...';
		quoteInput.value = block.text || '';
		quoteField.append(quoteInput);

		const citeField = document.createElement('label');
		citeField.className = 'blog-editor__field';
		citeField.innerHTML = '<span>Attribution <span class="blog-editor__field-hint">optional</span></span>';
		const citeInput = document.createElement('input');
		citeInput.className = 'blog-editor__input';
		citeInput.type = 'text';
		citeInput.placeholder = 'Source, speaker, or inspiration';
		citeInput.value = block.cite || '';
		citeField.append(citeInput);

		body.append(quoteField, citeField);
		quoteInput.addEventListener('input', () => updateBlock(block.id, { text: quoteInput.value }));
		citeInput.addEventListener('input', () => updateBlock(block.id, { cite: citeInput.value }));
	} else {
		const field = document.createElement('label');
		field.className = 'blog-editor__field';
		field.innerHTML = `<span>${block.type === 'heading' ? 'Heading' : 'Paragraph'}</span>`;
		const textarea = document.createElement(block.type === 'heading' ? 'input' : 'textarea');
		textarea.className = block.type === 'heading' ? 'blog-editor__input' : 'blog-editor__textarea';
		if (block.type !== 'heading') textarea.rows = 6;
		textarea.placeholder = block.type === 'heading'
			? 'Write a section heading'
			: 'Write a paragraph...';
		if (block.type === 'heading') {
			textarea.type = 'text';
			textarea.value = block.text || '';
			textarea.addEventListener('input', () => updateBlock(block.id, { text: textarea.value }));
		} else {
			textarea.value = block.text || '';
			textarea.addEventListener('input', () => updateBlock(block.id, { text: textarea.value }));
		}
		field.append(textarea);
		body.append(field);
	}

	typeSelect.addEventListener('change', () => {
		state.blocks = state.blocks.map((entry) => (entry.id === block.id ? normalizeBlock({ ...entry, type: typeSelect.value }) : entry));
		renderBlocks();
		renderPreview();
		queueAutosave();
	});

	upButton.addEventListener('click', () => moveBlock(block.id, -1));
	downButton.addEventListener('click', () => moveBlock(block.id, 1));
	duplicateButton.addEventListener('click', () => duplicateBlock(block.id));
	removeButton.addEventListener('click', () => removeBlock(block.id));

	card.append(header, body);
	return card;
}

function renderBlocks() {
	if (!state.refs.blocks) return;
	state.refs.blocks.innerHTML = '';

	if (!state.blocks.length) {
		const empty = document.createElement('div');
		empty.className = 'blog-editor__empty-state';
		empty.innerHTML = '<strong>Start building your story.</strong><span>Use the toolbar above to add a text, heading, image, quote, or list block.</span>';
		state.refs.blocks.append(empty);
		return;
	}

	state.blocks.forEach((block, index) => {
		state.refs.blocks.append(createBlockEditor(block, index));
	});
}

function getRenderedExcerpt() {
	const explicit = String(state.draft.excerpt || '').trim();
	if (explicit) return explicit;

	const firstParagraph = state.blocks.find((block) => block.type === 'paragraph' && String(block.text || '').trim());
	if (firstParagraph) {
		return String(firstParagraph.text).trim();
	}

	const textFragments = state.blocks
		.map((block) => {
			if (block.type === 'heading' || block.type === 'paragraph') {
				return String(block.text || '').trim();
			}
			if (block.type === 'quote') {
				return String(block.text || '').trim();
			}
			return '';
		})
		.filter(Boolean)
		.join(' ')
		.trim();

	return textFragments.slice(0, 180);
}

function serializeBlocks() {
	return state.blocks
		.map((block) => {
			if (block.type === 'image') {
				const src = String(block.src || '').trim();
				if (!src) return null;
				return {
					type: 'image',
					src,
					alt: String(block.alt || '').trim(),
				};
			}

			if (block.type === 'list') {
				const items = ensureArray(block.items).map((item) => String(item || '').trim()).filter(Boolean);
				if (!items.length) return null;
				return {
					type: 'list',
					items,
				};
			}

			if (block.type === 'quote') {
				const text = String(block.text || '').trim();
				if (!text) return null;
				return {
					type: 'quote',
					text,
					cite: String(block.cite || '').trim(),
				};
			}

			const text = String(block.text || '').trim();
			if (!text) return null;
			return {
				type: block.type,
				text,
			};
		})
		.filter(Boolean);
}

function createPreviewBlock(block) {
	const article = document.createElement('article');
	article.className = `blog-editor__preview-block blog-editor__preview-block--${block.type}`;

	if (block.type === 'heading') {
		const heading = document.createElement('h3');
		heading.textContent = block.text || 'Heading';
		article.append(heading);
		return article;
	}

	if (block.type === 'image') {
		const figure = document.createElement('figure');
		figure.className = 'blog-editor__figure';
		const image = document.createElement('img');
		image.src = normalizeAssetSrc(block.src, '');
		image.alt = block.alt || 'Inline image';
		image.loading = 'lazy';
		figure.append(image);
		if (block.alt) {
			const caption = document.createElement('figcaption');
			caption.textContent = block.alt;
			figure.append(caption);
		}
		article.append(figure);
		return article;
	}

	if (block.type === 'quote') {
		const quote = document.createElement('blockquote');
		quote.textContent = block.text || 'Quote';
		article.append(quote);
		if (block.cite) {
			const cite = document.createElement('cite');
			cite.textContent = block.cite;
			article.append(cite);
		}
		return article;
	}

	if (block.type === 'list') {
		const list = document.createElement('ul');
		ensureArray(block.items).map((item) => String(item || '').trim()).filter(Boolean).forEach((item) => {
			const li = document.createElement('li');
			li.textContent = item;
			list.append(li);
		});
		article.append(list);
		return article;
	}

	const paragraph = document.createElement('p');
	paragraph.textContent = block.text || 'Paragraph';
	article.append(paragraph);
	return article;
}

function renderPreview() {
	if (!state.refs.preview) return;
	state.refs.preview.innerHTML = '';

	const previewCard = document.createElement('div');
	previewCard.className = 'blog-editor__preview-card';

	if (state.draft.coverImage) {
		const cover = document.createElement('div');
		cover.className = 'blog-editor__preview-cover';
		const image = document.createElement('img');
		image.src = normalizeAssetSrc(state.draft.coverImage, '');
		image.alt = state.draft.title || 'Cover image';
		image.loading = 'lazy';
		cover.append(image);
		previewCard.append(cover);
	} else {
		const cover = document.createElement('div');
		cover.className = 'blog-editor__preview-cover blog-editor__preview-cover--empty';
		cover.textContent = 'Cover image preview';
		previewCard.append(cover);
	}

	const previewBody = document.createElement('div');
	previewBody.className = 'blog-editor__preview-body';

	const title = document.createElement('h2');
	title.textContent = state.draft.title || 'Untitled draft';
	previewBody.append(title);

	const meta = document.createElement('div');
	meta.className = 'blog-editor__preview-meta';

	const category = document.createElement('span');
	category.textContent = state.draft.category || 'Uncategorized';
	meta.append(category);

	const date = document.createElement('span');
	date.textContent = state.draft.publishedAt ? new Date(state.draft.publishedAt).toLocaleDateString() : 'Draft';
	meta.append(date);

	previewBody.append(meta);

	const excerpt = document.createElement('p');
	excerpt.className = 'blog-editor__preview-excerpt';
	excerpt.textContent = getRenderedExcerpt() || 'Your excerpt will appear here.';
	previewBody.append(excerpt);

	const content = document.createElement('div');
	content.className = 'blog-editor__preview-content';
	const renderedBlocks = serializeBlocks();

	if (!renderedBlocks.length) {
		const empty = document.createElement('div');
		empty.className = 'blog-editor__preview-empty';
		empty.textContent = 'Add blocks to see the live preview.';
		content.append(empty);
	} else {
		renderedBlocks.forEach((block) => content.append(createPreviewBlock(block)));
	}

	previewBody.append(content);
	previewCard.append(previewBody);
	state.refs.preview.append(previewCard);
}

function updateStatus(message) {
	if (!state.refs.status) return;
	state.refs.status.textContent = message;
}

function syncMetaFields() {
	if (!state.refs.title) return;
	state.refs.title.value = state.draft.title || '';
	state.refs.category.value = state.draft.category || CATEGORY_OPTIONS[0];
	state.refs.excerpt.value = state.draft.excerpt || '';
	state.refs.coverImage.value = state.draft.coverImage || '';
	state.refs.prompt.value = state.draft.prompt || '';
	state.refs.tone.value = state.draft.tone || 'insightful';
	state.refs.audience.value = state.draft.audience || '';
}

function renderAiSuggestions() {
	if (!state.refs.aiSuggestions) return;
	const prompt = String(state.refs.prompt.value || '').trim();
	const topic = prompt || state.draft.title || 'Creative workflows';
	const tone = String(state.refs.tone.value || 'insightful');
	const audience = String(state.refs.audience.value || '').trim() || 'creators';

	state.refs.aiSuggestions.innerHTML = '';

	const heading = document.createElement('h4');
	heading.textContent = 'Generated outline';
	state.refs.aiSuggestions.append(heading);

	const list = document.createElement('ol');
	list.className = 'blog-editor__suggestion-list';
	[
		`${topic} and why it matters`,
		`A ${tone} introduction for ${audience}`,
		'Key takeaways to guide the reader',
		'Practical examples and next steps',
	].forEach((item) => {
		const li = document.createElement('li');
		li.textContent = item;
		list.append(li);
	});
	state.refs.aiSuggestions.append(list);
}

function generateAiDraft() {
	const prompt = String(state.refs.prompt.value || '').trim();
	const tone = String(state.refs.tone.value || 'insightful');
	const audience = String(state.refs.audience.value || '').trim() || 'creators';
	const topic = prompt || state.draft.title || 'Modern creative workflows';

	const generatedBlocks = [
		normalizeBlock({
			type: 'heading',
			text: `${topic}: a ${tone} guide for ${audience}`,
		}),
		normalizeBlock({
			type: 'paragraph',
			text: `Use this opening paragraph to explain why ${topic.toLowerCase()} matters to ${audience} and how it improves their day-to-day workflow.`,
		}),
		normalizeBlock({
			type: 'list',
			items: [
				'What inspired the topic',
				'How it works in practice',
				'Tips the reader can apply right away',
			],
		}),
		normalizeBlock({
			type: 'quote',
			text: `${topic} works best when it stays practical, specific, and easy to act on.`,
			cite: 'AI-assisted outline',
		}),
	];

	state.blocks = [...state.blocks, ...generatedBlocks];
	renderBlocks();
	renderPreview();
	queueAutosave();
	showToast('Generated outline added to the editor.', 'success');
}

function buildMetaField(label, input) {
	const field = document.createElement('label');
	field.className = 'blog-editor__field';
	const caption = document.createElement('span');
	caption.textContent = label;
	field.append(caption, input);
	return field;
}

function buildEditorShell() {
	const shell = document.createElement('div');
	shell.className = 'blog-editor__shell';
	shell.innerHTML = `
		<header class="blog-editor__header">
			<div class="blog-editor__header-copy">
				<p class="blog-editor__eyebrow">Blog Editor</p>
				<h1 class="blog-editor__title">Build a story block by block</h1>
				<p class="blog-editor__subtitle">Create structured posts with text, headings, images, quotes, and lists. Drafts autosave locally while you work.</p>
				<p class="blog-editor__status" data-blog-editor-status>Draft loaded</p>
			</div>
			<div class="blog-editor__header-actions">
				<button type="button" class="btn btn-ghost" data-blog-editor-action="reset">Discard draft</button>
				<button type="button" class="btn btn-primary" data-blog-editor-action="publish">Publish blog</button>
			</div>
		</header>

		<div class="blog-editor__layout">
			<main class="blog-editor__main">
				<section class="blog-editor__panel blog-editor__panel--meta">
					<div class="blog-editor__panel-header">
						<div>
							<h2>Post details</h2>
							<p>These fields power the cards and preview.</p>
						</div>
						<span class="blog-editor__panel-chip">Autosave on</span>
					</div>
					<div class="blog-editor__meta-grid">
						<div class="blog-editor__field-group" data-blog-editor-meta></div>
					</div>
				</section>

				<section class="blog-editor__panel blog-editor__panel--content">
					<div class="blog-editor__panel-header">
						<div>
							<h2>Content blocks</h2>
							<p>Add, reorder, duplicate, and remove blocks as you build.</p>
						</div>
						<div class="blog-editor__toolbar" data-blog-editor-toolbar></div>
					</div>
					<div class="blog-editor__blocks" data-blog-editor-blocks></div>
				</section>
			</main>

			<aside class="blog-editor__sidebar">
				<section class="blog-editor__panel blog-editor__panel--preview">
					<div class="blog-editor__panel-header">
						<div>
							<h2>Live preview</h2>
							<p>See how the post reads as you edit.</p>
						</div>
					</div>
					<div class="blog-editor__preview" data-blog-editor-preview></div>
				</section>

				<section class="blog-editor__panel blog-editor__panel--ai">
					<div class="blog-editor__panel-header">
						<div>
							<h2>AI prompt</h2>
							<p>Generate a starter outline from a topic or title.</p>
						</div>
					</div>
					<div class="blog-editor__ai-form">
						<label class="blog-editor__field">
							<span>Prompt</span>
							<textarea class="blog-editor__textarea" rows="4" data-blog-editor-prompt placeholder="For example: AI-assisted workflows for creative teams"></textarea>
						</label>
						<div class="blog-editor__field-grid blog-editor__field-grid--split">
							<label class="blog-editor__field">
								<span>Tone</span>
								<select class="blog-editor__select" data-blog-editor-tone>
									<option value="insightful">Insightful</option>
									<option value="practical">Practical</option>
									<option value="playful">Playful</option>
									<option value="bold">Bold</option>
								</select>
							</label>
							<label class="blog-editor__field">
								<span>Audience</span>
								<input class="blog-editor__input" type="text" data-blog-editor-audience placeholder="Designers, creators, teams">
							</label>
						</div>
						<div class="blog-editor__ai-actions">
							<button type="button" class="btn btn-secondary" data-blog-editor-action="generate">Generate outline</button>
							<button type="button" class="btn btn-ghost" data-blog-editor-action="insert-text">Insert text block</button>
						</div>
						<div class="blog-editor__ai-suggestions" data-blog-editor-ai-suggestions></div>
					</div>
				</section>

				<section class="blog-editor__panel blog-editor__panel--tips">
					<div class="blog-editor__panel-header">
						<div>
							<h2>Publishing tips</h2>
							<p>Keep the draft structured and discoverable.</p>
						</div>
					</div>
					<ul class="blog-editor__tips-list">
						<li>Add a strong title, category, excerpt, and cover image.</li>
						<li>Use headings to break longer posts into clear sections.</li>
						<li>Images can be uploaded or linked from `/media/`.</li>
						<li>Published posts are saved to your profile for later editing.</li>
					</ul>
				</section>
			</aside>
		</div>
	`;

	return shell;
}

function bindMetaFields() {
	const meta = state.refs.meta;
	if (!meta) return;

	const titleInput = document.createElement('input');
	titleInput.className = 'blog-editor__input';
	titleInput.type = 'text';
	titleInput.placeholder = 'Write a strong headline';
	titleInput.value = state.draft.title || '';

	const categorySelect = document.createElement('select');
	categorySelect.className = 'blog-editor__select';
	const categoryDefault = document.createElement('option');
	categoryDefault.value = '';
	categoryDefault.textContent = 'Select a category';
	categorySelect.append(categoryDefault);
	CATEGORY_OPTIONS.forEach((category) => {
		const option = document.createElement('option');
		option.value = category;
		option.textContent = category;
		categorySelect.append(option);
	});
	categorySelect.value = state.draft.category || '';

	const excerptInput = document.createElement('textarea');
	excerptInput.className = 'blog-editor__textarea';
	excerptInput.rows = 4;
	excerptInput.placeholder = 'Write a concise description for cards and previews';
	excerptInput.value = state.draft.excerpt || '';

	const coverInput = document.createElement('input');
	coverInput.className = 'blog-editor__input';
	coverInput.type = 'text';
	coverInput.placeholder = 'https://... or /media/...';
	coverInput.value = state.draft.coverImage || '';

	const coverUpload = document.createElement('input');
	coverUpload.type = 'file';
	coverUpload.accept = 'image/*';
	coverUpload.hidden = true;

	const coverButton = document.createElement('button');
	coverButton.type = 'button';
	coverButton.className = 'btn btn-secondary';
	coverButton.textContent = 'Upload cover';

	const coverRow = document.createElement('div');
	coverRow.className = 'blog-editor__upload-row';
	coverRow.append(coverButton, coverUpload);

	const authorBox = document.createElement('div');
	authorBox.className = 'blog-editor__author-box';
	authorBox.innerHTML = `
		<strong>${escapeHtml(state.user?.name || 'Your profile')}</strong>
		<span>${escapeHtml(state.user?.designation || state.user?.email || '')}</span>
	`;

	const grid = document.createElement('div');
	grid.className = 'blog-editor__meta-stack';

	const titleField = buildMetaField('Title', titleInput);
	const categoryField = buildMetaField('Category', categorySelect);
	const excerptField = buildMetaField('Excerpt', excerptInput);
	const coverField = buildMetaField('Cover image', coverInput);

	grid.append(titleField, categoryField, excerptField, coverField, coverRow, authorBox);
	meta.append(grid);

	titleInput.addEventListener('input', () => setDraftField('title', titleInput.value));
	categorySelect.addEventListener('change', () => setDraftField('category', categorySelect.value));
	excerptInput.addEventListener('input', () => setDraftField('excerpt', excerptInput.value));
	coverInput.addEventListener('input', () => setDraftField('coverImage', coverInput.value));
	coverButton.addEventListener('click', () => coverUpload.click());
	coverUpload.addEventListener('change', async () => {
		const file = coverUpload.files && coverUpload.files[0];
		if (!file) return;
		try {
			const dataUrl = await fileToBase64(file);
			coverInput.value = dataUrl;
			setDraftField('coverImage', dataUrl);
			showToast('Cover image uploaded.', 'success');
		} catch (error) {
			showToast('Could not read the cover image.', 'error');
		}
	});

	state.refs.title = titleInput;
	state.refs.category = categorySelect;
	state.refs.excerpt = excerptInput;
	state.refs.coverImage = coverInput;
}

function bindToolbar() {
	if (!state.refs.toolbar) return;
	state.refs.toolbar.innerHTML = '';

	BLOCK_TYPES.forEach((blockType) => {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'btn btn-ghost blog-editor__toolbar-button';
		button.textContent = `+ ${blockType.label}`;
		button.addEventListener('click', () => addBlock(blockType.value));
		state.refs.toolbar.append(button);
	});
}

function bindActions() {
	const publish = state.shell.querySelector('[data-blog-editor-action="publish"]');
	const reset = state.shell.querySelector('[data-blog-editor-action="reset"]');
	const insertText = state.shell.querySelector('[data-blog-editor-action="insert-text"]');
	const generate = state.shell.querySelector('[data-blog-editor-action="generate"]');

	publish.addEventListener('click', publishBlog);
	reset.addEventListener('click', resetDraft);
	insertText.addEventListener('click', () => addBlock('paragraph'));
	generate.addEventListener('click', generateAiDraft);

	state.refs.prompt = state.shell.querySelector('[data-blog-editor-prompt]');
	state.refs.tone = state.shell.querySelector('[data-blog-editor-tone]');
	state.refs.audience = state.shell.querySelector('[data-blog-editor-audience]');
	state.refs.aiSuggestions = state.shell.querySelector('[data-blog-editor-ai-suggestions]');
	state.refs.status = state.shell.querySelector('[data-blog-editor-status]');
	state.refs.blocks = state.shell.querySelector('[data-blog-editor-blocks]');
	state.refs.preview = state.shell.querySelector('[data-blog-editor-preview]');
	state.refs.toolbar = state.shell.querySelector('[data-blog-editor-toolbar]');
	state.refs.meta = state.shell.querySelector('[data-blog-editor-meta]');

	state.refs.prompt.addEventListener('input', () => {
		state.draft.prompt = state.refs.prompt.value;
		queueAutosave();
		renderAiSuggestions();
	});
	state.refs.tone.addEventListener('change', () => {
		state.draft.tone = state.refs.tone.value;
		queueAutosave();
		renderAiSuggestions();
	});
	state.refs.audience.addEventListener('input', () => {
		state.draft.audience = state.refs.audience.value;
		queueAutosave();
		renderAiSuggestions();
	});
}

function resetDraft() {
	state.draft = createEmptyDraft(state.user);
	state.blocks = [];
	syncMetaFields();
	renderBlocks();
	renderPreview();
	queueAutosave();
	showToast('Draft cleared.', 'info');
}

function getCurrentDraftPath() {
	return appPath('/blog-editor');
}

function publishBlog() {
	const title = String(state.refs.title.value || '').trim();
	const category = String(state.refs.category.value || '').trim();
	const excerpt = String(state.refs.excerpt.value || '').trim();
	const coverImage = String(state.refs.coverImage.value || '').trim();
	const content = serializeBlocks();

	if (!title) {
		showToast('Add a title before publishing.', 'error');
		state.refs.title.focus();
		return;
	}

	if (!category) {
		showToast('Choose a category before publishing.', 'error');
		state.refs.category.focus();
		return;
	}

	if (!coverImage) {
		showToast('Add a cover image before publishing.', 'error');
		state.refs.coverImage.focus();
		return;
	}

	if (!content.length) {
		showToast('Add at least one content block before publishing.', 'error');
		return;
	}

	const publishedDate = new Date().toISOString();
	const blog = {
		id: state.draft.id || generateId('blog'),
		title,
		category,
		excerpt: excerpt || getRenderedExcerpt(),
		coverImage,
		content,
		featured: false,
		userSubmitted: true,
		publishedDate,
		author: {
			id: state.user?.email || 'user-submitted',
			name: state.user?.name || 'Community Creator',
			designation: state.user?.designation || 'AdobeSphere Contributor',
			avatar: state.user?.avatarSrc || '',
			bio: state.user?.bio || '',
		},
	};

	const nextUser = ensureUser({
		...state.user,
		myBlogs: (() => {
			const existing = ensureArray(state.user?.myBlogs);
			const nextBlogs = existing.filter((entry) => entry.id !== blog.id);
			return [blog, ...nextBlogs];
		})(),
	});

	state.user = persistUser(nextUser);
	state.draft = {
		...state.draft,
		id: blog.id,
		title,
		category,
		excerpt: blog.excerpt,
		coverImage,
		publishedAt: publishedDate,
		blocks: state.blocks,
	};
	saveDraft();
	renderPreview();
	showToast('Blog published to your profile.', 'success');
	updateStatus('Published and saved to your profile');
}

function handleAuthChange(event) {
	const loggedIn = event?.detail?.loggedIn;
	if (!loggedIn) {
		window.location.href = appPath('/login?redirect=/blog-editor');
	}
}

export default async function decorate(block) {
	authInit();

	if (!isLoggedIn()) {
		window.location.href = appPath('/login?redirect=/blog-editor');
		return;
	}

	state.user = getCurrentUser();
	if (!state.user) {
		window.location.href = appPath('/login?redirect=/blog-editor');
		return;
	}

	state.draft = loadDraft(state.user);
	state.blocks = ensureArray(state.draft.blocks).map(normalizeBlock);
	state.draft.blocks = state.blocks;

	block.classList.add('blog-editor');
	block.textContent = '';
	state.shell = buildEditorShell();
	block.append(state.shell);

	bindMetaFields();
	bindToolbar();
	bindActions();
	syncMetaFields();
	renderBlocks();
	renderPreview();
	renderAiSuggestions();
	updateStatus('Draft loaded');

	window.addEventListener('beforeunload', saveDraft);
	document.addEventListener('auth:changed', handleAuthChange);
	window.setTimeout(() => {
		const firstField = state.refs.title;
		if (firstField) firstField.focus();
	}, 0);
}
