# slazhz.github.io

Personal portfolio of Chayapol Kraisee, in English (`/`) and Thai (`/th/`).
Plain HTML, CSS and a little JavaScript: no build step, no dependencies.

Live at **https://slazhz.github.io**

## Files

| Path | What it is |
|---|---|
| `index.html` | English page |
| `th/index.html` | Thai page |
| `404.html` | "Page not found" page |
| `assets/css/style.css` | All styles. Colours are at the top (`:root`) |
| `assets/js/main.js` | Steam numbers, web demo button, photo/certificate viewer, certificate filters, nav highlight, scroll reveal, language switch |
| `assets/img/` | Photos, certificates, screenshots |
| `data/certificates.json`, `competitions.json`, `projects.json` | The content of those three sections, in English and Thai |
| `scripts/build.mjs` | Turns the `data/*.json` files into the HTML on both pages |
| `scripts/add-item.mjs` | Adds a certificate or competition to the data (used by the "Add item" form) |
| `.github/workflows/add-item.yml` | The "Add item" form (Actions tab). Only you can run it |
| `data/steam.json` | Steam Workshop numbers, refreshed daily |
| `scripts/update-steam.mjs` | Fetches the Steam numbers (run by GitHub Actions) |
| `setup/update-steam-stats.yml` | The daily workflow. Move it into place (see below) |

## Publish it (first time)

1. **Create the repo.** In GitHub Desktop: *File → Add local repository →* choose this folder → *create a repository* → *Publish repository*. Name it exactly `slazhz.github.io` and untick "Keep this code private".
2. **Check Pages is on.** On github.com: repo → *Settings → Pages* → Source: *Deploy from a branch*, Branch: `main`, folder `/ (root)` → *Save*.
3. After a minute or two the site is at https://slazhz.github.io.

## Turn on the daily Steam numbers

1. Make a folder `.github`, inside it a folder `workflows`, and move `setup/update-steam-stats.yml` into it, so the path is `.github/workflows/update-steam-stats.yml`.
2. Commit and push.
3. On github.com: *Actions → Update Steam stats → Run workflow* to fill the numbers straight away. After that it runs every morning on its own.

Until it has run once, the page shows "Live" and "—" in place of the numbers.

## Add a certificate or competition (from your phone or computer)

Only people with write access to the repo can do this, so it is just you.

1. **Upload the image.** On github.com open `assets/img/` → *Add file → Upload files* → drop a `.jpg` or `.png` → *Commit changes*.
2. **Open the form.** *Actions → Add item → Run workflow.*
3. **Fill it in.** Type (certificate or competition), a short id like `ieee-aiot`, the image file name, tags (certificates only: `ai iot cyber networking programming`), and the title, the "Issuer · Date" line and a short description, each in English and Thai.
4. **Run it.** After a minute the item is on both pages (`/` and `/th/`). The image size and alt text are worked out for you. If something is wrong (a missing image, an unknown tag, an empty Thai field) the run fails with a message and nothing is published.

To change or remove an item, or to edit a project, edit the matching file in `data/`, run `node scripts/build.mjs` on your computer, and commit both the JSON and the two HTML pages. Never edit the HTML between the `BEGIN:` and `END:` comments in the pages: the next build overwrites it.

`node scripts/build.mjs --check` tells you whether the pages are out of date with the data.

## Editing

- **Certificates, competitions, projects:** edit `data/*.json` (see above). **Other text:** edit `index.html` and `th/index.html` and keep both in step.
- **Swap an image:** replace the file in `assets/img/` with one of the same name.
- **Colours:** change the values at the top of `assets/css/style.css`.

The web demo section loads the visualizer from
https://slazhz.github.io/ascii-music-visualizer/ (the `ascii-music-visualizer` repo), only when a visitor clicks "Start the demo".
