export default function decorate(block) {
  const items = [...block.children];

  const ul = document.createElement('ul');

  items.forEach((row) => {
    const text = row.textContent.trim();

    const li = document.createElement('li');
    li.textContent = text;

    ul.appendChild(li);
  });

  block.innerHTML = '';
  block.appendChild(ul);
}