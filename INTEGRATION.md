# Combined Echelon website

The root website comes from [Nihal-Sulagodu/echelon-site](https://github.com/Nihal-Sulagodu/echelon-site). Its History button opens `history/`, which contains the website and media from [AayanKumar123/echelon3](https://github.com/AayanKumar123/echelon3).

The history editions are labelled Echelon 1.0 (2022), Echelon 2.0 (2023), and Echelon 3.0 (January 2026). Existing filenames and actual dates are retained so media and older links keep working. Original credits remain in the pages.

Run `node build.js` after changing the root `content.json` or templates. Run `node tools/serve.mjs . 8080` to preview both sites. The root README describes the site's other build and authoring tools.

The GitHub Pages workflow publishes the root page, `js/`, `assets/`, and `history/`. Select **GitHub Actions** as the Pages source in the repository settings before running the deployment workflow. Creating this repository does not change bisechelon.in or either original repository.

## cPanel hosting

The cPanel deployment targets `/home/t6di8s6yfvlr/public_html`, the configured document root of bisechelon.in. Clone this repository into `repositories/echelon-unified` outside `public_html`, using a read-only GitHub deploy key for this repository. Never put GitHub tokens in the clone URL.

In cPanel Git Version Control, manage the repository, select **Pull or Deploy**, update from the remote, and deploy HEAD. `.cpanel.yml` runs `tools/deploy-cpanel.sh`. The committed `index.html` is already built, so Node.js is not required on the hosting server. The script downloads fonts from Fontshare, backs up the previous public folder under `/home/t6di8s6yfvlr/deploy-backups/`, copies the static assets and archive, then replaces the homepage last. Existing files and URLs are retained. Backups stay outside the public folder.

Rebuild and commit the generated root HTML/JavaScript locally after editing content or templates. Use cPanel to update and redeploy subsequent commits. Check both the homepage and `/history/` after each deployment.
