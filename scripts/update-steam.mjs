// Fetches public stats for the ASCII Music Visualizer Workshop item and writes data/steam.json.
// Runs daily in GitHub Actions (see .github/workflows/update-steam-stats.yml). Needs Node 18+.
// Steam's GetPublishedFileDetails endpoint is public and needs no API key.
import { readFile, writeFile } from 'node:fs/promises';

const ITEM_ID = '3840312660';
const OUT = new URL('../data/steam.json', import.meta.url);

const body = new URLSearchParams({ itemcount: '1', 'publishedfileids[0]': ITEM_ID });
const res = await fetch('https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body
});
if (!res.ok) throw new Error(`Steam answered ${res.status}`);

const json = await res.json();
const item = json?.response?.publishedfiledetails?.[0];
if (!item || item.result !== 1) throw new Error('Steam did not return the item (is it public?)');

const next = {
  subscriptions: Number(item.subscriptions) || 0,
  favorited: Number(item.favorited) || 0,
  views: Number(item.views) || 0,
  lifetime_subscriptions: Number(item.lifetime_subscriptions) || 0
};

// Only touch the files when a number changed, so the repo doesn't get a commit every hour.
let prev = {};
try { prev = JSON.parse(await readFile(OUT, 'utf8')); } catch { /* first run */ }
const changed = Object.keys(next).some((k) => prev[k] !== next[k]);

// data/steam-history.json keeps a point for every change, so the page can show
// "+N new subscribers this week". Capped so it never grows without limit.
const HISTORY = new URL('../data/steam-history.json', import.meta.url);
const MAX_POINTS = 500;
let history = null;
try { history = JSON.parse(await readFile(HISTORY, 'utf8')); } catch { /* not created yet */ }
const point = (t, v) => ({ t, subscriptions: v.subscriptions, favorited: v.favorited, lifetime_subscriptions: v.lifetime_subscriptions });

if (!changed && history) {
  console.log('No change:', next);
} else {
  const now = new Date().toISOString();
  if (!history) {
    // First run with history: start from the previous numbers (if any) so there is a baseline.
    history = [];
    if (prev.updated && typeof prev.lifetime_subscriptions === 'number') history.push(point(prev.updated, prev));
  }
  if (changed || history.length === 0) history.push(point(now, next));
  await writeFile(HISTORY, JSON.stringify(history.slice(-MAX_POINTS), null, 2) + '\n');
  if (changed) await writeFile(OUT, JSON.stringify({ updated: now, ...next }, null, 2) + '\n');
  console.log(changed ? 'Updated:' : 'History started:', next);
}
