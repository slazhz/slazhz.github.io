// Rebuilds the generated parts of index.html and th/index.html from data/*.json.
//
//   node scripts/build.mjs          rewrite the pages
//   node scripts/build.mjs --check  exit 1 if the pages are out of date (nothing is written)
//
// The generated regions sit between <!-- BEGIN:name ... --> and <!-- END:name --> markers.
// Edit data/*.json (or use the "Add item" workflow), never the HTML between the markers.
// Plain Node, no dependencies. Text in the JSON is plain text; this script escapes it.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['en', 'th'];
const PAGES = [
  { lang: 'en', file: 'index.html', prefix: '' },
  { lang: 'th', file: 'th/index.html', prefix: '../' },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');
const load = (name) => JSON.parse(readFileSync(join(ROOT, 'data', `${name}.json`), 'utf8'));

// ---- validation: fail early with a clear message instead of publishing a broken page ----
const problems = [];
const need = (cond, msg) => { if (!cond) problems.push(msg); };
const text = (v, where) => {
  for (const l of LANGS) need(v && typeof v[l] === 'string' && v[l].trim() !== '', `${where}: missing "${l}" text`);
};
const image = (img, where) => {
  need(img && typeof img.src === 'string', `${where}: missing image src`);
  if (!img || typeof img.src !== 'string') return;
  need(/^assets\/img\/[\w./-]+$/.test(img.src), `${where}: image must be under assets/img/ (got "${img.src}")`);
  need(existsSync(join(ROOT, img.src)), `${where}: image file not found: ${img.src}`);
  need(Number.isInteger(img.width) && Number.isInteger(img.height), `${where}: image needs integer width and height`);
};
const unique = (list, name) => {
  const seen = new Set();
  for (const it of list) { need(it.id && !seen.has(it.id), `${name}: duplicate or missing id "${it.id}"`); seen.add(it.id); }
};

const certificates = load('certificates');
const competitions = load('competitions');
const projects = load('projects');
unique(certificates, 'certificates'); unique(competitions, 'competitions'); unique(projects, 'projects');
for (const c of certificates) {
  const w = `certificate "${c.id}"`;
  image(c.image, w); need(['contain', 'cover'].includes(c.image?.fit), `${w}: image.fit must be contain or cover`);
  need(Array.isArray(c.tags), `${w}: tags must be a list`);
  ['alt', 'title', 'meta', 'desc'].forEach((k) => text(c[k], `${w} ${k}`));
  if (c.link) {   // optional verification link, e.g. the issuer's certificate page
    need(typeof c.link.url === 'string' && /^https:\/\/[^\s"<>]+$/.test(c.link.url), `${w}: link.url must be an https:// address`);
    text(c.link.label, `${w} link label`);
  }
}
for (const c of competitions) {
  const w = `competition "${c.id}"`;
  image(c.image, w); need(['contain', 'cover'].includes(c.image?.fit), `${w}: image.fit must be contain or cover`);
  ['alt', 'when', 'title', 'desc'].forEach((k) => text(c[k], `${w} ${k}`));
  if (c.link) {   // optional evidence link, e.g. the organizer's results page
    need(typeof c.link.url === 'string' && /^https:\/\/[^\s"<>]+$/.test(c.link.url), `${w}: link.url must be an https:// address`);
    text(c.link.label, `${w} link label`);
  }
}
for (const p of projects) {
  const w = `project "${p.id}"`;
  need(Array.isArray(p.media) && p.media.length > 0, `${w}: needs at least one media image`);
  (p.media || []).forEach((m, i) => { image(m, `${w} media[${i}]`); text(m.alt, `${w} media[${i}] alt`); });
  (p.tags || []).forEach((t, i) => text(t.text, `${w} tag[${i}]`));
  text(p.title, `${w} title`); text(p.desc, `${w} desc`);
  (p.facts || []).forEach((f, i) => { text(f.label, `${w} fact[${i}] label`); text(f.value, `${w} fact[${i}] value`); });
}
if (problems.length) {
  console.error('data/*.json has problems:\n - ' + problems.join('\n - '));
  process.exit(1);
}

// ---- templates (indentation matches the hand-written pages) ----
const pad = (n, s) => s.split('\n').map((l) => (l ? ' '.repeat(n) + l : l)).join('\n');

const certificateHtml = (c, lang, pre) => `<div class="training" data-tags="${attr(c.tags.join(' '))}">
  <img class="${c.image.fit}" src="${pre}${attr(c.image.src)}" width="${c.image.width}" height="${c.image.height}" loading="lazy" decoding="async" alt="${attr(c.alt[lang])}">
  <strong>${esc(c.title[lang])}</strong>
  <span class="mono">${esc(c.meta[lang])}</span>
  <span>${esc(c.desc[lang])}</span>${c.link ? `\n  <a class="award-link" href="${attr(c.link.url)}" rel="noopener noreferrer">${esc(c.link.label[lang])}</a>` : ''}
</div>`;

const competitionHtml = (c, lang, pre) => `<div class="card award">
  <img class="${c.image.fit}" src="${pre}${attr(c.image.src)}" width="${c.image.width}" height="${c.image.height}" loading="lazy" decoding="async" alt="${attr(c.alt[lang])}"${c.image.style ? ` style="${attr(c.image.style)}"` : ''}>
  <span class="award-when">${esc(c.when[lang])}</span>
  <h3>${esc(c.title[lang])}</h3>
  <p>${esc(c.desc[lang])}</p>${c.link ? `\n  <a class="award-link" href="${attr(c.link.url)}" rel="noopener noreferrer">${esc(c.link.label[lang])}</a>` : ''}
</div>`;

const mediaImg = (m, lang, pre) =>
  `<img src="${pre}${attr(m.src)}" width="${m.width}" height="${m.height}"${m.lazy ? ' loading="lazy" decoding="async"' : ''} alt="${attr(m.alt[lang])}"${m.style ? ` style="${attr(m.style)}"` : ''}>`;

const projectHtml = (p, lang, pre) => {
  const [main, ...rest] = p.media;
  const pair = rest.length
    ? `\n    <div class="pair">\n${rest.map((m) => '      ' + mediaImg(m, lang, pre)).join('\n')}\n    </div>`
    : '';
  const tags = (p.tags || []).map((t) => `<span class="tag${t.award ? ' tag--award' : ''}">${esc(t.text[lang])}</span>`).join('');
  const facts = (p.facts || []).map((f) => `      <dt>${esc(f.label[lang])}</dt><dd>${esc(f.value[lang])}</dd>`).join('\n');
  const stats = p.stats?.length
    ? `\n    <div class="mini-stats">\n${p.stats.map((s) => `      <div><div class="stat-n" data-steam="${attr(s.steam)}">—</div><div class="stat-l">${esc(s.label[lang])}</div></div>`).join('\n')}\n    </div>\n    <p class="steam-meta" data-steam-meta></p>`
    : '';
  const actions = p.actions?.length
    ? `\n    <div class="actions">\n${p.actions.map((a) => `      <a class="btn ${a.primary ? 'btn-primary' : 'btn-ghost'}" href="${attr(a.href)}">${esc(a.label[lang])}</a>`).join('\n')}\n    </div>`
    : '';
  const article = `<article class="card project" aria-labelledby="${attr(p.id)}">
  <div class="project-media${p.dark ? ' project-media--dark' : ''}">
    ${mediaImg(main, lang, pre)}${pair}
  </div>
  <div class="project-body">
    <div class="tags">${tags}</div>
    <h3 id="${attr(p.id)}" class="project-title">${esc(p.title[lang])}</h3>
    <p>${esc(p.desc[lang])}</p>
    <dl class="facts">
${facts}
    </dl>${stats}${actions}
  </div>
</article>`;
  if (!p.demo) return article;
  const d = p.demo;
  return `${article}

<div id="web-demo" class="card demo">
  <div class="demo-bar">
    <span class="demo-title"><span class="demo-dots" aria-hidden="true"><i></i><i></i><i></i></span>${esc(d.title[lang])}</span>
    <a href="${attr(d.fullUrl)}">${esc(d.openLabel[lang])}</a>
  </div>
  <div class="demo-stage" data-src="${attr(d.src)}" data-title="${attr(d.stageTitle[lang])}">
    <div class="demo-start">
      <button type="button" class="btn btn-primary" data-demo-start>${esc(d.startLabel[lang])}</button>
      <p>${esc(d.note[lang])}</p>
    </div>
  </div>
</div>`;
};

const REGIONS = [
  { name: 'certificates', indent: 8, render: (lang, pre) => certificates.map((c) => certificateHtml(c, lang, pre)).join('\n') },
  { name: 'competitions', indent: 6, render: (lang, pre) => competitions.map((c) => competitionHtml(c, lang, pre)).join('\n') },
  { name: 'projects', indent: 4, render: (lang, pre) => projects.map((p) => projectHtml(p, lang, pre)).join('\n\n') },
];

// ---- rewrite the pages ----
const check = process.argv.includes('--check');
let stale = false;
for (const page of PAGES) {
  const path = join(ROOT, page.file);
  const raw = readFileSync(path, 'utf8');
  const crlf = raw.includes('\r\n');
  let html = raw.replace(/\r\n/g, '\n');
  for (const r of REGIONS) {
    const re = new RegExp(`^([ \\t]*)<!-- BEGIN:${r.name}\\b[^\\n]*-->\\n(?:[\\s\\S]*?\\n)?[ \\t]*<!-- END:${r.name} -->`, 'm');
    if (!re.test(html)) { console.error(`${page.file}: markers for "${r.name}" not found`); process.exit(1); }
    const pre = ' '.repeat(r.indent);
    const body = pad(r.indent, r.render(page.lang, page.prefix));
    html = html.replace(re, () =>
      `${pre}<!-- BEGIN:${r.name} (generated from data/${r.name}.json; edit that file, not this) -->\n${body}\n${pre}<!-- END:${r.name} -->`);
  }
  const out = crlf ? html.replace(/\n/g, '\r\n') : html;
  if (out !== raw) {
    stale = true;
    if (!check) writeFileSync(path, out);
    console.log(`${check ? 'out of date' : 'updated'}: ${page.file}`);
  }
}
if (!stale) console.log('pages are up to date');
if (check && stale) process.exit(1);
