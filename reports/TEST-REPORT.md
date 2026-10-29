# Browser test report

Run: 2026-10-29T13:05:56.953Z · Chrome (installed) via playwright-core · `npm test`

**76 of 77 checks passed.**

## 1. JavaScript turned off (375 px)

| | Check | Detail |
|---|---|---|
| ✅ | main heading renders |  |
| ✅ | intro is not shown |  |
| ✅ | all 8 event cards render |  |
| ✅ | rules use <details> (no JS needed) |  |
| ✅ | rules open in place |  |
| ✅ | 8 FAQ questions render |  |
| ✅ | FAQ answer opens |  |
| ✅ | nav links are reachable |  |
| ✅ | countdown falls back to the date text |  |
| ✅ | "How it works" shows the still illustration |  |
| ✅ | the hero shows the still orb |  |
| ✅ | no sideways scrolling | -15px |

## 2. prefers-reduced-motion: reduce (375 px and 1440 px)

| | Check | Detail |
|---|---|---|
| ✅ | [375] effects start switched off |  |
| ✅ | [375] no intro |  |
| ✅ | [375] scroll library not even downloaded |  |
| ✅ | [375] no custom cursor |  |
| ✅ | [375] "How it works" is not pinned or scrubbed |  |
| ✅ | [375] event marquee stands still | none |
| ✅ | [375] no shimmer on the gold line | none |
| ✅ | [375] no sideways scrolling |  |
| ✅ | [375] axe: no violations with reduced motion |  |
| ✅ | [1440] effects start switched off |  |
| ✅ | [1440] no intro |  |
| ✅ | [1440] scroll library not even downloaded |  |
| ✅ | [1440] no custom cursor |  |
| ✅ | [1440] "How it works" is not pinned or scrubbed |  |
| ✅ | [1440] event marquee stands still | none |
| ✅ | [1440] no shimmer on the gold line | none |
| ✅ | [1440] no sideways scrolling |  |

## 3. Phone, touch screen, effects on (375 px)

| | Check | Detail |
|---|---|---|
| ✅ | intro shows with a Skip button from the first frame | skip visible at 303 ms |
| ✅ | Skip removes the intro |  |
| ✅ | the intro plays again on every refresh |  |
| ✅ | Skip works again after a refresh |  |
| ✅ | no custom cursor on touch screens |  |
| ✅ | no sideways scrolling | 0px |
| ✅ | page weight at load under 3 MB | 1260 KB in 15 files |
| ✅ | "How it works" is pinned for scrubbing |  |
| ✅ | text over the hero art meets WCAG AA (375 px, scrolled 0px) | 4 text blocks, lowest 8.16:1 (p.hero__summary "The interschool tech fest fo") |
| ✅ | text over the hero art meets WCAG AA (375 px, scrolled 520px) | 16 text blocks, lowest 5.32:1 (p.lcd__label "Time until Echelon starts") |
| ✅ | menu opens |  |
| ✅ | tapping a menu link closes the menu |  |
| ✅ | a frame is drawn while scrolling the pinned section |  |
| ✅ | page weight after scrolling everything | 1294 KB in 19 files |
| ✅ | axe: no violations (375 px) |  |

## 4. Desktop with mouse and keyboard (1440 px)

| | Check | Detail |
|---|---|---|
| ✅ | intro finishes by itself in about 20 s | 20822 ms after navigation |
| ✅ | intro progress reached 100% | 100% |
| ✅ | glass cursor appears with a mouse |  |
| ✅ | the lens stays on the pointer while moving fast | largest gap 0.0 px over 16 frames |
| ✅ | the lens flows into the shape of a button | lens 199px wide over a 187px button |
| ✅ | native cursor comes back when the pointer leaves |  |
| ✅ | first Tab lands on "Skip to content" | Skip to content |
| ✅ | focus is visible | solid |
| ✅ | skip link moves focus to the main content |  |
| ✅ | every link and button shows a focus outline | 31 checked |
| ✅ | Enter on "View rules" opens the rules dialog | Escape Room – Code Breakers |
| ✅ | focus moves to the dialog title |  |
| ✅ | Tab stays inside the open dialog |  |
| ✅ | axe: no violations with the dialog open |  |
| ✅ | Esc closes the dialog |  |
| ✅ | focus returns to the button that opened it |  |
| ✅ | FAQ opens with the keyboard |  |
| ✅ | no Effects switch, and effects are on | {"button":false,"fxOff":false} |
| ✅ | "Every letter stands for something" lists a word for each letter of ECHELON | Embrace, Cultural, Harmony, Equality, Languages, Openness, Nuances |
| ✅ | desktop page weight at load under 3 MB | 2376 KB in 21 files |
| ✅ | text over the hero art meets WCAG AA (1440 px) | 21 text blocks, lowest 5.24:1 (a.scroll-hint "Scroll to explore") |
| ✅ | text over the hero art meets WCAG AA (1024 px) | 18 text blocks, lowest 5.32:1 (p.lcd__label "Time until Echelon starts") |
| ✅ | axe: no violations (1440 px) |  |

## 5. Countdown

| | Check | Detail |
|---|---|---|
| ✅ | counts down to a set date | 03:04:59:59 |
| ✅ | ticks every second | 03:04:59:59 -> 03:04:59:58 |
| ✅ | shows the "happening now" message once the date has passed |  |
| ✅ | counts down to the date in content.json | 22:13:39:11 · Echelon starts on Saturday, 21 November 2026 at 8:15 am. |

## 6. Settings switches (content.json "settings")

| | Check | Detail |
|---|---|---|
| ✅ | "intro": false → no intro on a first visit |  |
| ✅ | "effects": false → everything off | {"off":true,"gsap":false,"cursor":false} |
| ✅ | an old saved "effects off" choice is ignored and cleared | {"off":false,"stored":null} |
| ✅ | "scrollAnimations": false → no scroll moments, other effects stay | {"gsap":false,"pinned":false,"cursor":true} |
| ✅ | "customCursor": false → normal cursor | {"cursor":false,"hidden":false} |

## 7. Console

| | Check | Detail |
|---|---|---|
| ❌ | no JavaScript errors in any run | reduced-375: Failed to load resource: the server responded with a status of 404 (Not Found) \| reduced-375: Failed to load resource: the server responded with a status of 404 (Not Found) \| reduced-1440: Failed to load resource: the server responded with a status of 404 (Not Found) \| reduced-1440: Failed to load resource: the server responded with a status of 404 (Not Found) \| mobile: Failed to load resource: the server responded with a status of 404 (Not Found) |

Screenshots are in `reports/screens/`. Full axe results are in `reports/axe-*.json`.
