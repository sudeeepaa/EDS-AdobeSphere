/**
 * FAQ Block
 * Renders frequently asked questions from about-content.json
 */

async function loadFaqData() {
	try {
		const response = await fetch('/data/about-content.json');
		if (!response.ok) {
			throw new Error(`Failed to load FAQ data (${response.status})`);
		}
		const data = await response.json();
		return data.faq || [];
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Failed to load FAQ data:', error);
		return [];
	}
}

function createFaqItem(item) {
	const faqItem = document.createElement('div');
	faqItem.className = 'faq__item';

	const question = document.createElement('button');
	question.className = 'faq__question';
	question.type = 'button';
	question.setAttribute('aria-expanded', 'false');
	question.innerHTML = `
		<span class="faq__question-text">${item.question}</span>
		<span class="faq__icon" aria-hidden="true">
			<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M19 12H5M12 19l-7-7 7-7"></path>
			</svg>
		</span>
	`;

	const answer = document.createElement('div');
	answer.className = 'faq__answer';
	answer.setAttribute('hidden', '');
	answer.innerHTML = item.answer;

	question.addEventListener('click', () => {
		const isExpanded = question.getAttribute('aria-expanded') === 'true';
		question.setAttribute('aria-expanded', !isExpanded);

		if (isExpanded) {
			answer.setAttribute('hidden', '');
		} else {
			answer.removeAttribute('hidden');
		}
	});

	faqItem.append(question, answer);
	return faqItem;
}

export default async function decorate(block) {
	block.classList.add('faq');
	block.textContent = '';

	const faqData = await loadFaqData();

	if (!faqData || faqData.length === 0) {
		const empty = document.createElement('div');
		empty.className = 'faq__empty';
		empty.textContent = 'No FAQs available right now.';
		block.append(empty);
		return;
	}

	const container = document.createElement('div');
	container.className = 'faq__container';

	faqData.forEach((item) => {
		container.append(createFaqItem(item));
	});

	block.append(container);
}
