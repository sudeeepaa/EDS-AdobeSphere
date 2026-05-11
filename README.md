# AdobeSphere — Edge Delivery Services

A complete EDS migration of the AdobeSphere platform (originally a vanilla Netlify SPA) built on the [Adobe AEM Boilerplate](https://github.com/adobe/aem-boilerplate) — preserving every feature of the original site while restructuring it into **18 reusable EDS blocks**.

---

## 1. Block Architecture

| # | Block | Variants | Purpose / Used on |
|---|---|---|---|
| 1 | `header` | — | Global nav on every page; renders the logo, nav links, a search icon, and an auth zone that shows sign-in/up links when logged out or a user avatar dropdown with profile and sign-out options when logged in |
| 2 | `footer` | — | Global footer on every page; loads the `/footer` fragment and structures its columns |
| 3 | `fragment` | — | Inlines any authored HTML fragment; used for the `/nav` fragment, `/footer` fragment, and the auth-prompt and employee-only modals |
| 4 | `hero` | `default`, `search`, `media`, `compact`, `creator` | Page hero used on home (large default), explore (with embedded live search input), every event detail page (full-bleed media banner with overlay text), every blog detail page (compact title strip), and every creator profile page (gradient card with avatar and stats) |
| 5 | `cards` | `events`, `blogs`, `creators`, `testimonials` × `with-save`, `with-actions`, `horizontal`; user sources: `saved-events`, `saved-blogs`, `registered-events`, `user-blogs` | Universal card grid used on the home page (featured sections), explore page (paginated + filterable grids), user-profile page (saved items / registered events / published blogs), creator-profile page (creator's blog list), and any page with a testimonials row |
| 6 | `tabs` | — | Tab switcher used on the explore page (Events / Blogs / Creators); wraps paired `filters` + `cards` blocks into switchable tab panels and coordinates them via `adobesphere:switchtab` events; can be reused on any multi-source listing page |
| 7 | `filters` | `events`, `blogs`, `creators` | Filter controls placed inside each tab panel on the explore page; the source variant determines which filter fields to render (category, date, location for events; category, author, sort for blogs; designation, sort for creators); emits `adobesphere:filter` for `cards` to consume |
| 8 | `form` | `event-registration`, `blog-editor` | The `event-registration` variant renders as a hidden modal on every event detail page and opens when `event-actions` fires `adobesphere:show-registration`; the `blog-editor` variant renders the create/edit form on `/blog-editor` and pre-populates fields when `?id=` is present |
| 9 | `auth-form` | `signin` (default), `signup` | The `signin` variant is the full `/login` page; the `signup` variant is the `/signup` account creation page with password strength meter, live bio character counter, avatar upload with preview, LinkedIn validation, and an Adobe employee gate modal |
| 10 | `contact-form` | — | Contact inquiry form used on `/contact`; validates name, email, and message fields and stores the submission to localStorage; can be dropped on any page that needs a contact form |
| 11 | `detail-section` | `overview`, `agenda`, `people`, `quote`, `bio`, `reach-out`, `comments`, `blog-header`, `article-body` | Structured content sections reused across all three detail page types — event pages use `overview`, `agenda`, `people`, `quote`, `reach-out`, and `comments`; blog pages use `blog-header`, `article-body`, `bio`, and `comments`; creator profile pages use `bio`, `reach-out`, and `quote` |
| 12 | `profile` | `user`, `creator` | The `user` variant renders the editable profile card on `/user-profile` (avatar upload, name/designation/bio/LinkedIn edit, account deletion); the `creator` variant renders the read-only hero on `/creator-profile` with stats fetched from `creators.json` or localStorage |
| 13 | `event-actions` | — | Save toggle and Register / Unregister button rendered on every event detail page; tracks registration state from `Storage`, opens the `form (event-registration)` modal on register, and updates its UI when the modal fires `adobesphere:registration-changed` |
| 14 | `marquee` | — | Auto-scrolling pill strip used on the home page to show event category links that deep-link into the Events tab on explore; can be reused on any page to display a scrolling set of pills |
| 15 | `stats` | — | Animated count-up stat row used on the About page for platform-wide numbers |
| 16 | `timeline` | — | Horizontally scrollable and touch/mouse-scrubbable timeline used on the About page to display platform milestones |
| 17 | `mission` | — | Brand mission section used on the About page; renders the mission statement alongside a rotating row of creator avatar images pulled from authored block rows |
| 18 | `faq` | — | Collapsible accordion FAQ used on the About page; each authored row becomes a question/answer pair and can be expanded independently; reusable on any page that needs a Q&A section |

### Why this architecture works

- **`cards`** is the biggest win. Events, blogs, creators, testimonials, and all four user-profile sub-sections (saved/registered/published) share the same card shell and one block. A `Source | blogs` config row plus optional `Filter | featured=true` and `Limit | 6` rows cover every listing on the site.
- **`detail-section`** covers every detail page body. Authors stack the sub-sections they want (`overview`, `agenda`, `people`, `quote`, `bio`, `reach-out`, `comments`, `article-body`) and point each one at the right entity id. Events, blogs, and creator pages all reuse the same block in different orders.
- **`tabs` + `filters` + `cards`** replace the old monolithic explore block. Each block is independently authored and they coordinate via `adobesphere:filter`, `adobesphere:switchtab`, and `adobesphere:search` custom events — no shared state in JS.
- **`auth-form`** is a clean split from `form`. Sign-in and sign-up have enough distinct fields (password strength, avatar upload, LinkedIn, bio, employee modal) that they warrant their own block.

---

## 2. Project Structure

```
adobesphere-eds/
├── 404.html
├── head.html
├── package.json
├── README.md
│
├── blocks/
│   ├── auth-form/          signin + signup forms
│   ├── cards/              all card grids (events / blogs / creators / testimonials / user sources)
│   ├── contact-form/       contact page form
│   ├── detail-section/     event / blog / creator detail page body sections
│   ├── event-actions/      save + register buttons on event detail pages
│   ├── faq/                accordion FAQ
│   ├── filters/            filter bar for explore-style pages
│   ├── footer/
│   ├── form/               event-registration modal + blog editor
│   ├── fragment/           (boilerplate, unmodified)
│   ├── header/
│   ├── hero/               5 variants: default / search / media / compact / creator
│   ├── marquee/            category pill scroll strip
│   ├── mission/            mission section with avatar row
│   ├── profile/            user dashboard + creator hero card
│   ├── stats/              animated stat counters
│   ├── tabs/               tab switcher
│   └── timeline/           platform journey timeline
│
├── scripts/
│   ├── aem.js              (boilerplate — do not modify)
│   ├── delayed.js          (boilerplate)
│   └── scripts.js          AdobeSphere orchestrator + Storage + Utils + auto-blocking
│
├── styles/
│   ├── fonts.css
│   ├── lazy-styles.css
│   └── styles.css          design tokens + buttons + layout utilities
│
├── fonts/                  Roboto woff2 files (boilerplate)
├── icons/                  SVG icons (search, user-default, card-fallback)
│
└── drafts/                 Local HTML + JSON for offline development
    ├── index.html
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
├── <name>.js     exports default async function decorate(block)
└── <name>.css    all selectors scoped under .<name>
```

The pattern inside every `<name>.js`:

1. **Read variant classes** off `block.classList` to pick a code path.
2. **Read config rows** — each two-cell row (`Key | Value`) is consumed and removed from the DOM before render. Remaining rows are treated as authored content.
3. **Hydrate from `/data/*.json`** when the variant needs dynamic data. All fetches go through `window.AdobeSphere.Utils.fetchData(name)`, which transparently tries `/drafts/data/{name}.json` first (local dev) then `/data/{name}.json` (production).
4. **Render** by clearing `block.textContent` and appending DOM. Any user-data string interpolated into HTML goes through `Utils.escapeHtml()`.
5. **Bind events** with `addEventListener`. Cards register their save / register / delete handlers per-card.

### Shared globals

`scripts/scripts.js` exposes two modules at `window.AdobeSphere`:

**`Storage`** — localStorage abstraction:
- Session: `getSession`, `setSession`, `clearSession`, `isLoggedIn`, `getCurrentUser`, `upsertUser`
- Saved items: `getSaved`, `toggleSaved`, `isSaved`
- Registrations: `getRegistrations`, `registerForEvent`, `cancelRegistration`
- User blogs: `getUserBlogs`, `addUserBlog`, `deleteUserBlog`, `updateUserBlog`, `getAllUserBlogs`, `getUserBlogById`
- Comments: `getComments`, `addComment`
- Creator profiles: `getLocalCreator`, `getAllLocalCreators`, `upsertLocalCreator`
- Categories: `getBlogCategories`, `addBlogCategory`

**`Utils`** — shared helpers:
- `escapeHtml`, `formatDate`, `formatShortDate`, `truncate`, `validateEmail`
- `normaliseAsset` — resolves legacy `assets/images/...` paths and data URIs
- `toast` — transient notification overlay
- `fetchData` — JSON fetcher with drafts fallback
- `initRevealObserver` — IntersectionObserver for `.reveal` scroll-in animation
- `showAuthModal` — sign-in prompt modal with authored content from `/modals/auth-prompt.plain.html`

### Custom events

Blocks communicate via `window.dispatchEvent` / `window.addEventListener`:

| Event | Payload | Flow |
|---|---|---|
| `adobesphere:filter` | `{ source, state }` | `filters` → `cards` |
| `adobesphere:switchtab` | tab id string | `tabs` → `filters`, `cards` |
| `adobesphere:search` | query string | `hero (search)` → `cards` |
| `adobesphere:search:results` | `{ type, count, q }` | `cards` → `tabs` (auto-switch) |
| `adobesphere:show-registration` | — | `event-actions` → `form (event-registration)` |
| `adobesphere:registration-changed` | event id | `form` → `event-actions` |
| `adobesphere:focus-search` | — | header search button → `hero (search)` |
| `adobesphere:avatar-updated` | data URL | `profile` → `header` |

### Dynamic routes

`scripts.js` handles `/events/{id}`, `/blog/{id}`, and `/creator-profile?id={id}` without requiring a real HTML document per entity. When the URL matches a dynamic pattern, the template's `.plain.html` is fetched and injected into `<main>` before EDS decoration runs. The block JS then reads the entity id from `?id=` or the last URL segment.

---

## 4. Setup & Local Development

```bash
# install dev tooling
npm install -g @adobe/aem-cli

# from the project root
aem up
```

The dev server runs at `http://localhost:3000` and serves:

- Code files from your local working copy (live-reload on save)
- Pages from `/drafts/` (e.g. `localhost:3000/explore` reads `drafts/explore.html`)
- Data from `/drafts/data/` (e.g. `Utils.fetchData('blogs')` reads `drafts/data/blogs.json`)

---

## 5. Deployment

Standard EDS / aem.live workflow:

- **Feature preview**: `https://{branch}--{repo}--{owner}.aem.page/`
- **Production preview**: `https://main--{repo}--{owner}.aem.page/`
- **Production live**: `https://main--{repo}--{owner}.aem.live/`

Push branch → AEM Code Sync processes it → preview URL available within a minute → PR → merge to main.

---

## 6. Key Design Decisions

1. **Data layer stays JSON-first.** `campaigns.json`, `blogs.json`, `creators.json` keep the same schema as the original site. A future migration could move these to AEM Content Fragments without changing block code.

2. **localStorage-only persistence.** Auth, saved items, registrations, and user-authored blogs are all client-side. The `Storage` module is the single source of truth; keys are stable (`adobesphere_users`, `adobesphere_session`, etc.) so existing user data carries over if the domain changes.

3. **No build step.** Blocks ship as plain ES modules. The EDS CDN processes them; no bundler is involved.

4. **Mobile-first CSS.** All stylesheets use `min-width` breakpoints at 600 / 900 / 1200 px, aligned with the EDS boilerplate convention.

5. **EDS button decoration.** `<strong><a>` → `.button.primary`, `<em><a>` → `.button.secondary`. Authors get button styling by emphasising links in da.live — no extra markup needed.

6. **Reveal-on-scroll via `.reveal`.** Any block can opt individual cards or sections into the scroll-in animation by adding the `reveal` class. `Utils.initRevealObserver()` registers one shared `IntersectionObserver` in the lazy phase.

---

## 7. License

Apache-2.0 (same as the AEM boilerplate). Data and copy belong to AdobeSphere; the block code is yours to fork.
