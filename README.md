# Echelon unified website

A one-page website for **Echelon**, the interschool tech fest run by Bangalore International School in collaboration with Vidyashilp University, for students in Grades 8–12. This repository combines the main site with the earlier editions under `history/`. The History button opens that archive.

**Live website: https://bisechelon.in/**. Push changes to `main` to build and deploy automatically (the server checks every minute after a successful build). See [INTEGRATION.md](INTEGRATION.md) for the source repositories and edition mapping. The historical validation reports below were inherited from the original main site.

- The look is black and minimal, with a glowing particle orb, glass panels and a liquid-glass cursor.
- The intro falls from space to the school through real satellite images (Sentinel-2), then the particles form the word "Echelon".
- The date is **Saturday, 21 November 2026**, from the BIS 2026–27 school calendar ("ECHELON 4.0"), and the hero counts down to it. The eight events, their times and rooms, and the day's programme come from the Echelon 4.0 programme document. Teams are three students, with up to two teams per school in every event, and registration uses the ECHELON 4.0 Google Form. Questions go to malarvizhi@bischool.in.
- Mobile Lighthouse (28 October 2026, in a container with no GPU, which is harsher than a normal machine): 93 performance, 100 accessibility, 96 best practices, 100 SEO, median of 3 runs. Desktop scores 100 for performance. The 96 in best practices only happened because the fonts couldn't be downloaded in that container.
- Browser tests: 78 of 79 checks pass. The one failure is the same two missing font files.
- Details are in [`reports/`](reports/README.md).

---

## Look at it on your computer

