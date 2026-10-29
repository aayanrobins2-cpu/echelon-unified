# ECHELON — Website Build Brief (v2, refined 2026-10-23)

> **Update, 23 October 2026: the visual direction below has been replaced.** After the first build, Nihal asked for a full redesign. The cyberpunk / *Edgerunners* look, the neon palette and the techno fonts are out. In their place: the look of sentient-os.ai, realistic graphics, an Apple-style liquid-glass cursor, a longer intro, and content from the Echelon 3.0 site. Everything else in this brief still applies: the scope, the "ask first" list, accessibility, performance and the build approach. The new direction is recorded in `DECISIONS.md`.

## Mission
Build a single-page event website for **Echelon**, an interschool tech fest hosted by Bangalore International School (BIS) in collaboration with Vidyashilp University. The audience is students in Grades 8–12 and their teachers. The site is static with no backend, and will eventually live at bisechelon.in. It should feel unmistakably cinematic and cyberpunk, and still load fast, run on cheap phones, and be accessible to everyone.

**Deliverable: a website only.** No brochure, PDF, poster, or print design.

## Autonomy and scope
Research, experiment, and make decisions without asking, within the limits below.

Do freely:
- Research design references, palettes, fonts, animation techniques, and libraries, and pick what fits the constraints best.
- Use clearly licensed assets: Google Fonts, Unsplash, Pexels, Pixabay, Font Awesome Free, or CC0/CC-BY. Record the source, author, and license of each one in `/assets/CREDITS.md`.
- Build, refactor, and test anything inside the project folder.
- Run Lighthouse, axe, and Playwright browser tests, and fix what fails.
- Log every non-trivial decision in `/DECISIONS.md`, with the reasoning and the alternatives you rejected.
- When something is ambiguous, pick the most reasonable default and log it. Don't stop to ask.

Ask first:
- Before deploying or pushing anywhere, including bisechelon.in, GitHub Pages, or any other host.
- Before building any form or anything that collects, stores, or sends personal data. Registration is an external link only.
- Before using copyrighted material from any show, game, or brand. Edgerunners and Cyberpunk 2077 are mood references only: no stills, logos, character art, music, or footage.
- Before changing anything outside the project folder, or spending money or signing up for services.

## References
- **Mood and colour: *Cyberpunk: Edgerunners* (Studio Trigger, 2022).** Use it for colour relationships, hard neon-on-black contrast, chromatic-aberration glitches, speed lines, and bold diagonal composition. Describe the sampled hex values and why you chose them in DECISIONS.md. Do not copy frames or artwork.
- **Brand source: the Echelon 3.0 brochure PDF** (the January 2026 edition). Use it only for brand cues:
  - royal blue (≈ #0049AD) with cyan line accents
  - circuit-line corner brackets (thin cyan traces with node dots)
  - chevron arrows built from dot grids
  - a squared, wide techno display face for headings (find the closest free Google Font match, e.g. Orbitron, Michroma, or Audiowide, and log the choice)
  - **Do not reuse** its dates, times, rules, theme ("Sawubona"), events, or registration details. All of those are out of date.

## Palette
Near-black base, with the brochure blue kept so the site still reads as Echelon. Start from these values and adjust after sampling Edgerunners, logging any change:

| Token | Value | Use |
|---|---|---|
| `--bg` | #07070C | page background |
| `--panel` | brochure blue, darkened | cards, panels, section bands |
| `--ink` | #E8ECF4 | all body text |
| `--cyan` | #00F0FF | primary accent, circuit lines, focus rings |
| `--yellow` | #FCEE0A | Register buttons and key highlights only |
| `--magenta` | #FF2A6D | glitch slices and rare accents |

Neon colours are for accents only, never body text. All text must pass WCAG AA contrast.

## Non-negotiable constraints
- Lighthouse performance ≥ 85 on mobile (mid-range Android on school Wi-Fi).
- Every effect degrades gracefully. `prefers-reduced-motion` disables scroll-scrubbing, glitches, scanlines, grain, and the intro.
- With JavaScript disabled, all content still renders and only the effects are lost.
- Full keyboard navigation and visible focus states everywhere.
- Nothing flashes more than 3 times per second.
- Total page weight under 3 MB before lazy loading. Images in WebP/AVIF. Any video in MP4/WebM, under 2 MB each.

## Loading intro (≤ 3 s)
- Glitch-in ECHELON logo reveal, speed lines, and a boot-up text readout.
- Driven by real asset-load progress, not a fake timer.
- "Skip" button visible from the first frame. Plays once per session (sessionStorage). Never shown to reduced-motion users or when JS is off.

## Cursor
A small dot plus a trailing ring that grows over interactive elements. Off on touch and coarse pointers. The native cursor returns when the pointer leaves the window.

## Scroll experience
- GSAP + ScrollTrigger. Add Lenis only if it's clearly needed, and never hijack keyboard or assistive-tech scrolling.
- Exactly 2–3 signature scroll moments: (1) the hero logo, (2) a pinned "how it works" sequence, (3) the event timeline. Everything else stays still or uses a simple fade.
- Frame sequences are **original frames rendered in code** (canvas/SVG exported to compressed WebP), using circuit traces, dot chevrons, and speed lines. No video files, and no copied art.

## Sections (all text and images load from `content.json`)
1. **Hero**: logo, tagline `[PLACEHOLDER]`, live countdown to a configurable date `[PLACEHOLDER]`, and a yellow Register button.
2. **About**: a short interschool mission statement `[PLACEHOLDER copy]`.
3. **Events**: **6 generic cards, "Event 1" to "Event 6"**. Each card shows name, grade level, team size, duration, and prior knowledge (all `[PLACEHOLDER]`), and opens an accessible detail view (focus-trapped dialog, closes on Esc) for full rules. Easy to add or remove cards from content.json.
4. **Timeline**: key moments with placeholder times.
5. **Partners**: BIS and Vidyashilp University logos, **approved for use**. Extract them cleanly from the brochure and save as SVG/WebP in `/assets/logos`.
6. **FAQ**: an accordion using `<details>`/`<summary>` so it works without JS.
7. **Registration**: a CTA linking to `[PLACEHOLDER URL]`. No forms.
8. **Footer**: contact `[PLACEHOLDER name + email]`, with the copyright year set by JS (static fallback in the HTML).

## Deliverables
- `/index.html`, `/css`, `/js`, `/assets`, `/content.json`, `/assets/CREDITS.md`, `/DECISIONS.md`, `/README.md`
- README: every placeholder and where it lives, how to change the event date, and how to switch off the intro and effects (one config flag each).
- Lighthouse (mobile) and axe reports saved in `/reports`, with scores and any remaining failures.
- Playwright smoke test at 375px width and at desktop width, with reduced motion on, and with JS disabled. Hard-refresh between runs.
- Never invent dates, prices, rules, names, or sponsors. Anything unknown is marked `[PLACEHOLDER]`.
