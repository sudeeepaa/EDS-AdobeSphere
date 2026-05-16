# AdobeSphere

AdobeSphere is a community platform for Adobe employees — a place to discover and register for events, read and write blogs, explore creator profiles, and save content for later. This repository is the codebase that powers it.

---

## How This Project Works

This project is built on **Adobe Edge Delivery Services (EDS)**, which is a CDN-first publishing system. Here is what that means in practice:

| Concern | Where it lives |
|---|---|
| Page content (text, images, layout) | Authored in **da.live** (a Google Docs–style CMS) |
| Components and interactivity | **This repository** (JS + CSS per block) |
| Hosting and delivery | **Adobe's CDN** — pulls from both sources and serves the page |

**The key concept is "blocks".** When a content author creates a page in da.live, they insert tables. Each table becomes a block — a self-contained component that this repository's JavaScript decorates and makes interactive. There are no page-specific JS files; every feature on every page is handled by one of the 18 blocks in this repo.

**No build step.** Everything ships as plain HTML, CSS, and ES modules. There is no bundler, no compiled output, and no framework. The browser runs the code directly.

---

## Pages

| Page | URL | What it does |
|---|---|---|
| Home | `/` | Featured events, blogs, creators, category pills, stats |
| Explore | `/explore` | Tabbed, filterable, paginated listings of all events, blogs, and creators |
| Event detail | `/events/{id}` | Full event info, agenda, speakers, registration |
| Blog detail | `/blog/{id}` | Full blog post, author bio, comments |
| Creator profile | `/creator-profile?id={email}` | Creator bio, their published blogs and events |
| User profile | `/user-profile` | Edit your profile, view saved items and registrations |
| Blog editor | `/blog-editor` | Write or edit a blog post |
| About | `/about` | Mission, timeline, team stats, FAQ |
| Contact | `/contact` | Contact form |
| Login | `/login` | Sign in |
| Signup | `/signup` | Create an account |

> **Dynamic pages:** Event, blog, and creator-profile pages do not have individual HTML files. A single template (`/events/template`, `/blog/template`, `/creator-profile/template`) is shared for each type, and the block JS reads the entity id from the URL to fetch the right data.

---

## Project Structure

```
adobesphere-eds/
│
├── blocks/            One folder per component — each has a .js and .css file
├── scripts/
│   ├── aem.js         Adobe EDS framework utilities (do not modify)
│   ├── scripts.js     App entry point — Storage, Utils, page load sequence
│   └── delayed.js     Non-critical imports, loaded 3 seconds after page load
├── styles/
│   ├── styles.css     Design tokens, global layout, buttons, form inputs
│   ├── lazy-styles.css  Non-critical styles loaded after first render
│   └── fonts.css      Font-face declarations
├── fonts/             Roboto woff2 files
├── icons/             SVG fallback icons (avatar, search, card thumbnail)
├── assets/            Media files (images, videos)
├── data/              JSON data files (campaigns, blogs, creators)
├── head.html          Meta tags, CSP policy, script and style imports
├── 404.html           Custom not-found page
└── package.json       Dev tooling only (ESLint, Stylelint)
```

---

## Blocks

Every block follows the same pattern:

1. **Author drops a table in da.live.** The first cell names the block (e.g. `cards`). Extra rows are config (`Source | events`, `Limit | 6`).
2. **EDS finds the matching folder in `/blocks/`** and runs its `decorate(block)` function.
3. **The JS reads any config rows, removes them from the DOM**, then hydrates and renders the component.
4. **The CSS scopes all styles under the block's class name** (e.g. `.cards`) so nothing leaks.

---

### Block Reference

