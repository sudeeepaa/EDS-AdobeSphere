# AdobeSphere — da.live Authoring Reference

Every block in this project is authored in [da.live](https://da.live/) using a simple **table**. The first row of the table is **always** the block name, optionally followed by one or more variants in parentheses (e.g. `cards (events horizontal)`). Subsequent rows are either:

- **Config rows** — `Key | Value` pairs read by the block JS and never rendered (e.g. `Source | events`, `Limit | 6`).
- **Content rows** — actual copy, images, or links that get rendered as part of the block.

If you've never authored an EDS page before, read the [aem.live tutorial](https://www.aem.live/developer/tutorial) first — this document assumes you already know how to log into da.live, create a page, and insert a block table.

---

## 1. Document tree

The full content surface lives at the root of the da.live project. Each entry below is a separate da.live document.

```
/
├── index                  ← Home
├── nav                    ← Header (loaded as fragment)
├── footer                 ← Footer (loaded as fragment)
├── explore                ← Explore (tabbed listings)
├── about                  ← About
├── contact                ← Contact
├── login                  ← Sign-in form
├── signup                 ← Sign-up form
├── blog-editor            ← Blog authoring form (empty page; the block is auto-injected)
├── user-profile           ← Logged-in user dashboard
├── metadata               ← Site-wide page metadata (titles, descriptions, OG tags)
│
├── scripts/data/          ← Static JSON content served at /scripts/data/<name>.json
│   ├── campaigns.json     ← Events (Source `events` reads this file)
│   ├── blogs.json
│   └── creators.json
│
├── events/
│   └── template           ← Shared layout rendered for every /events/{id} URL
│
├── blog/
│   └── template           ← Shared layout rendered for every /blog/{id} URL
│
└── creator-profile/
    └── template           ← Shared layout rendered for every /creator-profile?id={email}
```

> **Dynamic detail pages.** Events, blogs, and creator profiles do not get one document per item. Author the `…/template` document once with the right blocks and `Id Source | …` config; at runtime the block code reads the entity id from the URL and hydrates the page from the matching JSON file.

> **Source naming.** When a block has `Source | events`, the code resolves that to `/scripts/data/campaigns.json`. The other two (`blogs`, `creators`) map 1:1 to their file names.

---

## 2. Page-by-page recipes

Each subsection shows the **da.live screenshot** of the live authoring (so you can match what's on screen), followed by a brief **block list** with notes on what each block does and what config rows it accepts.

---

### 2.1 Home — `/` (index)

![Home page authoring — top](docs/authoring-screenshots/home-1.png)
![Home page authoring — bottom](docs/authoring-screenshots/home-2.png)

| # | Block | Purpose |
|---|---|---|
| 1 | `Section Metadata` (`style | flush`) | Removes default top padding so the hero sits flush against the navbar. |
| 2 | `hero` (video) | Full-bleed red hero. Row 1 is the background — paste a `.mp4` / `.webm` URL and the block promotes it to a looping muted `<video>`. Row 2 is the H1, row 3 the lede, row 4 the CTA buttons (`Explore All`, `Join the Community`). |
| 3 | `marquee` | Auto-scrolling category pill strip. Authored rows are ignored — pills are generated dynamically from the categories present in `blogs.json` + `campaigns.json`, and each pill links into the matching Explore tab. |
| 4 | `cards (events)` | Featured Events & Campaigns. Config: `Source | events`, `Filter | featured=true`, `Limit | 6`. |
| 5 | `cards (blogs)` | From the Adobe Blog. Config: `Source | blogs`, `Filter | featured=true`, `Limit | 3`. |
| 6 | `Section Metadata` (`style | light`) | Switches the next section's background to the light off-white tone. |
| 7 | `cards (creators)` | Meet the Creators. Config: `Source | creators`, `Filter | featured=true`, `Limit | 4`. |

---

### 2.2 Header / Navbar — `/nav` (fragment)

![Nav authoring](docs/authoring-screenshots/nav.png)

The `header` block always loads `/nav` as a fragment, so the nav document doesn't need a `header` block of its own — author the contents at the page level and the framework wraps them.

| Section | What to put in it |
|---|---|
| **Brand** | A single image (the Adobe wordmark) followed by a link whose text becomes the brand label. The `<strong>` portion (`**Adobe**sphere`) is the part rendered in red. |
| **Primary links** | A simple UL of in-app routes: Home, Explore, About, Contact. |

> The **sign-in / sign-up buttons** (logged-out) and the **avatar dropdown** (logged-in) are injected by the `header` block from `Storage.getSession()` — never author them.

---

### 2.3 Footer — `/footer` (fragment)

![Footer authoring](docs/authoring-screenshots/footer.png)

Authored at `/footer` and loaded as a fragment by the `footer` block. Each top-level **section** in the document becomes one footer column. The **final section** becomes the slim bottom copyright strip.

| Column | Contents |
|---|---|
| Brand | The wordmark and a one-line tagline describing the project. |
| Quick Links | UL of navigation routes (Home, Explore, About, Contact). |
| Content | UL of deep links into the Explore tabs (`/explore?tab=events`, `?tab=blogs`, `?tab=creators`). |
| Bottom strip | `© 2026 AdobeSphere. Built by Sudeepa Santhanam.` |

---

### 2.4 Explore — `/explore`

![Explore authoring — top](docs/authoring-screenshots/explore-1.png)
![Explore authoring — bottom](docs/authoring-screenshots/explore-2.png)

Explore is composed of several cooperating blocks rather than one monolithic component. The `tabs` block treats the three sibling sections beneath it as tab panels and switches them based on `?tab=…` in the URL.

| # | Block | Purpose |
|---|---|---|
| 1 | `Section Metadata` (`style | flush`) | Flush top padding so the hero locks under the nav. |
| 2 | `hero (search)` | Search bar hero. Row 1 = H1, row 2 = lede, row 3 = `Placeholder | Search events, blogs, creators…`. Typing into the bar fires `adobesphere:search` for the `cards` blocks below. |
| 3 | `tabs` | Three rows — each row is `Tab Label | source` (e.g. `Events & Campaigns | events`). The right cell is the data source key that selects which sibling section to show. |
| 4 | `filters (events)` + `cards (events)` | Events tab body. The `cards` block accepts `Source`, `Pagination | 6`, and the matching `filters` emits `adobesphere:filter` events to it. |
| 5 | `filters (blogs)` + `cards (blogs)` | Blogs tab body. Same shape, `Source | blogs`. |
| 6 | `filters (creators)` + `cards (creators)` | Creators tab body. Filters supports `Designation Filter | true` and `Sort | true` to enable the designation dropdown and sort menu. |

URL parameters: `?tab=blogs` opens the Blogs tab on load. `?q=foo` pre-fills the search field. `?category=Workshops` pre-applies a filter.

---

### 2.5 Login — `/login`

![Login authoring](docs/authoring-screenshots/login.png)

| # | Block | Purpose |
|---|---|---|
| 1 | `Hero` | Two-row centred hero — `Welcome Back` H1 + sub-line. (Default variant, no media.) |
| 2 | `Section Metadata` (`style | light`) | Light background under the form card. |
| 3 | `Form (login)` | Auth form. Config: `Title | Welcome back`, `Subtitle | Sign in to save events…`, `Submit | Sign In`, `After | /` (redirect target on success). The "Don't have an account? Sign up" link is rendered by the block, not authored. |

---

### 2.6 Sign Up — `/signup`

![Sign up authoring](docs/authoring-screenshots/signup.png)

Identical pattern to `/login` but with the `signup` variant.

| # | Block | Purpose |
|---|---|---|
| 1 | `Hero` | `Join the AdobeSphere` H1 + sub-line. |
| 2 | `Section Metadata` (`style | light`) | Light background. |
| 3 | `Form (signup)` | Config: `Title | Create your account`, `Subtitle | Free, takes 30 seconds…`, `Submit | Create Account`, `After | /`. |

---

### 2.7 About — `/about`

![About authoring — top](docs/authoring-screenshots/about-1.png)
![About authoring — testimonials](docs/authoring-screenshots/about-2-testimonials.png)
![About authoring — mission + timeline](docs/authoring-screenshots/about-3-mission-timeline.png)
![About authoring — timeline continued](docs/authoring-screenshots/about-4-timeline-continued.png)

| # | Block | Purpose |
|---|---|---|
| 1 | `Section Metadata` (`style | flush`) | Flush top padding. |
| 2 | `hero (video)` | Background `.mp4` row + H1 (`About the AdobeSphere Platform`) + several body paragraphs. |
| 3 | `cards (stats)` | Animated count-up counters. Each row: `Label | source | href | CTA-label`. `source` is one of `creators`, `events`, `blogs`, `users` (counts unique localStorage signups) or a literal number. |
| 4 | `cards (testimonials)` | Five-up testimonial grid. Each row: `Name | Role | Quote | Headshot`. Authored statically — no data layer. |
| 5 | `detail-section (mission)` | "Made With Purpose" contributor card grid. Cards are authored inside the block body. |
| 6 | `marquee (timeline)` | Horizontally scrollable platform-milestone ribbon with a draggable progress bar. Each row: `Milestone Title | Date | UL of bullets`. |

---

### 2.8 Contact — `/contact`

![Contact authoring](docs/authoring-screenshots/contact.png)

| # | Block | Purpose |
|---|---|---|
| 1 | (heading + paragraphs) | "Get in Touch" H1, two intro lines, and the author signature link — plain authored content, no block. |
| 2 | `form (contact)` | Contact form. Config: `form-action | https://formspree.io/f/YOUR_FORM_ID`. The block also auto-fills name/email from the current session if signed in, and provides a category dropdown sourced from a built-in list. |
| 3 | `accordion` | Collapsible FAQ list. Each row: `Question | Answer`. |

> The screenshot still uses the legacy `contact-form` and `faq` names. The current blocks are `form (contact)` and `accordion` — re-author when you next touch this page.

---

### 2.9 User Profile — `/user-profile`

![User profile authoring](docs/authoring-screenshots/user-profile.png)

A logged-in dashboard. Every grid reads from the current session's localStorage — no authored data.

| # | Block | Purpose |
|---|---|---|
| 1 | `Section Metadata` (`style | flush`) | Flush top padding so the profile header sits under the nav. |
| 2 | `profile (user)` | Editable card: avatar (uploads stored as base64), name, bio, LinkedIn URL. Zero config. |
| 3 | `Cards (events with-save)` | "Saved Events". Config: `Source | events`, `Empty | You haven't saved any events yet.` |
| 4 | `Cards (blogs with-save)` | "Saved Blogs". Same shape, `Source | blogs`. |
| 5 | `Cards (events with-actions)` | "My Registrations" — each card has a Cancel button. |
| 6 | `Cards (blogs with-actions)` | "My Published Blogs" — Edit / Delete buttons per card. |
| 7 | `Section Metadata` (`style | light`) | Light background under the recommendations. |
| 8 | `Cards (events)` | "Recommended Events". Config: `Source | events`, `Limit | 3`. |
| 9 | `Cards (blogs)` | "Recommended Blogs". Same shape. |

---

### 2.10 Blog Editor — `/blog-editor`

![Blog editor authoring](docs/authoring-screenshots/blog-editor.png)

The blog editor page is **deliberately empty**. The page route is detected by the `form` block (via the URL path) and the `form (blog-editor)` UI is mounted automatically. Leave the page body empty in da.live.

If you need to override the form's title or CTA, add a `Form (blog-editor)` block:

| Key | Value |
|---|---|
| `Title` | `New Blog Post` |
| `Submit` | `Publish Blog` |
| `Success` | `Blog published!` |

---

### 2.11 Blog detail — `/blog/template`

Rendered for every URL of the form `/blog/{id}`. The block code reads `{id}` from the URL and hydrates each `Id Source | blogs` block from `/scripts/data/blogs.json`.

![Blog template authoring — top](docs/authoring-screenshots/blog-template-1.png)
![Blog template authoring — bottom](docs/authoring-screenshots/blog-template-2.png)

| # | Block | Purpose |
|---|---|---|
| 1 | (Article Title placeholder) | "Article Title", "Category — Date", "Author Name" — these are placeholder strings replaced by the hero block at runtime. |
| 2 | `hero (compact)` | Slim title strip showing category · date · author + H1. Config: `Source | blogs`. |
| 3 | `detail-section (article-body)` | Renders the `content[]` array from `blogs.json`. Each `{type: heading}` becomes `<h2>`, `{type: paragraph}` → `<p>`, `{type: image}` → `<figure>`. Config: `Id Source | blogs`. |
| 4 | `detail-section (bio-blog)` | Author bio card. Cross-references `creators.json` by the blog's `authorEmail`. Config: `Title | About the Author`, `Id Source | blogs`. |
| 5 | `Section Metadata` (`style | light`) | Light bg under the comments section. |
| 6 | `detail-section (comments)` | Discussion thread (comments persist in `Storage`). Config: `Title | Discussion`. No `Id Source` needed — the URL id is used directly. |
| 7 | `cards (blogs)` | "More from the Blog". Config: `Source | blogs`, `Limit | 3`. |

---

### 2.12 Event detail — `/events/template`

Rendered for every `/events/{id}` URL.

![Event template authoring — top](docs/authoring-screenshots/event-template-1.png)
![Event template authoring — bottom](docs/authoring-screenshots/event-template-2.png)

| # | Block | Purpose |
|---|---|---|
| 1 | `hero (media)` | Big banner image at the top + title row + meta row. Config: rows are `Event Title` and `Meta | Saturday, April 18, 2026 · Houston Convention Center`. |
| 2 | `event-actions` | Save toggle + Register CTA bar. Rows: `Save Event` and `Register for this Event`. Clicking Register fires `adobesphere:show-registration` to open the modal form below. |
| 3 | `detail-section (overview)` | Description paragraphs from `campaigns.json`. Config: `Title | Event Overview`, `Id Source | events`. |
| 4 | `Section Metadata` (`style | light`) | Light bg under the agenda. |
| 5 | `detail-section (agenda)` | Time-blocked schedule. Config: `Title | Schedule & Agenda`, `Id Source | events`. |
| 6 | `detail-section (people presenters)` | Presenter cards from the event's `presenters[]`. |
| 7 | `detail-section (people speakers)` | Guest speaker cards. |
| 8 | `detail-section (people hosts)` | Event host cards. |
| 9 | `detail-section (quote)` | Reads `closingQuote` from the event record. Config: `Id Source | events`. |
| 10 | `Section Metadata` (`style | light`) | |
| 11 | `Form (event-registration)` | Modal registration form, hidden by default and opened by `event-actions`. Config: `Title | Confirm Your Spot`, `Submit | Register Now`, `Success | You're successfully registered for this event!`. |
| 12 | `cards (events)` | "You Might Also Like" — related events by explicit id list. Config: `Source | events`, `Ids | event-005, event-007, event-012`, `Limit | 3`. |

---

### 2.13 Creator profile — `/creator-profile/template`

Rendered for every `/creator-profile?id={email}` URL.

![Creator profile template authoring — top](docs/authoring-screenshots/creator-profile-template-1.png)
![Creator profile template authoring — bottom](docs/authoring-screenshots/creator-profile-template-2.png)

| # | Block | Purpose |
|---|---|---|
| 1 | `Section Metadata` (`style | flush`) | Flush top padding so the profile hero sits under the nav. |
| 2 | `profile (creator)` | Creator hero header — large avatar, name, designation, stats strip. Reads the creator id from the URL, hydrates from `/scripts/data/creators.json`. Zero config. |
| 3 | `detail-section (bio-creator)` | "About" — bio paragraphs from the creator record. Config: `Title | About`, `Id Source | creators`. |
| 4 | `detail-section (reach-out)` | Email + LinkedIn card. Config: `Title | Reach Out`, `Id Source | creators`. |
| 5 | `Section Metadata` (`style | light`) | Light bg under the related content. |
| 6 | `cards (events)` | The creator's events. Config: `Source | events`, `Ids From | creators.eventIds` (resolves the URL creator's `eventIds` array and filters down to those ids). |
| 7 | `cards (blogs)` | The creator's blogs. Config: `Source | blogs`, `Ids From | creators.blogIds`. |
| 8 | `detail-section (quote-creator)` | Reads `featuredQuote` from the creator record. Config: `Id Source | creators`. |

---

## 3. Block reference (all variants)

The page recipes above show real-world usage. The tables below catalogue every variant and the config rows each accepts.

### 3.1 `hero`

Variants: `default · video · search · media · compact · gradient · creator`.

| Row format | Effect |
|---|---|
| First text row in the block | H1 (page title) |
| Following text rows | Paragraph(s) under the title |
| Image / video row (`.mp4`/`.webm`/`.png`/`.jpg`) | Becomes background media — `.mp4`/`.webm` promoted to autoplay-muted-loop `<video>` |
| `Placeholder | …` | Search-variant input placeholder |
| `Meta | …` | Subtitle / meta row (media variant) |
| Bold link in a row | Primary CTA button |
| Italic link in a row | Secondary CTA button |
| `Id Source | events|blogs|creators` | Hydrate hero from the entity record in the matching JSON (used on detail templates) |

### 3.2 `cards`

Variants: `events · blogs · creators · testimonials · stats · with-save · with-actions · horizontal`. Multiple variants can be combined (`cards (events with-save)`).

| Key | Effect |
|---|---|
| `Source` | One of `events`, `blogs`, `creators`. Hydrates from `/scripts/data/{name}.json` (with `events` → `campaigns.json`). |
| `Filter` | `field=value` (e.g. `featured=true`, `category=Workshops`). |
| `Ids` | Comma-separated list of explicit ids — wins over `Filter`. |
| `Ids From` | Cross-reference pattern like `creators.eventIds`. Reads the URL entity from `{source}`, takes `{field}` as an id list, filters cards to those ids. |
| `Limit` | Max number of cards to render. |
| `Title` | Optional `<h2>` rendered above the grid. |
| `Empty` | Message shown when the filtered list is empty. |
| `Pagination` | (Explore only) Page size — turns the grid into a paginated view. |
| `Filters` | (Explore only) `true` to render the filter bar above the grid. |

The `testimonials` and `stats` variants are **content-row driven** — each row is one card / counter:
- `testimonials`: `Name | Role | Quote | Headshot`
- `stats`: `Label | source-or-number | href | CTA-label`

### 3.3 `tabs`

Each row is one tab: `Tab Label | source-key`. The block treats the next *n* sibling sections as the tab panels (in order).

### 3.4 `filters`

Variants: `events · blogs · creators`. Config rows:

| Key | Effect |
|---|---|
| `Source` | One of `events`, `blogs`, `creators`. |
| `Designation Filter` | `true` to render the designation dropdown (creators only). |
| `Sort` | `true` to render the sort menu. |

### 3.5 `form`

Variants: `contact · login · signup · event-registration · blog-editor` (the default variant is `contact`).

| Key | Effect |
|---|---|
| `Title` | Form heading / brand title. |
| `Subtitle` | Sub-line shown under the title (auth variants). |
| `Submit` | CTA button label. |
| `Success` | Toast message on successful submit. |
| `After` | Path to redirect to after success (auth + event-registration). |
| `form-action` | Endpoint URL (contact variant — Formspree, etc.). |

### 3.6 `detail-section`

Variants: `overview · agenda · people-presenters · people-speakers · people-hosts · quote · bio-blog · bio-creator · reach-out · article-body · comments · mission`. The `people` variant can also be written as `people presenters` etc. — both work.

| Key | Effect |
|---|---|
| `Title` | Section heading (where the variant supports one). |
| `Id Source` | One of `events`, `blogs`, `creators` — which JSON file to look up the entity. |
| `Id` | Override the URL-resolved id (rarely needed). |
| `Empty` | Message when no data is available. |

### 3.7 `profile`

Variants: `user · creator`. Neither takes config rows.

### 3.8 `marquee`

Variants: `default · timeline`.

- **default** — auto-scrolling pill strip. Authored rows are ignored on the Home page (pills come from data); on any other page each row becomes a pill: `Label | tab=events&category=Workshops`. URL-encode `&` inside category values as `%26`.
- **timeline** — milestone ribbon. Each row: `Milestone Title | Date | UL of bullets`.

### 3.9 `accordion`

Each row is one item: `Question | Answer`. Used as a generic FAQ list.

### 3.10 `event-actions`

Two content rows: `Save Event` and `Register for this Event` (the button labels). No config keys.

### 3.11 `auth-form`

Legacy variant of `form (login)` / `form (signup)`. Same config keys (`Title`, `Subtitle`, `Submit`, `After`). New pages should prefer the `form` block.

### 3.12 `fragment`

Used implicitly by `header`/`footer` to load `/nav` and `/footer`. You don't normally author this block directly.

### 3.13 `Section Metadata`

Not a block — an EDS convention for changing the **enclosing section's** background or padding. Place it at the **top of the section** (before any content blocks).

| Key | Recognised values |
|---|---|
| `style` | `light` (#f3f4f5 bg), `dark` (#242024 bg, white text), `flush` (zero padding), `no-pad-top`, `no-pad-bottom` |

You can stack multiples in one cell: `style | light, no-pad-bottom`.

---

## 4. Inter-block communication

Blocks never import each other directly. They coordinate by firing browser `CustomEvent`s on `window`:

| Event | Fired by | Listened to by |
|---|---|---|
| `adobesphere:filter` | `filters` | `cards` |
| `adobesphere:switchtab` | `tabs` | `filters`, `cards` |
| `adobesphere:search` | `hero (search)` | `cards` |
| `adobesphere:search:results` | `cards` | `tabs` |
| `adobesphere:show-registration` | `event-actions` | `form (event-registration)` |
| `adobesphere:registration-changed` | `form` | `event-actions` |
| `adobesphere:focus-search` | `header` search button | `hero (search)` |
| `adobesphere:avatar-updated` | `profile` | `header` |

If you're adding a new cross-block interaction, follow this same pattern instead of importing.

---

## 5. Authoring tips

- **Variants are space-separated** in the block name parentheses: `cards (events horizontal)` applies both `events` and `horizontal` as classes.
- **Config keys are case-insensitive** but always written in `Title Case` in the screenshots for readability.
- **Always Preview your changes** in da.live before publishing — the preview URL is the same as the live URL but on the `aem.page` host.
- **Section breaks matter.** A `Section Metadata` block only applies to the section it sits inside (between the previous and next horizontal rule / section break).
- **Re-using blocks across pages.** Most of the same blocks recur across pages — copy a section from another page and edit the config rather than rebuilding from scratch.
