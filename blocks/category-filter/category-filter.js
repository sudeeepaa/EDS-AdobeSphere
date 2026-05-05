export default function decorate(block) {
  const items = block.querySelectorAll('p');

  items.forEach((el) => {
    const value = el.textContent.trim();
    el.classList.add('category-pill');

    el.addEventListener('click', () => {
      if (value === "All") {
        window.location.href = "/explore";
        return;
      }

      window.location.href =
        `/explore?category=${encodeURIComponent(value)}`;
    });
  });
}