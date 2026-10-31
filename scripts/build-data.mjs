// Turns the raw Wîkîferheng export (fetch-nouns.mjs) into src/data/nouns.json and manifest.json.
//   node scripts/build-data.mjs ner-u-me-wiki.json
//
// Row format read by the app (src/lib/nouns.ts):
//   [word, gender, definitions, examples, id?]   (Kurmanji only, no translations)
// gender "m" = mê, "n" = nêr, "mn" = both; example [sentence with **marks**, 1 if quotation]
// id is only written for a second entry of the same word ("dê~2").
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const input = process.argv[2] || join(root, 'ner-u-me-wiki.json');
const { entries } = JSON.parse(readFileSync(input, 'utf8'));

const GENDER = { m: 'm', 'mê': 'm', f: 'm', n: 'n', 'nêr': 'n', mn: 'mn', nm: 'mn', 'm/n': 'mn', 'n/m': 'mn', 'm-n': 'mn', 'mê û nêr': 'mn' };
const ORDER = 'abcçdeêfghiîjklmnopqrsştuûvwxyz';
const rank = ch => { const i = ORDER.indexOf(ch); return i === -1 ? 100 + ch.charCodeAt(0) : i; };
const kuCompare = (a, b) => {
  const x = a.toLocaleLowerCase('tr'), y = b.toLocaleLowerCase('tr');
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return rank(x[i]) - rank(y[i]);
  return x.length - y.length || (a < b ? -1 : a > b ? 1 : 0);
};

const MAX_DEFS = 3, MAX_EX = 5;
const byKey = new Map();
let skipped = { gender: 0, form: 0, empty: 0 };
for (const e of entries) {
  const w = String(e.w || '').normalize('NFC').trim();
  const z = GENDER[String(e.z || '').toLowerCase().trim()];
  if (!z) { skipped.gender++; continue; }
  if (w.length < 2 || /^['’‘`-]|-$|[0-9]/.test(w)) { skipped.form++; continue; }
  if (!e.defs?.length) { skipped.empty++; continue; }
  const key = w + '|' + z;
  const prev = byKey.get(key);
  if (prev) {
    prev.d.push(...e.defs.filter(d => !prev.d.includes(d)));
    prev.x.push(...e.ex);
    continue;
  }
  byKey.set(key, { w, z, d: [...(e.defs || [])], x: [...(e.ex || [])] });
}

const list = [...byKey.values()];
// the richer entry of a word comes first and keeps the plain id ("kar" = work, "kar~2" = benefit)
const weight = n => n.d.length + n.x.length;
list.sort((a, b) => kuCompare(a.w, b.w) || weight(b) - weight(a));
const seen = new Map();
const rows = list.map(n => {
  const k = seen.get(n.w) || 0; seen.set(n.w, k + 1);
  // lines of verse glued together by a lost line break ("leyzok eÇi zanin") are dropped
  const ex = [...n.x.filter(x => !x[2]), ...n.x.filter(x => x[2])].filter(x => !/[a-zçêîşû][A-ZÇÊÎŞÛ]/.test(x[0].replace(/\*\*/g, '')))
    .filter((x, i, a) => a.findIndex(y => y[0] === x[0]) === i).slice(0, MAX_EX)
    .map(x => (x[2] ? [x[0], 1] : [x[0]]));
  const row = [n.w, n.z, n.d.slice(0, MAX_DEFS), ex];
  if (k) row.push(`${n.w}~${k + 1}`);
  return row;
});

const json = JSON.stringify(rows);
writeFileSync(join(root, 'src/data/nouns.json'), json);

// manifest.json tells installed apps whether a newer data set is online. The version only
// changes when the data itself changes.
const sha = createHash('sha256').update(json).digest('hex');
const mPath = join(root, 'src/data/manifest.json');
const old = existsSync(mPath) ? JSON.parse(readFileSync(mPath, 'utf8')) : null;
const now = new Date();
const stamp = Number(now.toISOString().replace(/[-:T]/g, '').slice(0, 12)); // YYYYMMDDHHmm
const manifest = old?.sha256 === sha ? old : { version: stamp, count: rows.length, bytes: Buffer.byteLength(json), sha256: sha, built: now.toISOString() };
writeFileSync(mPath, JSON.stringify(manifest, null, 2) + '\n');
const g = { m: 0, n: 0, mn: 0 }; rows.forEach(r => g[r[1]]++);
console.log(`${rows.length} nouns (mê ${g.m}, nêr ${g.n}, herdu ${g.mn}) → src/data/nouns.json, ${(json.length / 1024 / 1024).toFixed(1)} MB; skipped ${JSON.stringify(skipped)}`);
