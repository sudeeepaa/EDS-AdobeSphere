export default function decorate(block) {
  const items = [...block.children];

  block.classList.add('category-filter');

  items.forEach((row) => {
    const text = row.textContent.trim();

    const pill = document.createElement('button');
    pill.className = 'category-pill';
    pill.textContent = text;

    block.appendChild(pill);
  });

  block.querySelectorAll('div').forEach(d => d.remove());
}