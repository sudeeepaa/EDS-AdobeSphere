# AdobeSphere — da.live Authoring Reference

Every block in this project is authored in [da.live](https://da.live/) using a simple table. The first row of the table is **always** the block name (with optional variant in parentheses). Subsequent rows are either **content rows** (your actual copy / images) or **config rows** in `Key | Value` form. Config rows are consumed by the block code and never rendered.

If you've never authored an EDS page before, the [aem.live tutorial](https://www.aem.live/developer/tutorial) is the right starting point — this doc assumes you've already learned the basics.

---

## Page setup checklist

Every page should have, in order:

1. **Hero** (any variant)
2. **Body sections** (one or more — events grid, detail sections, forms…)
3. (optional) **Section Metadata** rows preceding a section to swap its background (`style | light`, `style | dark`, `style | flush`)

The header (`/nav`) and footer (`/footer`) are loaded from fragments — author them once and they apply everywhere.

---

## 1. Header (`/nav` fragment)

The header block always reads from `/nav`. Author the nav as a regular page with three top-level sections:

**Section 1 — Brand:**

| (just author the brand — no block needed) |
|---|
| ![logo](image-link) [**Adobe**sphere](/) |

The `<strong>Adobe</strong>` part is what gets coloured red. The image becomes the wordmark icon.

**Section 2 — Primary links:**

| (UL of links, no block) |
|---|
| - [Home](/) |
| - [Explore](/explore) |
| - [About](/about) |
| - [Contact](/contact) |

**Section 3** is optional and reserved for future utilities. Leave it empty unless you have a reason.

> The auth zone (Sign In / Sign Up vs avatar dropdown) is rendered by code based on the user's session — don't author it.

---

## 2. Footer (`/footer` fragment)

Author at `/footer`. Each top-level section becomes one footer column. The **last** section becomes the bottom strip (copyright line).

| Section 1 — brand |
|---|
| **Adobe**sphere |
| A student-built destination for discovering Adobe events, insights, and the creators shaping modern digital craft. |

| Section 2 — Quick Links |
|---|
| ### Quick Links |
| - [Home](/) |
| - [Explore](/explore) |
| - [About](/about) |
| - [Contact](/contact) |

| Section 3 — Content |
|---|
| ### Content |
| - [Campaigns & Events](/explore?tab=events) |
| - [Blogs & Articles](/explore?tab=blogs) |
| - [Creator Profiles](/explore?tab=creators) |

| Section 4 — bottom strip |
|---|
| © 2026 AdobeSphere. Built by Sudeepa Santhanam. |

---

## 3. Hero

### 3.1 Hero — default (centred title + paragraphs + buttons)

| Hero |
|---|
| # About the AdobeSphere Platform |
| AdobeSphere is a student-built platform that brings Adobe's creative world… |
| **[Explore All](/explore)** *[Join](/signup)* |

### 3.2 Hero (video) — Home

| Hero (video) |
|---|
| ![video bg](/assets/videos/home-hero-background.mp4) |
| # Where Adobe's Creative Universe Comes Alive |
| Discover signature events, insightful articles, and standout creators shaping the future of digital creativity. |
| **[Explore All](/explore)** *[Join the Community](/signup)* |

> The picture row at the top can be a real image or an `.mp4` / `.webm` link — the block detects the extension and promotes it to a `<video autoplay muted loop playsinline>`.

### 3.3 Hero (search) — Explore

| Hero (search) |
|---|
| # Explore the AdobeSphere |
| Find events, stories, and creators shaping the next wave of digital creativity. |
| Placeholder | Search events, blogs, creators… |

### 3.4 Hero (media) — Event detail banner

| Hero (media) |
|---|
| ![banner](/assets/images/events/adobe-summit.jpg) |
| # Event Title |
| Meta | Saturday, April 18, 2026 · Houston Convention Center |

### 3.5 Hero (gradient) — Creator profile (alternative to using the `profile (creator)` block)

| Hero (gradient) |
|---|
| Avatar | ![ariana](/assets/images/profiles/ariana-flores-creator.jpg) |
| # Ariana Flores |
| Senior Creative Director |
| Stats | <ul><li>**12** Blogs Published</li><li>**8** Events Hosted</li><li>**5** Testimonials</li></ul> |

### 3.6 Hero (compact) — Blog detail title strip

| Hero (compact) |
|---|
| # Article Title |

---

## 4. Cards

### 4.1 Cards (events) — featured events grid

| Cards (events) |
|---|
| Title | Featured Events & Campaigns |
| Source | events |
| Filter | featured=true |
| Limit | 6 |

### 4.2 Cards (blogs)

| Cards (blogs) |
|---|
| Title | From the Adobe Blog |
| Source | blogs |
| Filter | featured=true |
| Limit | 4 |

### 4.3 Cards (creators)

| Cards (creators) |
|---|
| Title | Meet the Creators |
| Source | creators |
| Filter | featured=true |
| Limit | 4 |

### 4.4 Cards (events with-save) — saved items grid (user profile)

| Cards (events with-save) |
|---|
| Title | Saved Events |
| Source | events |
| Empty | You haven't saved any events yet. |

### 4.5 Cards (events with-actions) — registrations grid

| Cards (events with-actions) |
|---|
| Title | My Registrations |
| Source | events |
| Empty | You haven't registered for anything yet. |

### 4.6 Cards (blogs with-actions) — published blogs grid

| Cards (blogs with-actions) |
|---|
| Title | My Published Blogs |
| Source | blogs |
| Empty | You haven't published any blogs yet. |

### 4.7 Cards (events horizontal) — side-by-side layout

| Cards (events horizontal) |
|---|
| Source | events |
| Filter | category=Workshops |
| Limit | 4 |

### 4.8 Cards (events) — by explicit ids ("you might also like")

| Cards (events) |
|---|
| Title | You Might Also Like |
| Source | events |
| Ids | event-005, event-007, event-012 |

### 4.9 Cards (testimonials) — statically authored (no data layer)

| Cards (testimonials) |
|---|
| Maya Chen | Senior Product Designer | AdobeSphere makes it effortless to find the right event… | ![maya](/assets/images/profiles/maya-chen-testimonial.jpg) |
| Arjun Patel | Motion Designer | Following creators here is genuinely useful. I learn… | ![arjun](/assets/images/profiles/arjun-patel-testimonial.jpg) |
| Leila Hassan | Brand Strategist | Saving events and reading the discussion threads turned… | ![leila](/assets/images/profiles/leila-hassan-testimonial.jpg) |

### Recognised config rows

| Key | Effect |
|---|---|
| `Source` | One of `events`, `blogs`, `creators`. Hydrates from `/data/{name}.json` (campaigns.json for events). |
| `Filter` | `field=value` (e.g. `featured=true`, `category=Workshops`). |
| `Ids` | Comma-separated list of ids — wins over `Filter`. |
| `Limit` | Max number of cards to render. |
| `Title` | Optional `<h2>` rendered above the grid. |
| `Empty` | Message shown when the filtered list is empty. |

---

## 5. Explore

A single block, no config required. Drop it on the page and it renders tabs / search / filters / grid / pagination, hydrating all three datasets.

| Explore |
|---|
| Page Size | 9 |

The `Page Size` row is optional (defaults to 9).

URL params honoured: `?tab=events|blogs|creators`, `?q=text`, `?category=name`. Linking from the marquee already passes these.

---

## 6. Form

### 6.1 Form (default = contact)

| Form |
|---|
| Title | Send us a message |
| Submit | Send Message |
| Success | Thanks — we'll get back to you within 24–48 hours. |

### 6.2 Form (login)

| Form (login) |
|---|
| Title | Welcome back |
| Subtitle | Sign in to save events, write blogs, and join the discussion. |
| Submit | Sign In |
| After | / |

### 6.3 Form (signup)

| Form (signup) |
|---|
| Title | Join the community |
| Subtitle | Free, takes 30 seconds, and unlocks saving + commenting + publishing. |
| Submit | Create Account |
| After | / |

### 6.4 Form (event-registration) — used inside the event detail template

| Form (event-registration) |
|---|
| Title | Confirm Registration |
| Submit | Confirm Registration |
| Success | You're registered. See you there! |

### 6.5 Form (blog-editor)

| Form (blog-editor) |
|---|
| Title | New Blog Post |
| Submit | Publish Blog |
| Success | Blog published! |

### Recognised config rows

| Key | Effect |
|---|---|
| `Title` | Form heading / brand title (auth variants). |
| `Subtitle` | Sub-line shown under the title (auth variants). |
| `Submit` | CTA button label. |
| `Success` | Toast message on successful submit. |
| `After` | Path to redirect to after success (auth + registration). |

---

## 7. Detail-section

The most variant-heavy block, but each variant is mechanically simple. Use one block per logical section of a detail page.

### 7.1 Detail-section (overview)

| Detail-section (overview) |
|---|
| Title | Event Overview |
| Id Source | events |

### 7.2 Detail-section (agenda)

| Detail-section (agenda) |
|---|
| Title | Schedule & Agenda |
| Id Source | events |

### 7.3 Detail-section (people presenters / speakers / hosts)

Three variants, same pattern. Add `presenters`, `speakers`, or `hosts` to the block class:

| Detail-section (people presenters) |
|---|
| Title | Presenters |
| Id Source | events |

| Detail-section (people speakers) |
|---|
| Title | Guest Speakers |
| Id Source | events |

| Detail-section (people hosts) |
|---|
| Title | Event Hosts |
| Id Source | events |

### 7.4 Detail-section (quote) — reads `closingQuote` (events) or `featuredQuote` (creators)

| Detail-section (quote) |
|---|
| Id Source | events |

### 7.5 Detail-section (bio) — used on blog detail (author) and creator profile

| Detail-section (bio creator) |
|---|
| Title | About |
| Id Source | creators |

### 7.6 Detail-section (reach-out) — creator email + LinkedIn

| Detail-section (reach-out) |
|---|
| Title | Reach Out |
| Id Source | creators |

### 7.7 Detail-section (comments) — blog discussion thread

| Detail-section (comments) |
|---|
| Title | Discussion |

> Comments don't need an `Id Source` — the entity id comes from the URL automatically.

### Recognised config rows

| Key | Effect |
|---|---|
| `Title` | Section heading (when supported by the variant). |
| `Id Source` | One of `events`, `blogs`, `creators` — which JSON file to look up the entity. |
| `Id` | Override the URL-resolved id (rarely needed). |
| `Empty` | Message when no data is available. |

---

## 8. Profile

### 8.1 Profile (user) — editable user dashboard

| Profile (user) |
|---|

The user variant has zero config. It reads the current session.

### 8.2 Profile (creator) — creator hero header with stats

| Profile (creator) |
|---|

Reads the creator id from the URL, hydrates from `/data/creators.json`.

---

## 9. Marquee

| Marquee |
|---|
| All | tab=events |
| AI & Technology | tab=blogs&category=AI %26 Emerging Technology |
| Creative Tools | tab=blogs&category=Creative Tools %26 Product Updates |
| Industry Trends | tab=blogs&category=Industry Trends %26 Thought Leadership |
| Workshops | tab=events&category=Workshops |
| Webinars | tab=events&category=Webinars |
| Conferences | tab=events&category=Conferences |

Each row is one pill. Cell 1 is the label, cell 2 is the URL query string (without the leading `?`). Encode `&` inside category names as `%26`.

---

## 10. Stats

| Stats |
|---|
| Creators | creators | /explore?tab=creators | View All Creators → |
| Events | events | /explore?tab=events | View All Events → |
| Blogs | blogs | /explore?tab=blogs | View All Blogs → |
| Registered Users | users | /signup | Join the Community → |

Per row:
- Cell 1 — label
- Cell 2 — source: one of `creators`, `events`, `blogs`, `users` (counts unique localStorage signups), **or** a literal number like `1200`
- Cell 3 — optional CTA href
- Cell 4 — optional CTA label

---

## 11. Timeline

| Timeline |
|---|
| Ideation & Vision | Apr 09, 2026 | <ul><li>Defined MVP scope and core use-cases.</li><li>Locked pillars: Events, Blogs, Creator Profiles.</li></ul> |
| Blueprint & UX Mapping | Apr 10, 2026 | <ul><li>Mapped end-to-end UX flows.</li><li>Designed shared layout.</li></ul> |
| Data & Scaffolding | Apr 11, 2026 | <ul><li>Structured JSON data and curated platform assets.</li></ul> |

Per row:
- Cell 1 — milestone title
- Cell 2 — date string (free-form, e.g. `Apr 09, 2026`)
- Cell 3 — UL of bullet points (each `<li>` becomes one line in the card)

---

## 12. Section Metadata (cross-cutting)

To change a section's background or padding, place a Section Metadata block at the **top of the section** (before any content blocks). This is an EDS convention, not specific to AdobeSphere.

| Section Metadata |
|---|
| style | light |

Recognised values:
- `light` — light off-white background (`#f3f4f5`)
- `dark` — dark `#242024` background, white text
- `flush` — zero padding (used for hero-like full-bleed sections)
- `no-pad-top` / `no-pad-bottom` — kill one side of the section padding

You can stack multiples: `style | light, no-pad-bottom`.

---

## 13. Page recipes

### Home page

```
1. Section: Hero (video)            ← red gradient hero with bg video
2. Section: Cards (events)          ← featured events
3. Section: Marquee                 ← category pills
4. Section: Cards (blogs)           ← featured blogs
5. [Section Metadata: style | light] + Cards (creators)  ← featured creators on light bg
```

### About page

```
1. Hero                             ← centred static hero
2. Stats                            ← 4-up animated counters
3. Cards (testimonials)             ← What Creators Are Saying
4. Timeline                         ← Platform Journey
```

### Event detail page

```
1. Hero (media)                     ← image banner with title + meta
2. Cards (events with-save with-actions)  ← Save + Register CTA bar
3. Detail-section (overview)
4. [Section Metadata: style | light] + Detail-section (agenda)
5. Detail-section (people presenters)
6. Detail-section (people speakers)
7. Detail-section (people hosts)
8. Detail-section (quote)
9. Form (event-registration)        ← inline registration form
10. [Section Metadata: style | light] + Cards (events) [Limit 3]   ← related events
```

### Blog detail page

```
1. Hero (compact)                   ← title strip
2. Detail-section (bio blog)        ← author strip
3. (article body — authored as default content blocks: paragraphs, headings, images)
4. [Section Metadata: style | light] + Detail-section (comments)
5. Cards (blogs) [Limit 3]          ← more from blog
```

### Creator profile page

```
1. [Section Metadata: style | flush] + Profile (creator)   ← gradient header w/ avatar + stats
2. Detail-section (bio creator)
3. [Section Metadata: style | light] + Detail-section (reach-out)
4. Cards (events)                   ← creator's events
5. Cards (blogs)                    ← creator's blogs
6. Detail-section (quote)
```

### User profile page

```
1. Profile (user)                   ← editable dashboard
2. Cards (events with-save)         ← Saved Events
3. Cards (blogs with-save)          ← Saved Blogs
4. Cards (events with-actions)      ← My Registrations (cancel buttons)
5. Cards (blogs with-actions)       ← My Published Blogs (edit/delete)
```
