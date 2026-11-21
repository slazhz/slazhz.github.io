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
| `assets/js/main.js` | Steam numbers, the web demo button, the photo viewer |
| `assets/img/` | Photos, certificates, screenshots |
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

## Editing

- **Text:** edit `index.html` and `th/index.html`. Keep both in step.
- **Swap an image:** replace the file in `assets/img/` with one of the same name.
- **Colours:** change the values at the top of `assets/css/style.css`.

The web demo section loads the visualizer from
https://slazhz.github.io/ascii-music-visualizer/ (the `ascii-music-visualizer` repo), only when a visitor clicks "Start the demo".
