# AdobeSphere

AdobeSphere is a community platform for Adobe's creative ecosystem — a place to **discover and register for events**, **read and write blogs**, **explore creator profiles**, and **save content for later**. It runs entirely on Adobe Edge Delivery Services (EDS), with no backend, no build step, and no framework — just vanilla JavaScript and CSS hydrated against tables authored in [da.live](https://da.live/).

This repository contains all of the component code (the "blocks"), styles, scripts, and static data that make the experience interactive. The page content itself lives in da.live and is composed by the CDN at request time.

---

## Table of contents

1. [How EDS works in this project](#1-how-eds-works-in-this-project)
2. [Pages and routes](#2-pages-and-routes)
3. [Repository layout](#3-repository-layout)
4. [Blocks](#4-blocks)
5. [Inter-block communication](#5-inter-block-communication)
6. [Data sources](#6-data-sources)
7. [Persistence (`localStorage`)](#7-persistence-localstorage)
8. [Global runtime — `window.AdobeSphere`](#8-global-runtime--windowadobesphere)
9. [Design system](#9-design-system)
10. [Local development](#10-local-development)
11. [Deployment](#11-deployment)
12. [Tech stack](#12-tech-stack)
13. [Authoring](#13-authoring)
14. [License](#14-license)

---

## 1. How EDS works in this project

Adobe Edge Delivery Services is a CDN-first publishing model. There is **no application server** and **no build pipeline** — the CDN composes pages on the fly from two independent sources:

| Concern | Where it lives |
|---|---|
| Page content (copy, images, tables) | **da.live** — a Google-Docs-style CMS |
| Components & interactivity (JS + CSS) | **This GitHub repository** |
| Hosting & delivery | **Adobe's CDN** (`aem.page` / `aem.live`) |

The browser receives a plain HTML document where each section contains one or more **block tables**. After first paint, `scripts/aem.js` walks the DOM, finds each block by its CSS class, dynamically imports the matching `/blocks/<name>/<name>.js`, and runs its exported `decorate(block)` function. The block:

1. **Reads its config rows** (e.g. `Source | events`, `Limit | 6`) from the table.
2. **Strips those rows from the DOM** so they don't render.
3. **Hydrates the rest** — fetches data, builds DOM, wires events.
4. Its CSS at `/blocks/<name>/<name>.css` scopes everything under `.<name>` so nothing leaks.

Everything ships as **ES modules** straight from GitHub — no bundler, no transpilation. The 5-second time-to-interactive budget that EDS targets falls naturally out of this architecture.

---

## 2. Pages and routes

There are 11 authored documents plus 3 dynamic-detail templates. All pages share the same `header` and `footer` (loaded as fragments from `/nav` and `/footer`).

| Route | da.live document | What it does |
|---|---|---|
| `/` | `index` | Featured events, blogs, creators · category marquee · video hero |
| `/explore` | `explore` | Tabbed, filterable, paginated listings of all events, blogs, and creators |
| `/about` | `about` | Mission, stats, testimonials, platform timeline |
| `/contact` | `contact` | Contact form + FAQ accordion |
| `/login` | `login` | Sign-in form |
| `/signup` | `signup` | Account-creation form |
| `/user-profile` | `user-profile` | Editable profile, saved items, registrations, published blogs |
| `/blog-editor` | `blog-editor` | Create / edit a blog post (form auto-mounted; page body is empty) |
| `/events/{id}` | `events/template` | Dynamic event detail — banner, agenda, speakers, registration |
| `/blog/{id}` | `blog/template` | Dynamic blog detail — article body, bio, comments |
| `/creator-profile?id={email}` | `creator-profile/template` | Dynamic creator detail — hero, bio, creator's events + blogs |

> **Dynamic pages** do not exist as one document per item. The block code reads the entity id from the URL (`/events/event-005`, `/blog/post-12`, `?id=user@adobe.com`) and pulls the record from the appropriate JSON file.

---

## 3. Repository layout

```
adobesphere-eds/
│
├── blocks/                 One folder per component, each containing a .js and a .css
│   ├── accordion/          FAQ-style collapsible list (contact page)
│   ├── auth-form/          Legacy sign-in / sign-up form
│   ├── cards/              The Swiss-army block — 8 variants
│   ├── detail-section/     The other Swiss-army block — 11 variants
│   ├── event-actions/      Save toggle + Register CTA on event detail
│   ├── filters/            Filter bars for the Explore tabs
│   ├── footer/             Loads the /footer fragment, builds the footer columns
│   ├── form/               Contact, login, signup, event-registration, blog-editor
│   ├── fragment/           Loads any /path as an inline fragment (used by header/footer)
│   ├── header/             Loads the /nav fragment, renders auth state, scroll behaviour
│   ├── hero/               7 hero variants (default, video, search, media, compact, gradient, creator)
│   ├── marquee/            Category pill strip + timeline ribbon
│   ├── profile/            Editable user dashboard + creator hero
│   └── tabs/               Explore-page tab switcher
│
├── scripts/
│   ├── aem.js              Adobe EDS framework (do NOT modify — vendored from the boilerplate)
│   ├── scripts.js          App entry point — Storage, Utils, page load sequence, auth modal
│   ├── delayed.js          Non-critical imports loaded 3 seconds after page load
│   └── data/               Static JSON served at /scripts/data/<name>.json
│       ├── campaigns.json  Events (source key `events` resolves to this file)
│       ├── blogs.json      All blog posts
│       └── creators.json   All creator profiles
│
├── styles/
│   ├── styles.css          Design tokens, global layout, buttons, form inputs
│   ├── lazy-styles.css     Below-the-fold styles loaded after first paint
│   └── fonts.css           Roboto @font-face declarations
│
├── fonts/                  Roboto woff2 files
├── icons/                  SVG fallbacks (card-fallback, search, user-default)
├── assets/                 Media (images, videos)
│   ├── images/             Branding, event covers, profile photos, blog thumbnails
│   └── videos/             Background videos for the video-hero variant
│
├── docs/
│   └── authoring-screenshots/   Reference screenshots used by AUTHORING.md
│
├── head.html               Title, CSP, meta tags, OG tags, script + stylesheet imports
├── 404.html                Custom not-found page
├── AUTHORING.md            Page-by-page da.live authoring guide (with screenshots)
├── README.md               This file
├── package.json            Dev tooling only (ESLint, Stylelint — Airbnb + standard configs)
└── LICENSE                 Apache-2.0
```

---

## 4. Blocks

Every block follows the same anatomy:

1. **The author drops a table** in da.live. The first cell names the block (`cards`) with optional variants in parentheses (`cards (events horizontal)`).
2. **EDS finds `/blocks/<name>/<name>.js`** at runtime and runs its `decorate(block)` function.
3. **The JS strips config rows**, fetches any data, builds the DOM, and wires interactivity.
4. **The CSS scopes all styles** under `.<name>` so no rules leak.

There are **14 blocks** in total. Most pages combine 3–8 of them.

| Block | Variants | Where it's used |
|---|---|---|
| `header` | — | All pages (loads `/nav`) |
| `footer` | — | All pages (loads `/footer`) |
| `fragment` | — | Used by header/footer; also loads auth and employee-only modal fragments |
| `hero` | `default · video · search · media · compact · gradient · creator` | Home (video), Explore (search), event detail (media), blog detail (compact), creator-profile (gradient/creator), About (video), Login/Signup (default) |
| `cards` | `events · blogs · creators · testimonials · stats · with-save · with-actions · horizontal` | Home (featured grids), Explore (paginated grids), User profile (saved / registered / published), Creator profile (creator's items), About (stats counters + testimonial grid) |
| `tabs` | — | Explore — three tab panels with custom-event coordination |
| `filters` | `events · blogs · creators` | Explore — one filter bar per tab; emits `adobesphere:filter` for `cards` |
| `form` | `contact · login · signup · event-registration · blog-editor` | Contact (contact), Login/Signup (auth), Event detail (registration modal), Blog editor (publish form) |
| `auth-form` | `signin · signup` | Legacy alternative to `form (login)` / `form (signup)` |
| `detail-section` | `overview · agenda · people-presenters · people-speakers · people-hosts · quote · bio-blog · bio-creator · reach-out · article-body · comments · mission` | Event detail, blog detail, creator-profile, About (mission) |
| `profile` | `user · creator` | User profile (editable dashboard), Creator profile (read-only hero) |
| `event-actions` | — | Event detail (save toggle + register/unregister button; opens the registration modal) |
| `marquee` | `default · timeline` | Home (category pill strip), About (platform timeline) |
| `accordion` | — | Contact (FAQ list) |

The full content / config row reference for each variant lives in **[AUTHORING.md](AUTHORING.md)**.

---

## 5. Inter-block communication

Blocks **never import each other**. Coordination happens entirely through browser `CustomEvent`s fired on `window`. This keeps each block independently loadable and testable.

| Event | Fired by | Listened to by | Purpose |
|---|---|---|---|
| `adobesphere:filter` | `filters` | `cards` | Apply the current filter state to the card grid |
| `adobesphere:switchtab` | `tabs` | `filters`, `cards` | Announce which tab is now active |
| `adobesphere:search` | `hero (search)` | `cards` | Push the search query to all card grids |
| `adobesphere:search:results` | `cards` | `tabs` | Report result counts so tabs can auto-select the non-empty one |
| `adobesphere:show-registration` | `event-actions` | `form (event-registration)` | Open the registration modal |
| `adobesphere:registration-changed` | `form` | `event-actions` | Refresh the register button state after submit |
| `adobesphere:focus-search` | `header` (search icon) | `hero (search)` | Focus the search field when the nav icon is clicked |
| `adobesphere:avatar-updated` | `profile` | `header` | Update the nav avatar after the user uploads a new photo |

---

## 6. Data sources

All public content (events, blogs, creators) is served as static JSON from `/scripts/data/`:

| File | Source key | Used by |
|---|---|---|
| `/scripts/data/campaigns.json` | `events` | Event listings (Home, Explore), event detail pages |
| `/scripts/data/blogs.json` | `blogs` | Blog listings, blog detail pages, blog editor (load for edit) |
| `/scripts/data/creators.json` | `creators` | Creator listings, creator profile pages, author bio cards |

The mapping `events → campaigns.json` is intentional — the source key reflects the *concept* (Events & Campaigns), while the filename preserves the legacy data shape. Every block reads data via `Utils.fetchData(name)` which caches the response for the rest of the session.

---

## 7. Persistence (`localStorage`)

There is no backend. Every piece of user-specific data lives in the browser's `localStorage` under these eight keys:

| Key | Contents |
|---|---|
| `adobesphere_users` | All registered user accounts (keyed by email) — name, email, password hash, etc. |
| `adobesphere_session` | The currently logged-in user (`{ email, name }`) |
| `adobesphere_saved` | Per-user saved events and blogs (`{ <email>: { events: [], blogs: [] } }`) |
| `adobesphere_registrations` | Per-user event registrations |
| `adobesphere_user_blogs` | Per-user blog posts (drafts and published) |
| `adobesphere_comments` | Blog comments, keyed by blog id |
| `adobesphere_local_creators` | Auto-generated creator profile per signup so new users show up on Explore |
| `adobesphere_blog_categories` | Custom category names added through the blog editor |

The `Storage` module in `scripts.js` is the only thing that touches `localStorage` — every read is wrapped in a try/catch around `JSON.parse` so corrupt data never crashes a page.

---

## 8. Global runtime — `window.AdobeSphere`

`scripts/scripts.js` exposes two singletons on `window.AdobeSphere` so blocks don't duplicate helpers.

### `Storage`

Wrappers around `localStorage` for sessions, users, saves, registrations, blogs, comments, and local creators. Key methods:

| Method | Purpose |
|---|---|
| `getSession()` / `setSession(s)` / `clearSession()` | Session lifecycle |
| `isLoggedIn()` / `getCurrentUser()` / `upsertUser(user)` | Auth state + user CRUD |
| `getSaved(type)` / `toggleSaved(type, id)` / `isSaved(type, id)` | Saved events / blogs |
| `isBlogSaved(id)` / `saveBlog(id)` / `unsaveBlog(id)` | Convenience aliases for the blogs type |
| `getRegistrations()` / `registerForEvent(id, details)` / `cancelRegistration(id)` | Event registration |
| `getUserBlogs()` / `addUserBlog(blog)` / `updateUserBlog(blog)` / `deleteUserBlog(id)` | Blog CRUD |
| `getUserBlogById(id)` / `getAllUserBlogs()` / `getLocalUserBlogs(email)` | Blog lookups |
| `getComments(blogId)` / `addComment(blogId, comment)` | Comment thread |
| `upsertLocalCreator(user)` / `getLocalCreator(id)` / `getAllLocalCreators()` / `getLocalCreatorsCount()` | Mirror new signups as creator profiles |
| `addContactSubmission(submission)` | Capture contact-form submissions |
| `getBlogCategories()` / `addBlogCategory(name)` | Custom category list |

### `Utils`

| Method | Purpose |
|---|---|
| `escapeHtml(v)` | Sanitise any value before inserting into HTML |
| `formatDate(iso, opts)` | Long-form date (`Monday, 12 May 2025`) |
| `formatShortDate(iso)` | Short date (`May 12, 2025`) |
| `truncate(text, max)` | Cut text with an ellipsis |
| `validateEmail(email)` | Basic format check |
| `normaliseAsset(src, fallback)` | Resolve any asset reference (base64, relative, absolute, missing) to a usable URL |
| `toast(message, type, duration)` | Temporary corner notification (`info`, `success`, `error`) |
| `fetchData(name)` | Fetches `/scripts/data/{name}.json`, caches the promise |
| `getPlaceholders()` | Helix placeholders helper |
| `initRevealObserver()` | Hooks up scroll-in animation for `.reveal` elements |
| `showAuthModal({ redirect })` | Mounts the inline sign-in prompt when a logged-out user tries a protected action |

---

## 9. Design system

All visual design tokens live as CSS variables in `styles/styles.css`. Components reference these tokens rather than hard-coding colours, radii, or spacing.

### Colours

| Token | Value | Role |
|---|---|---|
| `--red-primary` | `#e30220` | Brand accent — buttons, underlines, badges, hero gradient |
| `--red-deep` | `#bf0000` | Hover state of primary red |
| `--bg-dark` | `#242024` | Dark sections, footer, scrolled header |
| `--bg-off-white` | `#f3f4f5` | Light section background, body default |
| `--text-primary` | `#1a1a1a` | Body text |
| `--text-secondary` | `#555` | Sub-headings, metadata |
| `--text-muted` | `#888` | Captions, labels |
| `--neutral-light` | `#dadada` | Borders, dividers |

### Layout & motion

| Token | Value | Used for |
|---|---|---|
| `--max-width` | `1280px` | Page content cap |
| `--nav-height` | `64px` | Space reserved for the fixed header |
| `--section-padding` | `60px 24px` | Default section padding |
| `--radius-sm / md / lg / full` | `4 · 8 · 16 · 9999px` | Inputs, cards, big tiles, pills |
| `--shadow-sm / md / lg` | progressive | Cards, hover lift, modals |
| `--transition-fast / base / slow` | `150 · 200 · 350 ms ease` | Hover, focus, layout |

### Typography

- **Body** — Roboto (self-hosted, woff2 only). Fallback: `system-ui`.
- **Display / headings** — Impact (system font). Fallback chain: `Haettenschweiler, "Arial Narrow Bold", "Segoe UI"`.
- **Scale** — `xxl 4.5rem · xl 2.8rem · l 1.8rem · m 1.3rem · s 1.15rem · xs 1rem`.

### Breakpoints

Mobile-first `min-width` queries at **600 px**, **900 px**, and **1200 px**.

---

## 10. Local development

The dev workflow uses Adobe's AEM CLI, which serves local files and proxies page content from the live origin so you always see real data while editing code.

```bash
# 1. Install the AEM CLI (one-time, requires Node 18+)
npm install -g @adobe/aem-cli

# 2. Install the dev-only tooling for linting
npm install

# 3. Start the dev server from the project root
aem up
```

The server starts at `http://localhost:3000`. Local JS, CSS, and assets are served from your working tree with live-reload; page content (HTML) and data is proxied from `aem.page`.

**Linting:**

```bash
npm run lint        # JS (Airbnb base) + CSS (standard)
npm run lint:fix    # Auto-fix where possible
```

---

## 11. Deployment

This project follows the standard EDS GitHub-driven workflow. There is no CI pipeline, no build step, no deployment script — the CDN pulls directly from the repository.

1. **Push a branch** to GitHub.
2. **AEM Code Sync** picks it up automatically within a few seconds.
3. **A preview URL** appears at `https://{branch}--{repo}--{owner}.aem.page/`.
4. Open a PR, get a review, merge to `main`.
5. **Production** is live at `https://main--{repo}--{owner}.aem.live/` (currently `main--eds-adobesphere--sudeeepaa.aem.live`).

To roll back, revert the merge commit — production updates within seconds.

---

## 12. Tech stack

| Layer | Choice |
|---|---|
| **Content authoring** | da.live (Google-Docs-style CMS) |
| **Component code** | Vanilla JS (ES modules) + CSS |
| **Framework** | Adobe EDS / AEM boilerplate (no React, no Vue, no Svelte) |
| **Data** | Static JSON files |
| **Auth & persistence** | Browser `localStorage` |
| **Fonts** | Roboto (self-hosted woff2) |
| **Icons** | SVG fallbacks in `/icons/` |
| **Linting** | ESLint (Airbnb base) + Stylelint (standard) |
| **Hosting** | Adobe CDN (`aem.live`) |
| **Build** | None |

---

## 13. Authoring

If you're editing **page content** (copy, images, sections), you almost certainly want **[AUTHORING.md](AUTHORING.md)** — it's a page-by-page guide with annotated screenshots of every block table in da.live.

If you're editing **code**, the pattern to follow is in any existing block:

1. Create `/blocks/<name>/<name>.js` and `/blocks/<name>/<name>.css`.
2. Export an async function `decorate(block)`.
3. Read your config rows from `block` (each row is a `<div>` whose children are the cells), strip them from the DOM, then build whatever UI you need.
4. Scope every style under `.<name>` so it can't leak.
5. If you need cross-block communication, fire / listen to a `CustomEvent` on `window` — don't import other blocks.

---

## 14. License

Apache-2.0 — inherited from the AEM boilerplate. The block code is yours to fork and adapt.
