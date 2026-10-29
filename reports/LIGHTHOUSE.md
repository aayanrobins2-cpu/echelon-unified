# Lighthouse report

Run: 2026-10-29T07:08:36.438Z · Lighthouse 13.5.0 · local server (tools/serve.mjs) with gzip for text files, like a normal web host

Every run starts with a fresh browser session, so the intro plays each time (worst case).

## Mobile (Moto G Power, slow 4G, simulated)

Median of 3 runs. All runs: 89, 96, 97.

| Category | Score |
|---|---|
| Performance | 96 |
| Accessibility | 100 |
| Best Practices | 96 |
| SEO | 100 |

| Metric | Value |
|---|---|
| First Contentful Paint | 1.05 s |
| Largest Contentful Paint | 2.33 s |
| Total Blocking Time | 167 ms |
| Cumulative Layout Shift | 0.000 |
| Speed Index | 2.36 s |
| Total page weight | 2428 KB |

Audits below 90:

- Max Potential First Input Delay (150 ms)
- Browser errors were logged to the console
- Minimize main-thread work (3.3 s)
- Minify JavaScript (Est savings of 9 KiB)
- Forced reflow
- LCP request discovery
- Network dependency tree

## Desktop

Median of 3 runs. All runs: 100, 100, 100.

| Category | Score |
|---|---|
| Performance | 100 |
| Accessibility | 100 |
| Best Practices | 96 |
| SEO | 100 |

| Metric | Value |
|---|---|
| First Contentful Paint | 0.28 s |
| Largest Contentful Paint | 0.57 s |
| Total Blocking Time | 32 ms |
| Cumulative Layout Shift | 0.000 |
| Speed Index | 0.96 s |
| Total page weight | 1280 KB |

Audits below 90:

- Browser errors were logged to the console
- Minify JavaScript (Est savings of 9 KiB)
- Improve image delivery (Est savings of 8 KiB)
- LCP request discovery
- Network dependency tree

Full reports: `reports/lighthouse-mobile.html` and `reports/lighthouse-desktop.html` (open in a browser).
