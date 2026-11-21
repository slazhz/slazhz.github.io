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

// Only touch the file when a number changed, so the repo doesn't get a commit every day.
let prev = {};
try { prev = JSON.parse(await readFile(OUT, 'utf8')); } catch { /* first run */ }
const changed = Object.keys(next).some((k) => prev[k] !== next[k]);
if (!changed) {
  console.log('No change:', next);
} else {
  await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString(), ...next }, null, 2) + '\n');
  console.log('Updated:', next);
}
