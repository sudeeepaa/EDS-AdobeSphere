const DEFAULT_DURATION = 1500;

function easeOutQuad(t) {
	return 1 - (1 - t) * (1 - t);
}

function parseStats(block) {
	return [...block.querySelectorAll('tr')]
		.map((row) => [...row.querySelectorAll('td, th')].map((cell) => cell.textContent.trim()))
		.filter((cells) => cells.length >= 4)
		.map(([targetText, label, linkText, linkHref]) => ({
			target: Number.parseInt(targetText, 10) || 0,
			label,
			linkText,
			linkHref,
		}));
}

function buildStatBox(stat) {
	const statBox = document.createElement('div');
	statBox.className = 'stat-box';
	statBox.dataset.target = String(stat.target);

	const statNumber = document.createElement('span');
	statNumber.className = 'stat-number';
	statNumber.textContent = '0';

	const statLabel = document.createElement('p');
	statLabel.className = 'stat-label';
	statLabel.textContent = stat.label;

	const statLink = document.createElement('a');
	statLink.href = stat.linkHref || '#';
	statLink.textContent = stat.linkText;

	statBox.append(statNumber, statLabel, statLink);
	return statBox;
}

function animateCounter(box, duration) {
	const numberEl = box.querySelector('.stat-number');
	const target = Number.parseInt(box.dataset.target, 10) || 0;
	const startTime = performance.now();

	function tick(now) {
		const progress = Math.min((now - startTime) / duration, 1);
		const value = Math.floor(target * easeOutQuad(progress));
		numberEl.textContent = String(progress >= 1 ? target : value);

		if (progress < 1) {
			requestAnimationFrame(tick);
		}
	}

	requestAnimationFrame(tick);
}

export default function decorate(block) {
	const stats = parseStats(block);
	block.innerHTML = '';

	const statsCounter = document.createElement('div');
	statsCounter.className = 'stats-counter';

	const statBoxes = stats.map((stat) => buildStatBox(stat));
	statsCounter.append(...statBoxes);
	block.append(statsCounter);

	if (!statBoxes.length) {
		return;
	}

	let animated = false;
	const runAnimation = () => {
		if (animated) return;
		animated = true;
		statBoxes.forEach((box) => animateCounter(box, DEFAULT_DURATION));
	};

	if (!('IntersectionObserver' in window)) {
		runAnimation();
		return;
	}

	const observer = new IntersectionObserver((entries) => {
		if (entries.some((entry) => entry.isIntersecting)) {
			runAnimation();
			observer.disconnect();
		}
	}, {
		threshold: 0.4,
	});

	observer.observe(block);
}
