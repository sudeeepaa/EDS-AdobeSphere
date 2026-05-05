export default function decorate(block) {
  const rows = [...block.children];

  const data = {};

  rows.forEach((row) => {
    const key = row.children[0]?.textContent.trim().toLowerCase();
    const value = row.children[1]?.textContent.trim();

    if (key) data[key] = value;
  });

  block.innerHTML = `
    <section class="hero">
      <video class="hero__video" autoplay muted loop playsinline>
        <source src="${data.video || ''}" type="video/mp4">
      </video>

      <div class="hero__overlay"></div>

      <div class="hero__content">
        <h1>${data.title || ""}</h1>
        <p>${data.description || ""}</p>

        <div class="hero__actions">
          ${data["cta primary"] ? `<a class="btn btn-primary" href="/explore">${data["cta primary"]}</a>` : ""}
          ${data["cta secondary"] ? `<a class="btn btn-secondary" href="/signup">${data["cta secondary"]}</a>` : ""}
        </div>
      </div>

      ${data["scroll target"] ? `
        <a class="hero__scroll" href="${data["scroll target"]}">
          ↓
        </a>
      ` : ""}
    </section>
  `;
}