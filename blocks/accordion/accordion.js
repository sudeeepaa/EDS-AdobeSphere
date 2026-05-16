// Decorates the accordion block as an accessible collapsible list with single-open behaviour.
export default function decorate(block) {
  const items = [];
  [...block.children].forEach((row) => {
    if (row.children.length < 2) return;
    items.push({
      question: row.children[0].textContent.trim(),
      answerNode: row.children[1],
    });
  });

  block.textContent = '';

  if (!items.length) return;

  items.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'accordion-item';

    const btn = document.createElement('button');
    btn.className = 'accordion-question';
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', `accordion-answer-${i}`);
    btn.textContent = item.question;

    const panel = document.createElement('div');
    panel.className = 'accordion-answer';
    panel.id = `accordion-answer-${i}`;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', `accordion-btn-${i}`);

    btn.id = `accordion-btn-${i}`;

    [...item.answerNode.childNodes].forEach((node) => panel.append(node.cloneNode(true)));

    div.append(btn, panel);
    block.append(div);
  });

  block.addEventListener('click', (e) => {
    const btn = e.target.closest('.accordion-question');
    if (!btn) return;
    const item = btn.closest('.accordion-item');
    const wasOpen = item.classList.contains('open');

    block.querySelectorAll('.accordion-item').forEach((el) => {
      el.classList.remove('open');
      el.querySelector('.accordion-question').setAttribute('aria-expanded', 'false');
    });

    if (!wasOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
}
