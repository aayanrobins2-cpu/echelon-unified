// Lighthouse audit for the Echelon site, run against your installed Chrome.
//
//   npm run lighthouse          (3 runs per form factor, median kept)
//   LH_RUNS=1 npm run lighthouse
//
// Writes reports/lighthouse-mobile.html/.json, reports/lighthouse-desktop.html/.json
// and a short summary in reports/LIGHTHOUSE.md.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reports = path.join(root, 'reports');
fs.mkdirSync(reports, { recursive: true });
const RUNS = Number(process.env.LH_RUNS || 3);
const PORT = 8791;
const URL = `http://127.0.0.1:${PORT}/`;

const server = spawn(process.execPath, [path.join(root, 'tools', 'serve.mjs'), root, String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-first-run', '--no-default-browser-check', ...(process.env.CHROME_PATH ? ['--no-sandbox'] : [])] }); // CHROME_PATH: e.g. Chromium in a container

const ms = (v) => `${(v / 1000).toFixed(2)} s`;
const summary = [];

try {
  for (const form of ['mobile', 'desktop']) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      const result = await lighthouse(
        URL,
        { port: chrome.port, output: ['html', 'json'], logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] },
        form === 'desktop' ? desktopConfig : undefined,
      );
      runs.push(result);
      console.log(`${form} run ${i + 1}: performance ${Math.round(result.lhr.categories.performance.score * 100)}`);
    }
    runs.sort((a, b) => a.lhr.categories.performance.score - b.lhr.categories.performance.score);
    const median = runs[Math.floor(runs.length / 2)];
    const [htmlReport, jsonReport] = median.report;
    fs.writeFileSync(path.join(reports, `lighthouse-${form}.html`), htmlReport);
    fs.writeFileSync(path.join(reports, `lighthouse-${form}.json`), jsonReport);

    const lhr = median.lhr;
    const a = lhr.audits;
    const failing = Object.values(a)
      .filter((x) => x.score !== null && x.score < 0.9 && ['binary', 'numeric', 'metricSavings'].includes(x.scoreDisplayMode))
      .map((x) => `- ${x.title}${x.displayValue ? ` (${x.displayValue})` : ''}`);
    summary.push(
      `## ${form === 'mobile' ? 'Mobile (Moto G Power, slow 4G, simulated)' : 'Desktop'}`,
      '',
      `Median of ${RUNS} run${RUNS > 1 ? 's' : ''}. All runs: ${runs.map((r) => Math.round(r.lhr.categories.performance.score * 100)).join(', ')}.`,
      '',
      '| Category | Score |',
      '|---|---|',
      ...Object.values(lhr.categories).map((c) => `| ${c.title} | ${Math.round(c.score * 100)} |`),
      '',
      '| Metric | Value |',
      '|---|---|',
      `| First Contentful Paint | ${ms(a['first-contentful-paint'].numericValue)} |`,
      `| Largest Contentful Paint | ${ms(a['largest-contentful-paint'].numericValue)} |`,
      `| Total Blocking Time | ${Math.round(a['total-blocking-time'].numericValue)} ms |`,
      `| Cumulative Layout Shift | ${a['cumulative-layout-shift'].numericValue.toFixed(3)} |`,
      `| Speed Index | ${ms(a['speed-index'].numericValue)} |`,
      `| Total page weight | ${(a['total-byte-weight'].numericValue / 1024).toFixed(0)} KB |`,
      '',
      failing.length ? `Audits below 90:\n\n${failing.join('\n')}` : 'No audits below 90.',
      '',
    );
  }
} finally {
  await chrome.kill();
  server.kill();
}

const md = [
  '# Lighthouse report',
  '',
  `Run: ${new Date().toISOString()} · Lighthouse ${JSON.parse(fs.readFileSync(path.join(reports, 'lighthouse-mobile.json'), 'utf8')).lighthouseVersion} · local server (tools/serve.mjs) with gzip for text files, like a normal web host`,
  '',
  'Every run starts with a fresh browser session, so the intro plays each time (worst case).',
  '',
  ...summary,
  'Full reports: `reports/lighthouse-mobile.html` and `reports/lighthouse-desktop.html` (open in a browser).',
  '',
].join('\n');
fs.writeFileSync(path.join(reports, 'LIGHTHOUSE.md'), md);
console.log(`\n${md}`);
