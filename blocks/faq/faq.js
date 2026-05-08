/**
 * AdobeSphere faq block — reusable accordion.
 *
 * Authoring contract: each row has two cells.
 *   col 1 = question text
 *   col 2 = answer (supports rich text: links, emphasis authored in DA.live)
 *
 * The answer cell's children are moved directly into the answer panel,
 * preserving any links or formatting the author wrote in DA.live.
 */

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
    div.className = 'faq-item';

    const btn = document.createElement('button');
    btn.className = 'faq-question';
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', `faq-answer-${i}`);
    btn.textContent = item.question;

    const panel = document.createElement('div');
    panel.className = 'faq-answer';
    panel.id = `faq-answer-${i}`;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', `faq-btn-${i}`);

    btn.id = `faq-btn-${i}`;

    // Move authored children (preserves DA.live links/emphasis) into the panel.
    // Safe: content comes from trusted DA.live authoring, not user input.
    [...item.answerNode.childNodes].forEach((node) => panel.append(node.cloneNode(true)));

    div.append(btn, panel);
    block.append(div);
  });

  // Single delegated click handler for the whole accordion.
  block.addEventListener('click', (e) => {
    const btn = e.target.closest('.faq-question');
    if (!btn) return;
    const item = btn.closest('.faq-item');
    const wasOpen = item.classList.contains('open');

    // Close all.
    block.querySelectorAll('.faq-item').forEach((el) => {
      el.classList.remove('open');
      el.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    });

    // Re-open if it was closed.
    if (!wasOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
}
