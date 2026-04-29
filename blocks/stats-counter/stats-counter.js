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

// Dynamic override for about page: load real counts from JSON.
async function loadDynamicStats(statBoxes) {
	try {
		const [eventsRes, blogsRes, creatorsRes] = await Promise.all([
			fetch('/data/events.json'),
			fetch('/data/blogs.json'),
			fetch('/data/creators.json'),
		]);
		const events = await eventsRes.json();
		const blogs = await blogsRes.json();
		const creators = await creatorsRes.json();

		const eventsArr = Array.isArray(events) ? events : (events.data || []);
		const blogsArr = Array.isArray(blogs) ? blogs : (blogs.data || []);
		const creatorsArr = Array.isArray(creators) ? creators : (creators.data || []);

		const dynamicValues = [creatorsArr.length, eventsArr.length, blogsArr.length, 0];
		try {
			const stored = JSON.parse(localStorage.getItem('ae_registered_users') || '0');
			dynamicValues[3] = Number(stored) + creatorsArr.length || creatorsArr.length;
		} catch {
			// Ignore localStorage parsing issues and keep the fallback value.
		}

		statBoxes.forEach((box, i) => {
			if (dynamicValues[i] != null) {
				box.dataset.target = String(dynamicValues[i]);
			}
		});
	} catch (err) {
		// Fall through to static values if fetch fails.
	}
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

export default async function decorate(block) {
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

	await loadDynamicStats(statBoxes);

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
