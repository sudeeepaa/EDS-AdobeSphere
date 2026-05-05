export default function decorate(block) {
  const rows = [...block.children];
  const data = {};

  // Extract data
  rows.forEach((row) => {
    const cols = [...row.children];
    if (cols.length < 2) return;

    const key = cols[0].textContent.trim().toLowerCase();
    const value = cols[1].textContent.trim();

    if (key) data[key] = value;
  });

  // Clear block safely
  block.textContent = "";

  // Create structure WITHOUT template injection
  const hero = document.createElement("div");
  hero.className = "hero";

  // VIDEO
  const video = document.createElement("video");
  video.className = "hero__video";
  video.autoplay = true;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;

  const source = document.createElement("source");
  source.src = data.video || "/assets/videos/home-hero-background.mp4";
  source.type = "video/mp4";

  video.appendChild(source);

  // OVERLAY
  const overlay = document.createElement("div");
  overlay.className = "hero__overlay";

  // CONTENT
  const content = document.createElement("div");
  content.className = "hero__content";

  const h1 = document.createElement("h1");
  h1.textContent = data.title || "Create. Explore. Inspire.";

  const p = document.createElement("p");
  p.textContent = data.description || "Discover Adobe events and creators.";

  content.append(h1, p);

  // BUTTONS
  const actions = document.createElement("div");
  actions.className = "hero__actions";

  if (data["cta primary"]) {
    const btn = document.createElement("a");
    btn.className = "btn btn-primary";
    btn.href = "/explore";
    btn.textContent = data["cta primary"];
    actions.appendChild(btn);
  }

  if (data["cta secondary"]) {
    const btn = document.createElement("a");
    btn.className = "btn btn-secondary";
    btn.href = "/signup";
    btn.textContent = data["cta secondary"];
    actions.appendChild(btn);
  }

  content.appendChild(actions);

  // Assemble
  hero.append(video, overlay, content);
  block.appendChild(hero);
}