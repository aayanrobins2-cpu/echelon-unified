// Downloads the two Fontshare fonts the site uses, straight from Fontshare.
//
//   npm run fonts      (or: node tools/fetch-fonts.mjs)
//
// Satoshi and Cabinet Grotesk are free under the ITF Free Font License, which
// allows self-hosting them on your own website but not redistributing the
// files (for example in a public Git repository). So the files are not meant
// to be committed: anyone setting up this project runs this script and gets
// their own official copy from Fontshare. The files are saved unmodified.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'assets', 'fonts', 'fontshare');
fs.mkdirSync(out, { recursive: true });

// satoshi@1 = the variable font (weights 300-900); cabinet-grotesk@500 = Medium.
// Asked for one at a time: the API leaves one out if both are in a single request.
const wanted = [
  { family: 'Satoshi', query: 'satoshi@1', file: 'satoshi-variable.woff2' },
  { family: 'Cabinet Grotesk', query: 'cabinet-grotesk@500', file: 'cabinet-grotesk-500.woff2' },
];
for (const { family, query, file } of wanted) {
  const api = `https://api.fontshare.com/v2/css?f[]=${query}&display=swap`;
  const css = await (await fetch(api, { headers: { 'user-agent': 'Mozilla/5.0' } })).text();
  const block = css.split('@font-face').find((b) => b.includes(`'${family}'`));
  const url = block && block.match(/url\('([^']+\.woff2)'\)/)?.[1];
  if (!url) throw new Error(`Could not find the ${family} woff2 file in the Fontshare response.`);
  const res = await fetch(url.startsWith('//') ? `https:${url}` : url);
  if (!res.ok) throw new Error(`Download failed for ${family}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path.join(out, file), buf);
  console.log(`✓ ${file}  ${(buf.length / 1024).toFixed(1)} KB`);
}
console.log('\nSaved in assets/fonts/fontshare/. Licence: ITF Free Font License (https://www.fontshare.com/licenses/itf-ffl).');
