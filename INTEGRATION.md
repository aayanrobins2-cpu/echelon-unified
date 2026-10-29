# Combined Echelon website

The root website comes from [Nihal-Sulagodu/echelon-site](https://github.com/Nihal-Sulagodu/echelon-site). Its History button opens `history/`, which contains the website and media from [AayanKumar123/echelon3](https://github.com/AayanKumar123/echelon3).

The history editions are labelled Echelon 1.0 (2022), Echelon 2.0 (2023), and Echelon 3.0 (January 2026). Existing filenames and actual dates are retained so media and older links keep working. Original credits remain in the pages.

Run `node build.js` after changing the root `content.json` or templates. Run `node tools/serve.mjs . 8080` to preview both sites. The root README describes the site's other build and authoring tools.

The GitHub Pages workflow publishes the root page, `js/`, `assets/`, and `history/`. Select **GitHub Actions** as the Pages source in the repository settings before running the deployment workflow. Creating this repository does not change bisechelon.in or either original repository.
