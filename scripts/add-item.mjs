// Adds one certificate or competition to data/*.json. Run by the "Add item" workflow
// (.github/workflows/add-item.yml); you can also run it by hand.
//
// Input comes from environment variables, never from the command line, so text with quotes
// or symbols is safe:
//   INPUT_TYPE      certificate | competition
//   INPUT_ID        short lowercase id, e.g. ieee-aiot   (letters, numbers, dashes)
//   INPUT_IMAGE     file name already uploaded to assets/img/, e.g. cert-ieee-aiot.jpg (.jpg or .png)
//   INPUT_TAGS      certificates only: space-separated, e.g. "ai iot" (ai iot cyber networking programming)
//   INPUT_TITLE_EN / INPUT_TITLE_TH   title in each language
//   INPUT_META_EN / INPUT_META_TH     certificate: "Issuer · Date"; competition: "Result · Date"
//   INPUT_DESC_EN / INPUT_DESC_TH     one or two sentences in each language
//
// Image size and the alt text are worked out for you. After this, run `node scripts/build.mjs`.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = (k) => (process.env[`INPUT_${k}`] ?? '').trim();
const fail = (msg) => { console.error(`Cannot add item: ${msg}`); process.exit(1); };

const type = env('TYPE');
if (!['certificate', 'competition'].includes(type)) fail('INPUT_TYPE must be "certificate" or "competition"');
const id = env('ID');
if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(id)) fail('INPUT_ID must be 2-41 characters: lowercase letters, numbers and dashes');

const file = env('IMAGE');
if (!/^[\w.-]+\.(jpe?g|png)$/i.test(file)) fail('INPUT_IMAGE must be a plain file name ending in .jpg or .png (no folders)');
const src = `assets/img/${file}`;
if (!existsSync(join(ROOT, src))) fail(`${src} does not exist. Upload the image to assets/img/ first.`);

const text = (name) => {
  const pair = { en: env(`${name}_EN`), th: env(`${name}_TH`) };
  for (const l of ['en', 'th']) {
    if (!pair[l]) fail(`INPUT_${name}_${l.toUpperCase()} is empty`);
    if (pair[l].length > 600) fail(`INPUT_${name}_${l.toUpperCase()} is too long (max 600 characters)`);
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(pair[l])) fail(`INPUT_${name}_${l.toUpperCase()} contains control characters`);
  }
  return pair;
};
const title = text('TITLE'), meta = text('META'), desc = text('DESC');

// ---- read the image size from the file header (JPEG or PNG), so you don't have to type it ----
function imageSize(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}
const size = imageSize(readFileSync(join(ROOT, src)));
if (!size || !size.width || !size.height) fail(`could not read the size of ${src}; is it a real JPEG or PNG?`);
const image = { src, width: size.width, height: size.height, fit: 'contain' };

// ---- build the entry and append it ----
const dataFile = join(ROOT, 'data', type === 'certificate' ? 'certificates.json' : 'competitions.json');
const list = JSON.parse(readFileSync(dataFile, 'utf8'));
if (list.some((x) => x.id === id)) fail(`an item with id "${id}" already exists in ${type === 'certificate' ? 'certificates' : 'competitions'}`);

let entry;
if (type === 'certificate') {
  const allowed = ['ai', 'iot', 'cyber', 'networking', 'programming'];
  const tags = env('TAGS').toLowerCase().split(/[\s,]+/).filter(Boolean);
  const bad = tags.filter((t) => !allowed.includes(t));
  if (bad.length) fail(`unknown tag(s): ${bad.join(', ')}. Allowed: ${allowed.join(', ')}`);
  entry = {
    id, tags, image,
    alt: { en: `${title.en} certificate`, th: `ใบรับรอง ${title.th}` },
    title, meta, desc,
  };
} else {
  entry = {
    id, image,
    alt: { en: `Certificate, ${title.en}`, th: `เกียรติบัตร ${title.th}` },
    when: meta, title, desc,
  };
}
list.push(entry);
writeFileSync(dataFile, JSON.stringify(list, null, 2) + '\n');
console.log(`Added ${type} "${id}" (${size.width}x${size.height}). Now run: node scripts/build.mjs`);
