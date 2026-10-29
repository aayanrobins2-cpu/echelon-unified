# Reports

Results from 28 October 2026, after the intro moved to real satellite images. To re-run them: `npm test` and `npm run lighthouse` (see the main README).

**Where they were run.** These runs were made in a cloud container with no GPU, so every frame was drawn by the CPU. That is harsher than a normal phone or laptop. For comparison, in the same container the previous version (the dot-map intro) scored 73 on mobile and 90 on desktop. On 23 October, on a machine with a GPU, it had scored 99 and 100. The Fontshare fonts couldn't be downloaded in the container, which causes two 404 errors. Those 404s are behind best practices 96 and the one failed browser check. The GitHub Pages deploy downloads the fonts, so the live site doesn't have them.

## Lighthouse ([LIGHTHOUSE.md](LIGHTHOUSE.md))

| | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| **Mobile** (Moto G Power, slow 4G, simulated; median of 92, 93, 97) | **93** | 100 | 96 | 100 |
| **Desktop** (median of 99, 100, 100) | **100** | 100 | 96 | 100 |

Mobile metrics:

| Metric | Result |
|---|---|
| First Contentful Paint | 1.05 s |
| Largest Contentful Paint | 2.24 s (the opening globe of the intro) |
| Total Blocking Time | 252 ms |
| Cumulative Layout Shift | 0.000 |
| Speed Index | 2.56 s |
| Page weight | 1.9 MB, mostly the intro's satellite images |

The brief's target was 85 or higher on mobile, and under 3 MB.

**Remaining Lighthouse warnings:**

- *Browser errors were logged to the console*: the two missing font files (see above).
- *Minify JavaScript (8 KiB)*: `js/main.js` is left readable on purpose, so students can learn from it and change it.
- *Network dependency tree*, *LCP request discovery*: information-only items that list the request chain.

**One desktop run of an earlier attempt scored 91 for accessibility.** The tool's contrast check caught the intro caption mid-fade, when it was almost transparent over the black background. It's an artefact of timing, not a real failure: the caption is white on dark once it has faded in. The final runs scored 100.

Open `lighthouse-mobile.html` or `lighthouse-desktop.html` in a browser to see the full reports.

## Browser tests ([TEST-REPORT.md](TEST-REPORT.md))

**78 of 79 checks passed.** The one failure is "no JavaScript errors", caused by the two font files that couldn't be downloaded in the test container. They cover:

- JavaScript turned off.
- Reduced motion at 375 and 1440 px.
- A 375 px touch phone.
- Desktop keyboard and mouse, including the glass cursor (it stays on the pointer and morphs onto buttons).
- The rules dialog.
- The countdown.
- The four on/off settings.
- Console errors.

## Accessibility (axe-core 4.14)

| Scan | Violations |
|---|---|
| `axe-mobile-375.json` | 0 |
| `axe-desktop-1440.json` | 0 |
| `axe-desktop-dialog-open.json` | 0 |
| `axe-reduced-motion-375.json` | 0 |

axe can't work out a background colour when it's a glow, a gradient or a decorative layer, so it lists those as "needs review" instead of pass or fail. The test suite checks them separately from real pixels: it hides the text, screenshots what's behind it, and compares against the brightest 10% of background pixels.

| Viewport | Lowest contrast ratio | Where |
|---|---|---|
| 1440 px | 5.24:1 | "Scroll to explore" |
| 1024 px | 5.35:1 | "Time until Echelon starts" |
| 375 px, top of the page | 8.16:1 | the hero summary |
| 375 px, scrolled | 5.35:1 | "Time until Echelon starts" |

All of these are above the 4.5:1 that AA requires.

## Page weight (`weight-mobile.json`, `weight-desktop.json`)

| When | Size |
|---|---|
| At load, phone | 168 KB |
| After scrolling the whole page, phone | 185 KB |
| At load, desktop | 185 KB |

The limit in the brief is 3 MB.

## Screenshots (`screens/`)

| File | What it shows |
|---|---|
| `mobile-intro.png` | The intro, with the Skip button visible from the first frame |
| `mobile-hero.png`, `mobile-menu.png`, `mobile-how.png` | 375 px phone |
| `mobile-full.png` | The whole page on a phone |
| `desktop-hero.png`, `desktop-dialog.png` | 1440 px desktop |
| `reduced-375.png`, `reduced-1440.png` | Reduced motion |
| `nojs-375.png` | JavaScript turned off (whole page) |
