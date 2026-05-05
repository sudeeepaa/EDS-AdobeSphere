export default function decorate(block) {
  const rows = [...block.children];
  const data = {};

  rows.forEach((row) => {
    const key = row.children[0]?.textContent.trim().toLowerCase();
    const value = row.children[1]?.textContent.trim();
    if (key) data[key] = value;
  });

  block.textContent = '';

  const section = document.createElement('section');
  section.className = 'hero';

  section.innerHTML = `
    <video class="hero__video" autoplay muted loop playsinline>
      <source src="${data.video}" type="video/mp4">
    </video>

    <div class="hero__overlay"></div>

    <div class="hero__content">
      <h1>${data.title || ""}</h1>
      <p>${data.description || ""}</p>

      <div class="hero__actions">
        ${data["cta primary"] ? `<a href="/explore" class="btn-primary">${data["cta primary"]}</a>` : ""}
        ${data["cta secondary"] ? `<a href="/signup" class="btn-secondary">${data["cta secondary"]}</a>` : ""}
      </div>
    </div>

    ${data["scroll target"] ? `<a href="${data["scroll target"]}" class="hero__scroll">↓</a>` : ""}
  `;

  block.appendChild(section);
}