You need [Node.js](https://nodejs.org) (version 18 or newer). The two main fonts aren't stored in this folder (see [Fonts](#fonts)), so the first time, run:

```
npm run fonts
```

Then, every time:

```
node build.js
npm run serve
```

Open http://127.0.0.1:8080. To stop the server, press Ctrl + C.

Double-clicking `index.html` mostly works too, but Chrome blocks the custom fonts on `file://` pages, so the server is the way to see it properly.

---

## Changing the content

**All text and images come from `content.json`.** Edit it, then run:

```
node build.js
```

That rebuilds `index.html`. The build checks the file for mistakes (a bad date, a bad link, a missing logo, an unknown event icon) and prints every placeholder that still needs a real value.

Anything written as `[PLACEHOLDER: something]` shows up on the page as an amber dashed chip, so it's obvious it isn't confirmed. Replace the whole thing, brackets included, with the real text.

### What still needs a real value

Nothing at the moment. Anything written as `[PLACEHOLDER: ...]` in `content.json` shows on the page as a marked placeholder, and `node build.js` always prints the current list. When it says "No placeholders left", everything is filled.

### Filled in from other sources, so check before launch

- **The events and the day:** from the Echelon 4.0 programme document ("Echelon 4.0 – High School Competitions", October 2026). That covers the eight events, their times, rooms, descriptions and rules, and the programme: reporting at 8:15 am, the opening ceremony at 9:00, lunch at 12:45 and prize distribution from 1:30 to 2:30 pm. The countdown counts to the 8:15 am reporting time.
- **Left out on purpose:** the prize amounts.
- **The registration link is last year's Google Form.** It still opens, but its title is "ECHELON 2026". Put this year's form in `event.registrationUrl`.

### Changing the event date (the countdown)

In `content.json`, set:

```json
"date": "2026-11-21T08:15:00+05:30",
"dateText": "Saturday, 21 November 2026",
```

- `date` drives the LCD countdown in the hero. Keep the `+05:30` at the end, which is India time. If the start time changes, change the `08:15` part.
- Leave `date` as `""` and the page says "Date to be announced" instead of counting.
- Once the time has passed, the countdown says "Echelon is happening now".

To **preview** the countdown with a different date, add `?date=` to the address:
http://127.0.0.1:8080/?date=2027-01-16T08:30:00%2B05:30

(`%2B` is how a `+` is written in a link.) This only affects your own browser tab.

### Events

`events.items` has one entry per card. To add an event, copy a whole `{ … }` block and give it a new `id` (lowercase letters, numbers and dashes, e.g. `"drone-race"`). To remove one, delete its block. Each event needs:

- `name`, `summary`, `grades`
- `teamSize`, `teamsPerSchool`, `duration`
- `priorKnowledge`, `resources`
- `about` (a list of paragraphs) and `rules` (a list)
- `icon`: one of `key`, `gamepad`, `compass`, `fin`, `recycle`, `drone`, `browser`
- `palette`: three colours like `["#FF7A3D", "#FF4D8D", "#A259FF"]` for the card's glass art

The card shows the short fields. "View rules" opens everything.

### Registration

The Register buttons link to `event.registrationUrl` and open it in a new tab. The site never collects any data itself.

---

## Turning the intro and effects off

For **everyone**, set any of these to `false` in `content.json`, then run `node build.js`:

```json
"settings": {
  "intro": true,
  "effects": true,
  "customCursor": true,
  "scrollAnimations": true
}
```

| Setting | When `false` |
|---|---|
| `intro` | No loading intro |
| `effects` | Everything still: no intro, the orb, the gravity well and the dot field become still pictures, no glass cursor, no scroll animations, and the strip of event tiles stops moving. |
| `customCursor` | Normal mouse pointer |
| `scrollAnimations` | No scroll-linked animation; the scroll library isn't even downloaded |

Visitors can switch effects off themselves with the **sparkle button** next to Register in the header, and their choice is remembered. Anyone with "reduce motion" set on their phone or computer gets the still version automatically.


### The satellite images in the intro

The zoom from space uses eight satellite images in `assets/intro/`, from the whole Earth down to the streets around the school. They're already made, so you don't need to do anything. To make them again (for example to change the colours, the sizes, or the date of the pictures), you need Python 3.10 or newer:

```
pip install rasterio pyproj numpy pillow scipy global-land-mask
python3 tools/intro-imagery/make.py
node build.js
```

It downloads about 1 GB from Amazon's open satellite archive and takes around 10 minutes. The settings (which days, which levels, file sizes) are at the top of the script.

### The campus at the end of the zoom (the school's aerial photos)

The satellite zoom ends on the neighbourhood. Free satellite pictures can't show the school's buildings, so the intro finishes with the school's own drone photos:
1. On the way down, the camera turns to face the way the photos face.
2. It dives into the straight-down shot and pushes in slowly.
3. It ends on the angled hero shot under "Bangalore International School presents".

The photos are in `assets/intro/campus-*`. To use different ones:

```
python3 tools/intro-imagery/campus-photos.py TOP.jpg HERO-WIDE.jpg HERO-TALL.jpg 120
node build.js
```

- **`TOP`** is a straight-down shot of the campus.
- **`HERO-WIDE`** is the angled shot for laptops; **`HERO-TALL`** is the one for phones (it can be the same file).
- **`120`** is the compass direction the top of `TOP` faces (0 = north, 90 = east). For the October 2026 photos it's 120, east-south-east, worked out by lining up the treatment plant, the field and the housing around the school with the satellite image. If a new top-down photo faces another way, change this number, or the camera will turn the wrong way before the dive.

### Optional: a Google Earth Studio clip instead

The code also supports a clip rendered in **Google Earth Studio** (Google's free tool for making videos from Google Earth imagery) for the last few seconds, down to the campus. **The aerial photos above take priority:** the clip only plays if `assets/intro/campus-photos.json` isn't there.

- Earth Studio stamps the required credit ("Google Earth" and the imagery providers) onto every frame. Google requires it to stay visible, so don't crop or cover it.
- Google allows Earth Studio footage for education and non-profit use, with that credit.
- Without the clip files, the intro ends on the streets as before.

**1. Render two clips in Earth Studio** (https://earth.google.com/studio/, Chrome only, Google account needed):

| | Landscape | Portrait |
|---|---|---|
| Size | 1920 × 1080 | 1080 × 1920 |
| Length | 4 s at 30 fps (120 frames) | same |
| Camera position, both keyframes | longitude `77.6467`, latitude `13.04722` | same |
| Camera rotation, both keyframes | tilt `0` (straight down), heading `0` (north up) | same |
| Altitude, first frame | `18300` m above the ground | `32600` m |
| Altitude, last frame | `2300` m | `4000` m |

- Add `900` to each altitude if Earth Studio only offers height above sea level.
- In **Add attributes**, leave **Time of Day**, **Clouds** and **Field of View** unticked.
- When rendering, use **Texture quality: High** and **Attribution: bottom centre**. That spot is never cropped on any screen shape.

**2. Turn the frames into the site's videos.** You need ffmpeg:

```
tools/intro-imagery/campus-clip.sh path/to/landscape-frames path/to/portrait-frames 11.5
node build.js
```

The script makes `campus-landscape` and `campus-portrait` videos in `assets/intro/` (AV1 WebM plus H.264 MP4, each under 1.1 MB) and writes `assets/intro/campus.json`.

The last number is how many km the first frame shows across its longer side. The satellite zoom ends on exactly that view, so the cut into the clip is seamless. With the altitudes above it should be 11.5. If the cut looks like it jumps in or out, adjust that number and rebuild.

**How it plays:**
- The page downloads only the clip that matches the screen's shape. It starts 1.5 s into the zoom, so it doesn't slow down the first paint.
- If the clip hasn't loaded 2 s after the satellite zoom ends, or the browser won't autoplay it (iPhones in Low Power Mode), the intro carries on without it.
- With the clip, the intro takes about 19 s instead of 15. (With the photos it takes about 20 s.)

### The birds

Two V formations of birds circle the hero globe, and when the globe breaks apart on scroll, some of its points fly off as flocks. To switch them off, set `BIRDS` to `false` near the top of `birdRoles()` in `src/js/10-orb.js`, then run `node build.js`.

---

## Fonts

| Font | Used for | Licence |
|---|---|---|
| Cabinet Grotesk (500) | Headings | ITF Free Font License, from [Fontshare](https://www.fontshare.com) |
| Satoshi (variable) | Body text | ITF Free Font License, from Fontshare |
| DSEG7 Classic (Bold) | The LCD digits only | SIL Open Font License, kept in `assets/fonts/dseg/` |

The Fontshare licence lets the site use and self-host the fonts. It doesn't allow sharing the font files on their own. So:

- `npm run fonts` downloads them from Fontshare into `assets/fonts/fontshare/`.
- They're listed in `.gitignore` to keep the font files out of Git. **Never commit them.** The deploy downloads its own copy each time.
- Serving them from the website itself is fine; that's normal web use.

---

## Regenerating the artwork

The Echelon logo is drawn in code, in `src/logo.js`: the arched ECHELON around the hero globe, the tree in the header, and every logo and icon file are all made from it. The orb, the event art, the gravity well and the dot field aren't image files either. They're drawn live by the page itself.

After changing `src/logo.js` (or the date in `content.json`, which is on the link preview), run:

```bash
CHROME_PATH=/path/to/chromium npm run art
```

It writes the link-preview image (`assets/art/og-image.jpg`), the icons (`assets/favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`) and the standalone logo files in `assets/logos/`, then rebuilds the page. It needs Chromium and the Inter font installed.

The words each letter stands for (Embrace, Cultural, Harmony...) are in two places: `WORDS` in `src/logo.js` (drawn around the logo) and `about.name.words` in `content.json` (the list in the About section). Change both together.

The standalone logo files, for posters, certificates and slides:

| File | Use it on |
|---|---|
| `assets/logos/echelon-logo.svg` | dark backgrounds |
| `assets/logos/echelon-logo-light.svg` | white or light backgrounds |
| `assets/logos/echelon-emblem.svg` | anywhere the word is already written nearby |

---

## Testing

Run this once. It installs the test tools into `node_modules/` (about 180 MB, only inside this folder) and uses the Google Chrome you already have:

```
npm install
```

Then:

| Command | What it does | Report |
|---|---|---|
| `npm test` | 79 browser checks: JS off, reduced motion, a 375 px touch phone, keyboard paths, the glass cursor, the dialog, the countdown, the settings switches, axe accessibility scans, real-pixel contrast, page weight | `reports/TEST-REPORT.md`, `reports/screens/` |
| `npm run lighthouse` | Lighthouse 3× on mobile and 3× on desktop (median kept) | `reports/LIGHTHOUSE.md`, `reports/lighthouse-*.html` |

---

## Folder map

```
index.html          the page (made by build.js, don't edit by hand)
content.json        ALL the words, dates, links and settings: edit this
build.js            content.json -> index.html, plus checks and the placeholder list
src/template.js     the HTML structure the build fills in
src/js/             the scripts, one file per feature (00-core.js ... 99-start.js)
css/style.css       all styles (the build minifies them into index.html)
js/main.js          made by build.js from src/js/ (don't edit by hand)
js/vendor/          GSAP 3.15.0 + ScrollTrigger (self-hosted)
assets/fonts/       Fontshare fonts (downloaded, not committed) and DSEG7
assets/photos/      the circuit-board photo in About
assets/logos/       Echelon logo files, BIS emblem, Vidyashilp University logo
assets/art/         the generated link-preview image
assets/intro/       the satellite images for the intro zoom (made by tools/intro-imagery/make.py)
assets/CREDITS.md   where every asset came from and its licence
tools/              local server, font download, art generator, intro imagery, tests, Lighthouse runner
reports/            test, axe and Lighthouse results
references/         design reference from the first version
DECISIONS.md        every design and technical decision, with reasons
BRIEF.md            the build brief
.github/workflows/  deploy.yml manually publishes the site to GitHub Pages
```

---

## Publishing

Configure GitHub Pages for this repository before deploying. The existing websites and custom domain are unchanged.

Select **GitHub Actions** as the Pages source in repository settings, then run **Deploy to GitHub Pages** from the Actions tab. Private repository Pages availability depends on the account plan. The manual workflow in `.github/workflows/deploy.yml`:

1. Downloads the two Fontshare fonts. They aren't stored in the repo (see [Fonts](#fonts)).
2. Runs `node build.js` with the GitHub Pages address, so link previews point at the live site.
3. Publishes `index.html`, `js/`, `assets/`, and `history/`.

You can watch the deployment in the repository's **Actions** tab. The archive includes a large media collection, so uploads can take several minutes.

To change something on the live site:

1. Edit `content.json`.
2. Run `node build.js` and check the page with `npm run serve`.
3. Commit and push to `main`. The Build for cPanel workflow builds the page, and cPanel publishes the successful build automatically.

### Before telling people about it

1. Fill in the contact email. `node build.js` should print "No placeholders left."
2. Check the registration form still opens: `event.registrationUrl` in `content.json`.

### Moving to bisechelon.in later

1. In the repo, go to **Settings → Pages** and add `bisechelon.in` as a custom domain.
2. Ask whoever controls the domain to point its DNS at GitHub Pages (GitHub shows the exact records).

The deploy picks up the new address automatically.

To host it somewhere else instead, upload `index.html`, `js/`, `assets/`, and `history/` after running `npm run fonts` and `node build.js`.