- **`header`** — all pages
- **`footer`** — all pages
- **`fragment`** — all pages (loads the `/nav` and `/footer` fragments for header and footer; also loads auth and employee-only modals)
- **`hero`** — *variants: default · search · media · compact · creator* — home (default), about (default), explore (search), event detail (media), blog detail (compact), creator-profile (creator)
- **`cards`** — *variants: events · blogs · creators · testimonials · stats · with-save · with-actions · horizontal; user sources: saved-events · saved-blogs · registered-events · user-blogs* — home (featured grids + testimonials), explore (paginated grids), user-profile (saved items / registered events / published blogs), creator-profile (creator's blog list), about (stats — animated count-up numbers)
- **`tabs`** — explore (wraps the Events / Blogs / Creators tab panels; coordinates `filters` + `cards` inside each via custom events)
- **`filters`** — *source-driven: events · blogs · creators* — explore (one filter bar per tab; emits `adobesphere:filter` for `cards` to consume)
- **`form`** — *variants: event-registration · blog-editor* — event detail (registration modal, hidden until `event-actions` opens it), blog-editor (create and edit form)
- **`auth-form`** — *variants: signin · signup* — login, signup
- **`contact-form`** — contact
- **`detail-section`** — *variants: overview · agenda · people · quote · bio · reach-out · comments · blog-header · article-body · mission* — event detail (overview, agenda, people, quote, reach-out, comments), blog detail (blog-header, article-body, bio, comments), creator-profile (bio, reach-out, quote), about (mission — "Made With Purpose" contributor card grid)
- **`profile`** — *variants: user · creator* — user-profile (editable profile card with avatar upload, bio, LinkedIn), creator-profile (read-only stats hero)
- **`event-actions`** — event detail (save toggle + register/unregister button; opens the registration modal)
- **`marquee`** — home (auto-scrolling category pill strip that links into the explore Events tab)
- **`faq`** — about (collapsible question/answer accordion)
- **`timeline`** — about (horizontally scrollable platform milestone timeline)

---

## How Blocks Talk to Each Other

Blocks never import each other. Instead they communicate by firing and listening to browser custom events on `window`:

| Event | Fired by | Listened to by | What it does |
|---|---|---|---|
| `adobesphere:filter` | `filters` | `cards` | Applies the current filter state to the card grid |
| `adobesphere:switchtab` | `tabs` | `filters`, `cards` | Tells each block which tab is now active |
| `adobesphere:search` | `hero (search)` | `cards` | Passes the search query to all card grids |
| `adobesphere:search:results` | `cards` | `tabs` | Tells tabs how many results each source returned (for auto-switching) |
| `adobesphere:show-registration` | `event-actions` | `form (event-registration)` | Opens the registration modal |
| `adobesphere:registration-changed` | `form` | `event-actions` | Updates the register button state after the form submits |
| `adobesphere:focus-search` | `header` search button | `hero (search)` | Focuses the search input when the nav icon is clicked |
| `adobesphere:avatar-updated` | `profile` | `header` | Updates the nav avatar when the user uploads a new photo |

---

## Data & Storage

### JSON data (public content)

Events, blogs, and creator profiles live in JSON files served from `/data/`:

| File | Used by |
|---|---|
| `/data/campaigns.json` | Event listings, event detail pages |
| `/data/blogs.json` | Blog listings, blog detail pages |
| `/data/creators.json` | Creator listings, creator profile pages |

All blocks fetch data through `Utils.fetchData(name)`, which hits `/data/{name}.json`.

### localStorage (user data)

Everything user-specific is stored in the browser's localStorage — there is no backend. The `Storage` module in `scripts.js` manages all of it under these keys:

| Key | What it stores |
|---|---|
| `adobesphere_users` | All registered user accounts (keyed by email) |
| `adobesphere_session` | The currently logged-in user's email and name |
| `adobesphere_saved` | Each user's saved events and blogs |
| `adobesphere_registrations` | Each user's event registrations |
| `adobesphere_user_blogs` | Blog posts written by each user |
| `adobesphere_comments` | Comments on each blog post |
| `adobesphere_local_creators` | Auto-created creator entry for every new sign-up |
| `adobesphere_blog_categories` | Custom category names added by users |

---

## Shared Utilities (`window.AdobeSphere`)

`scripts.js` exposes two global objects that every block uses instead of duplicating helpers:

### `Storage`
Thin wrappers around localStorage for sessions, users, saved items, registrations, blogs, comments, and creator profiles. Every read/write is safe (try/catch around JSON parse).

### `Utils`
| Method | What it does |
|---|---|
| `escapeHtml(v)` | Sanitises any value before inserting into HTML |
| `formatDate(iso)` | Formats an ISO date as "Monday, 12 May 2025" |
| `formatShortDate(iso)` | Formats as "May 12, 2025" |
| `truncate(text, max)` | Cuts text to max characters with an ellipsis |
| `validateEmail(email)` | Basic email format check |
| `normaliseAsset(src, fallback)` | Resolves any asset path to a clean URL |
| `toast(message, type)` | Shows a temporary notification in the corner |
| `fetchData(name)` | Fetches `/data/{name}.json` |
| `initRevealObserver()` | Wires up scroll-in animation for `.reveal` elements |
| `showAuthModal()` | Shows a sign-in prompt modal when a logged-out user tries a protected action |

---

## Design System

All visual design is controlled by CSS variables in `styles/styles.css`:

| Token | Value | Used for |
|---|---|---|
| `--red-primary` | `#e30220` | Brand accent, badges, links, underlines |
| `--bg-dark` | `#242024` | Dark section backgrounds, footer, header on scroll |
| `--text-primary` | `#1a1a1a` | Body text |
| `--text-secondary` | `#555` | Subheadings, metadata |
| `--text-muted` | `#888` | Captions, labels |
| `--max-width` | `1280px` | Page content cap |
| `--nav-height` | `64px` | Space reserved for the fixed header |
| `--radius-md` | `8px` | Cards, buttons, inputs |

Typography uses **Roboto** (body) and **Impact** (headings). Breakpoints are mobile-first: 600 px, 900 px, 1200 px.

---

## Local Development

```bash
# Install the AEM CLI (one-time)
npm install -g @adobe/aem-cli

# Start the dev server from the project root
aem up
```

The dev server starts at `http://localhost:3000`. It serves your local JS and CSS files with live-reload, and proxies page content and data from the live da.live / aem.page origin — so you always see real content while testing local code changes.

---

## Deployment

This project follows the standard EDS deployment workflow:

1. **Push a branch** to GitHub
2. **AEM Code Sync** picks it up automatically within seconds
3. **Preview URL** is live at `https://{branch}--{repo}--{owner}.aem.page/`
4. Open a PR, get a review, merge to `main`
5. **Production** goes live at `https://main--{repo}--{owner}.aem.live/`

No CI pipeline, no build step, no deployment scripts — the CDN pulls directly from GitHub.

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Content authoring | da.live (Microsoft Word / Google Docs–style CMS) |
| Component code | Vanilla JS (ES modules) + CSS |
| Framework | Adobe EDS / AEM boilerplate (no React, no Vue) |
| Data | Static JSON files |
| Auth & persistence | Browser localStorage |
| Fonts | Roboto (self-hosted woff2) |
| Linting | ESLint (Airbnb base) + Stylelint |
| Hosting | Adobe CDN (aem.live) |

---

## License

Apache-2.0 (same as the AEM boilerplate). Block code is yours to fork and adapt.
