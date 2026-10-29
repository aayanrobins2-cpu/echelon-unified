# Combined Echelon website

The root website comes from [Nihal-Sulagodu/echelon-site](https://github.com/Nihal-Sulagodu/echelon-site). Its History button opens `history/`, which contains the website and media from [AayanKumar123/echelon3](https://github.com/AayanKumar123/echelon3).

The history editions are labelled Echelon 1.0 (2022), Echelon 2.0 (2023), and Echelon 3.0 (January 2026). Existing filenames and actual dates are retained so media and older links keep working. Original credits remain in the pages.

Run `node build.js` after changing the root `content.json` or templates. Run `node tools/serve.mjs . 8080` to preview both sites. The root README describes the site's other build and authoring tools.

The GitHub Pages workflow publishes the root page, `js/`, `assets/`, and `history/`. Select **GitHub Actions** as the Pages source in the repository settings before running the deployment workflow. Creating this repository does not change bisechelon.in or either original repository.

## cPanel hosting

The cPanel deployment targets `/home/t6di8s6yfvlr/public_html`, the configured document root of bisechelon.in. Clone this repository into `repositories/echelon-unified` outside `public_html`, using a read-only GitHub deploy key for this repository. Never put GitHub tokens in the clone URL.

In cPanel Git Version Control, manage the repository, select **Pull or Deploy**, update from the remote, and deploy HEAD. `.cpanel.yml` runs `tools/deploy-cpanel.sh`. The committed `index.html` is already built, so Node.js is not required on the hosting server. The script downloads fonts from Fontshare, backs up the previous public folder under `/home/t6di8s6yfvlr/deploy-backups/`, copies the static assets and archive, then replaces the homepage last. Existing files and URLs are retained. Backups stay outside the public folder.

Rebuild and commit the generated root HTML/JavaScript locally after editing content or templates. Use cPanel to update and redeploy subsequent commits. Check both the homepage and `/history/` after each deployment.

## Automatic updates

Push changes to `main`. The **Build for cPanel** GitHub Actions workflow downloads the build fonts, runs `node build.js`, and commits the generated HTML/JavaScript with a `.cpanel-ready` marker. A failed build does not produce a ready commit, so the existing live site stays in place.

A cPanel cron job runs `tools/auto-deploy-cpanel.sh` every minute. It fetches `main` through the existing read-only SSH deploy key, accepts only a commit with a readiness marker matching its parent, fast-forwards the checkout, and publishes changed website files. Overlapping jobs are locked. Successful deployment is recorded in `https://bisechelon.in/deployment.json`; server logs are in `/home/t6di8s6yfvlr/echelon-auto-deploy.log`.

After the first deployment establishes its state, only files changed since the last successful deployment are compared and copied. Replaced files are backed up under `deploy-backups/`; unchanged media is not copied or backed up again. Existing unrelated files and old asset URLs are retained. The earlier full-site backup is retained.

This is polling, so allow the build time plus up to one minute for detection, followed by file-copy time. Large media uploads take longer. Automatic publication runs directly on the server; the cPanel Git page's Last Deployment entry continues to refer to the most recent deployment launched through that interface.

The installed Cron Jobs entry uses `*` in all five schedule fields and this command:

```sh
/bin/bash /home/t6di8s6yfvlr/repositories/echelon-unified/tools/auto-deploy-cpanel.sh >> /home/t6di8s6yfvlr/echelon-auto-deploy.log 2>&1
```

The command logs to the hosting account rather than sending an email each minute. An idle check does not copy files or create a backup. To pause automatic publication, disable this specific entry in cPanel Cron Jobs; GitHub builds can remain enabled.
