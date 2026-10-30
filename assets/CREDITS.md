# Credits and licences

Every file the site uses is listed here with where it came from and the terms it is used under.

## Fonts (in `assets/fonts/`)

All fonts are served from this site, so nothing is loaded from a font service when the page opens.

| Font | Used for | Author | Licence |
|---|---|---|---|
| Cabinet Grotesk (500) | Headings | Indian Type Foundry, via Fontshare | ITF Free Font License 2.0 (`fontshare/ITF-FFL.txt`) |
| Satoshi (variable) | Body text, buttons, labels | Indian Type Foundry, via Fontshare | ITF Free Font License 2.0 (`fontshare/ITF-FFL.txt`) |
| DSEG7 Classic (Bold) | The LCD digits in the countdown and the schedule clock | keshikan, 2017 | SIL Open Font License 1.1 (`dseg/DSEG-LICENSE.txt`) |

**Fontshare fonts:** downloaded unmodified from https://www.fontshare.com by `tools/fetch-fonts.mjs` (`npm run fonts`). The ITF licence allows using them on websites, including self-hosting. It does **not** allow sharing the font files on their own. That's why they're in `.gitignore` and must not go into a public repository. Uploading them to the site's own web host is normal use.

**DSEG7:** taken unmodified from the `dseg` npm package, version 0.46.0 (https://github.com/keshikan/DSEG). The file's SHA-256 matches the published package file. "DSEG" is a Reserved Font Name under the OFL, so the file must stay unmodified if it keeps that name.

## Code library (in `js/vendor/`)

| Library | Version | Author | Licence |
|---|---|---|---|
| GSAP + ScrollTrigger | 3.15.0 | GreenSock (Webflow) | GreenSock "Standard No Charge" licence, https://gsap.com/standard-license. Free for all uses, including commercial. The package README is saved as `js/vendor/GSAP-README.md`. |

Downloaded from https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ and kept in the project, so school networks that block CDNs still get the scroll effects.

## Photo (in `assets/photos/`)

| File | What it is | Source | Licence |
|---|---|---|---|
| `board-1600.webp`, `board-960.webp` | Close-up of a circuit board with a soft blue-violet glow, used in the About section | Photo by Brecht Corbeel on Unsplash: https://unsplash.com/photos/closeup-of-a-computers-motherboard-connector-q5EUp6a67pg | Unsplash License: free to use, including commercially, with no permission needed. |

Re-saved as WebP at two widths; otherwise unchanged. Credit isn't required by the licence, but it's given here.

## Satellite images (in `assets/intro/`)

The zoom from space at the start of the intro. Made by `tools/intro-imagery/make.py`, which downloads the data, reprojects it into one view centred on the school, grades the colour and saves the sizes the page uses. Nothing in them is drawn or invented: the colours of land and coastal water are what the satellite recorded. The only additions are the deep-sea fill (Sentinel-2 doesn't image the open ocean), the soft edges and the thin atmosphere line around the globe.

| Files | What | Source | Licence |
|---|---|---|---|
| `earth-0-*` to `earth-4-*` (the Earth down to about 250 km across) | Sentinel-2 L2A 120 m cloudless mosaic, 11–20 February 2020 | Sinergise / Sentinel Hub, on AWS Open Data: `s3://sentinel-s2-l2a-mosaic-120` | CC BY 4.0. Required credit: "Contains modified Copernicus data 2020 processed by Sentinel Hub" |
| `earth-5-*` to `earth-7-*` (Bengaluru and the school's neighbourhood) | Sentinel-2 L2A scenes `S2C_43PGQ_20260206_0_L2A` and `S2C_43PHQ_20260206_0_L2A`, 10 m per pixel, 6 February 2026 | European Space Agency / Copernicus, via Element 84 Earth Search on AWS Open Data: `s3://sentinel-cogs` | Copernicus Sentinel data terms: free to use, copy and change, with credit. Required credit: "Contains modified Copernicus Sentinel data 2026" |
| (used to tell land from sea; not shipped) | NOAA GLOBE 1 km land mask, via the `global-land-mask` Python package | NOAA NGDC | Public domain (US government work) |

**The campus close-up** (`campus-landscape.*` and `campus-portrait.*`, once added) is rendered in Google Earth Studio from Google Earth imagery. It's used under Earth Studio's terms (education and non-profit use, with attribution). The credit Earth Studio stamps onto every frame ("Google Earth" and the imagery providers) must stay visible: don't crop or cover it.

The site shows the credit line in the footer (`content.json`, `footer.credit`). Keep it there while these images are used.

## Aerial photos of the campus (in `assets/intro/campus-*`)

| Files | What | Source |
|---|---|---|
| `campus-top-*`, `campus-top-tall-*` | Straight-down drone photo of the campus | Supplied by Nihal on 29 October 2026 as the school's own aerial photos |
| `campus-wide-*` | Angled panoramic shot of the campus | Same |
| `campus-tall-*` | Angled shot of the campus | Same |

Bangalore International School owns the rights to these photos: Nihal asked the school and confirmed this on 29 October 2026. Re-saved at two sizes as AVIF and WebP by `tools/intro-imagery/campus-photos.py`, and the straight-down shot also turned upright for phones. Otherwise unchanged.

## Logos (in `assets/logos/`)

Used with permission: on 23 October 2026 Nihal (who runs this project) confirmed there is permission to use both logos on the site. Neither logo has been redrawn or recoloured.

| File | Owner | Source |
|---|---|---|
| `bis-logo.png` | Bangalore International School | Correct logo supplied by the user on 30 October 2026, used unchanged in the intro, presenter, organiser and footer. Supersedes the brochure-derived `bis-emblem.webp`. |
| `vidyashilp-university.webp` | Vidyashilp University | The university's own logo file: https://vidyashilp.edu.in/wp-content/uploads/2020/12/Logo.png, re-saved as WebP. |

If either institution sends official high-resolution or SVG logo files, replace these and keep the same file names.

## Artwork (in `assets/art/`, plus `assets/favicon*` and `assets/apple-touch-icon.png`)

All original, made in code for this project. No stock images, no AI image generators, and nothing taken from any show, game, brand or other website.

- `og-image.jpg`: the preview image for links shared on WhatsApp, Instagram and similar apps (the Echelon logo, the name, grades and date). Made by `tools/art/logo.mjs`.
- `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`: the tree from the Echelon logo on black. Made by `tools/art/logo.mjs`.

## The Echelon logo (`src/logo.js`, `assets/logos/echelon-*.svg`)

Redrawn in code from the official Echelon 4.0 artwork, supplied by Nihal in October 2026 as the official logo. Same design (arched ECHELON over a circuit tree in a plug), modernised; see `DECISIONS.md`, section 8b.
- Not files at all: the particle orb and the particle part of the intro (WebGL), the gravity well (canvas), the dot field (canvas), the glass event art (CSS gradients) and every icon (inline SVG). All are drawn by the page's own code.

## Reference material (not used in the site)

- **sentient-os.ai** was the design reference for the redesign, at Nihal's request. It was looked at in a browser for its overall look and the kinds of elements it uses (see `DECISIONS.md`, section 2). None of its code, images, text or logo is in this project. Every element was built from scratch. It uses the same two free Fontshare typefaces.
- **The Echelon 3.0 website** (bisechelon.in/echelon3.0, January 2026) was the source of the event details, rules, timings, venue, tagline and registration link in `content.json`. These are last year's facts and need confirming.
- **Echelon 3.0 brochure** (BIS, January 2026): the source of the BIS emblem (see Logos).
- **Cyberpunk: Edgerunners** was the colour and mood reference for the first version only. Nothing from it was ever in the project, and the redesign doesn't use it at all.
- `references/font-comparison.png`: a specimen sheet from the first version's font choice. Kept for the record.

## Event artwork (`assets/events/`)

Eight PNGs supplied by the user on 30 October 2026, used unchanged for Game Design, AI Expert System Challenge (title and circuit-brain symbol composed as a single panel), Treasure Hunt, Pitch Tank (the app pitch event), E-Waste Reimagined, Escape Room and Web Design. Their original colours, lettering and full frames are preserved. The AI panel combines attachments 2 and 3 through the page layout.
