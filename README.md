# AdobeSphere — Edge Delivery Services

A complete EDS migration of the AdobeSphere platform (originally a vanilla Netlify SPA at https://adobesphere.netlify.app/) built on the [Adobe AEM Boilerplate](https://github.com/adobe/aem-boilerplate) — preserving every feature and behaviour of the original site while collapsing 25+ implicit components into **9 reusable EDS blocks**.

---

## 1. Block Architecture

The original site had effectively 25+ "components" buried in shared CSS classes and per-page JS. By treating cards / heroes / forms / detail sub-sections as a **single block per family with variants** instead of a separate block per page, we get to **9 new blocks plus the 3 boilerplate blocks** (header / footer / fragment) — a 60%+ reduction.

| # | Block | Variants | Replaces from the legacy site |
|---|---|---|---|
| 1 | `header` | — | `partials/navbar.html` + `js/navbar.js` |
| 2 | `footer` | — | `partials/footer.html` |
| 3 | `fragment` | — | (boilerplate) reuse for `/nav`, `/footer`, future shared blocks |
| 4 | `hero` | `default`, `video`, `search`, `media`, `gradient`, `compact` | All 6 hero sections across home / about / explore / event / blog / creator |
| 5 | `cards` | `events`, `blogs`, `creators`, `testimonials` ⨯ `with-save`, `with-actions`, `horizontal` | All `buildEventCard / buildBlogCard / buildCreatorCard / testimonials` consumers |
| 6 | `explore` | (single block) | Entire `explore.html` + `explore.js` (671 lines → 1 block) |
| 7 | `form` | `contact` (default), `login`, `signup`, `event-registration`, `blog-editor` | All 5 form pages |
| 8 | `detail-section` | `overview`, `agenda`, `people` (× `presenters / speakers / hosts`), `quote`, `bio`, `reach-out`, `comments` | The body of event / blog / creator detail pages |
| 9 | `profile` | `user`, `creator` | `user-profile.html` + the creator hero card |
| 10 | `marquee` | — | Category pills on home |
| 11 | `stats` | — | Animated counters on About + creator stats |
| 12 | `timeline` | — | Platform Journey on About |

### Why this collapses cleanly

- **Cards** is the biggest win. Events, blogs, creators, and testimonials all share the same card shell (image / image-less / avatar / blockquote) — they only differ in what fields they read. One block + four card builders + filter/limit/ids config rows replaces 4+ separate components.
- **Hero** is variant-heavy (6) but each variant adds one well-bounded behaviour (background video, search input, banner image, gradient backdrop, etc.) over a shared content stack.
- **Detail-section** is the second big win. Every detail page (event / blog / creator) reuses the same set of sub-sections — overview, agenda, people, quote, bio, reach-out, comments — just in different orders and sourced from different JSON files. Authoring a detail page becomes "stack the sections you want and tell each one where to read its id from".
- **Form** swallows 5 distinct page types because all of them are validation + state + a fixed field list. The block branches on the variant class once.
- **Explore** stays as one specialised block because its tab/filter/grid/pagination state is too coupled to fragment further; collapsing 671 lines of bespoke explore.js into one EDS block is itself a 10× simplification.

### Block reduction summary

| Legacy component | New EDS path |
|---|---|
| Navbar (5 instances) → drawer / desktop / auth-aware | `blocks/header` |
| Footer | `blocks/footer` |
| Hero (Home video) | `hero (video)` |
| Hero (About static) | `hero` |
| Hero (Explore search) | `hero (search)` |
| Hero (Event banner) | `hero (media)` |
| Hero (Creator gradient) | `hero (gradient)` |
| Hero (Blog title strip) | `hero (compact)` |
| Featured Events grid | `cards (events)` + `Filter \| featured=true` |
| Featured Blogs grid | `cards (blogs)` + `Filter \| featured=true` |
| Featured Creators grid | `cards (creators)` + `Filter \| featured=true` |
| Saved items grid | `cards (events with-save)` / `cards (blogs with-save)` |
| My registrations grid | `cards (events with-actions)` |
| My published blogs grid | `cards (blogs with-actions)` |
| Testimonials grid | `cards (testimonials)` (statically authored) |
| Category marquee | `marquee` |
| Stats counter (4-up) | `stats` |
| Platform Journey timeline | `timeline` |
| User profile dashboard | `profile (user)` |
| Creator profile header | `profile (creator)` |
| Event Overview / Schedule / Presenters / Speakers / Hosts / Quote | `detail-section` (one block, 7 variants) |
| Blog author bio + comments | `detail-section (bio)` + `detail-section (comments)` |
| Creator bio + reach-out + quote | `detail-section (bio / reach-out / quote)` |
| Tabs + filters + paginated grid | `explore` |
| Contact / Login / Signup / Registration / Blog editor forms | `form` (5 variants) |

---

## 2. Project Structure

```
AdobeSphere-eds/
├── 404.html
├── head.html
├── package.json
├── README.md                  # this file
├── AUTHORING.md               # da.live tables for every block
│
├── blocks/
│   ├── cards/                 cards.js + cards.css
│   ├── detail-section/
│   ├── explore/
│   ├── footer/
│   ├── form/
│   ├── fragment/              (boilerplate, unmodified)
│   ├── header/
│   ├── hero/
│   ├── marquee/
│   ├── profile/
│   ├── stats/
│   └── timeline/
│
├── scripts/
│   ├── aem.js                 (boilerplate, do not modify)
│   ├── delayed.js             (boilerplate)
│   └── scripts.js             AdobeSphere orchestrator + Storage + Utils + auto-blocking
│
├── styles/
│   ├── fonts.css
│   ├── lazy-styles.css
│   └── styles.css             design tokens + buttons + sections
│
├── fonts/                     (boilerplate Roboto woff2 files)
├── icons/                     SVG icons (search, user-default, card-fallback)
│
└── drafts/                    Local HTML/JSON for offline development
    ├── index.html             home
    ├── nav.html, footer.html  not used; fragments live in fragments/
    ├── explore.html
    ├── about.html
    ├── contact.html
    ├── login.html
    ├── signup.html
    ├── blog-editor.html
    ├── user-profile.html
    ├── fragments/
    │   ├── nav.html
    │   └── footer.html
    ├── events/template.html
    ├── blog/template.html
    ├── creator-profile/template.html
    └── data/
        ├── campaigns.json
        ├── blogs.json
        └── creators.json
```

---

## 3. Block Code Structure

Every block follows the same shape:

```
blocks/<name>/
├── <name>.js     # exports default async function decorate(block) { … }
└── <name>.css    # all selectors scoped under .<name>
```

The pattern inside `<name>.js`:

1. **Read variant classes** off `block.classList` to pick a code path.
2. **Read config rows** off `block.children` — each row of the form `Key | Value` is consumed and removed from the DOM. Anything left over is treated as authored content.
3. **Hydrate from `/data/*.json`** when the variant needs dynamic data. All data fetching goes through `window.AdobeSphere.Utils.fetchData(name)`, which transparently tries `/drafts/data/{name}.json` first (local dev) then `/data/{name}.json` (production).
4. **Render** by replacing `block.textContent = ''` and appending DOM. Hand-rolled HTML strings use `Utils.escapeHtml()` everywhere user data is interpolated.
5. **Bind events** with `addEventListener`. Cards register their save / register / delete handlers per-card.

`scripts/scripts.js` exposes the shared modules at `window.AdobeSphere`:

- `Storage` — localStorage abstraction (sessions, saved items, registrations, user blogs, comments)
- `Utils` — `escapeHtml`, `formatDate`, `formatShortDate`, `truncate`, `validateEmail`, `normaliseAsset`, `toast`, `fetchData`, `initRevealObserver`

All blocks reach for these instead of duplicating helpers.

### Auto-blocking

`scripts.js` keeps the boilerplate's hero auto-block: if a page authors an `<h1>` followed by a `<picture>` with no explicit hero block, a default hero is synthesised. This means simple pages can be authored with just a heading and an image and still get a hero treatment.

---

## 4. Setup & Local Development

```bash
# install dev tooling (just AEM CLI for the local server)
npm install -g @adobe/aem-cli

# from the project root
aem up
# or, equivalently, the no-install variant:
npx -y @adobe/aem-cli up --no-open --forward-browser-logs
```

The dev server runs at `http://localhost:3000` and serves:

- code files from your local working copy (live-reload on change)
- HTML / JSON from `/drafts/` (so `localhost:3000/index` reads `drafts/index.html`)

### Adding new authored content

Two paths:

1. **Static (drafts)** — drop an HTML file into `/drafts/` matching the URL (e.g. `/drafts/about-team.html` → `localhost:3000/about-team`). Useful for prototyping.
2. **Production (da.live)** — author the page in da.live following the tables in [`AUTHORING.md`](./AUTHORING.md), preview it, and the server picks it up automatically once published.

---

## 5. Deployment

This project is set up to deploy via the standard EDS / aem.live workflow:

- **Feature preview**: `https://{branch}--{repo}--{owner}.aem.page/`
- **Production preview**: `https://main--{repo}--{owner}.aem.page/`
- **Production live**: `https://main--{repo}--{owner}.aem.live/`

Push your branch → AEM Code Sync processes it → preview URL is available within a minute → open a PR → reviewer + PageSpeed → merge to main.

---

## 6. Assumptions & Improvements over the Original

### Assumptions made during the migration

1. **Data layer stays JSON-first.** The original used four JSON files in `/data/`; we kept the same schema verbatim so authored detail pages can hydrate from `campaigns.json`, `blogs.json`, `creators.json` unchanged. A future migration could move these to AEM Content Fragments.
2. **Asset paths from the legacy data are preserved.** The data references `assets/images/...` paths from the legacy site. Authors are expected to copy the `assets/` folder to the EDS repo root (or re-author the images in da.live and update the JSON). The `Utils.normaliseAsset()` helper handles backslashed Windows-style paths in the legacy JSON so you don't have to clean the data first.
3. **localStorage-based sessions** — auth, saved items, and registrations are still client-side. EDS doesn't change that. The `Storage` module is now pure ES modules but the keys (`adobesphere_users`, `adobesphere_session`, …) are stable so existing user data carries over if you re-host.
4. **Event id resolution.** The block reads the entity id from `?id=…` first, then the last URL segment, then a `<meta name="entity-id">` tag. This means `/events/event-001` and `/events/template?id=event-001` both work. Authors building per-event landing pages don't have to do anything special.
5. **EDS button decoration.** The legacy site used `.btn .btn-primary` etc. EDS auto-decorates `<strong><a>` as `.button.primary` and `<em><a>` as `.button.secondary`. Authors get button styling for free by emphasising links.
6. **Section variants via section metadata.** Instead of per-section `id`s with bespoke CSS, authors set `style | light` / `style | dark` / `style | flush` on a Section Metadata block at the top of any section to swap the background. Cleaner and EDS-native.

### Improvements over the original

1. **9 EDS blocks instead of ~25 implicit components.** Cards in particular went from 4 distinct builders + 4 saved/action variants (effectively 8 components) to one block with config rows.
2. **Authoring is no longer per-page HTML.** Marketers can edit copy in da.live without touching code, and the block contracts make it impossible to break the layout — drop in a row, change the limit from 6 to 8, and you're done.
3. **Three-phase loading** built in. The original site loaded everything synchronously; EDS gives us eager / lazy / delayed for free, which means the home hero can be visible before any cards JS has even loaded.
4. **Reveal-on-scroll is now opt-in via `.reveal`** and shared across all blocks. The original ran it from `Utils.initRevealObserver()` after each fetch; we register it once in lazy phase.
5. **Reduced motion is honoured** by both the marquee block and the global `.reveal` utility.
6. **No build step.** The original needed Netlify; this runs on `aem up` and ships unprocessed to the CDN.
7. **Mobile-first CSS.** The legacy stylesheet was desktop-first with `max-width` queries; the new CSS is mobile-first with `min-width` at 600 / 900 / 1200 — better for the cellular-first audience and aligned with the EDS boilerplate convention.

### Things deferred (good follow-ups)

- **Server-side comments / sessions.** Move off localStorage when the project grows beyond a single-browser demo.
- **Image optimisation pipeline.** All the images in `/drafts/` are currently raw JPGs. In production, authors uploading via da.live get this automatically; static images committed to git should be hand-optimised first.
- **Per-blog standalone pages.** Right now `/blog/{id}` serves the same template for every blog. Long-form blogs that want unique authored content alongside the JSON can be authored as separate da.live pages with the same blocks; the template is just the default.
- **A11y audit.** Quick sweep done; a deeper pass with real screen readers is recommended before launch.

---

## 7. License

Same as the boilerplate (Apache-2.0). The data and copy belong to AdobeSphere; the code is yours to fork.
