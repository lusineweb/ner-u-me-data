// Downloads every Kurmanji noun with a grammatical gender from Wîkîferheng and writes the raw
// entries ({ entries, meta }) that build-data.mjs turns into src/data/nouns.json.
// Runs monthly in GitHub Actions (.github/workflows/update-nouns.yml); also works locally:
//   node scripts/fetch-nouns.mjs ner-u-me-wiki.json
import { readFileSync, writeFileSync } from 'node:fs';
import { parseNouns } from './wiki-nouns.mjs';

const API = 'https://ku.wiktionary.org/w/api.php';
const UA = process.env.WIKI_USER_AGENT || 'NerUMeBot/1.0 (https://github.com/lusineweb/ner-u-me-data; Kurmanji noun gender app; monthly data refresh)';
const out = process.argv[2] || 'ner-u-me-wiki.json';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CATS = ['Kategorî:Navdêrên mê bi kurmancî', 'Kategorî:Navdêrên nêr bi kurmancî', 'Kategorî:Navdêrên mê û nêr li gorî maneyê bi kurmancî'];

async function api(params) {
  const body = new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params });
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      const r = await fetch(API, { method: 'POST', body, headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
      if (r.ok) {
        const j = await r.json();
        if (j.error?.code === 'maxlag') throw new Error('maxlag');
        if (j.error) throw new Error(j.error.info || j.error.code);
        return j;
      }
      const wait = Number(r.headers.get('retry-after')) * 1000 || 5000 * attempt;
      console.warn(`HTTP ${r.status}, retry in ${wait / 1000}s`);
      await sleep(wait);
    } catch (e) {
      console.warn(`${e.message}, retry ${attempt}`);
      await sleep(5000 * attempt);
    }
  }
  throw new Error('Wîkîferheng API kept failing');
}

// 1. every noun page with a gender
const set = new Set();
for (const cat of CATS) {
  let cont = {};
  do {
    const r = await api({ action: 'query', list: 'categorymembers', cmtitle: cat, cmnamespace: '0', cmlimit: '500', ...cont });
    r.query.categorymembers.forEach(m => set.add(m.title));
    cont = r.continue ?? null;
    await sleep(300);
  } while (cont);
}
const titles = [...set];
console.log(`${titles.length} noun pages`);

// 2. page text, 50 pages per request
const entries = [];
let errors = 0;
for (let i = 0; i < titles.length; i += 50) {
  const batch = titles.slice(i, i + 50);
  const r = await api({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: batch.join('|') });
  for (const p of r.query.pages) {
    const c = p.revisions?.[0]?.slots?.main?.content;
    if (!c) continue;
    try { entries.push(...parseNouns(p.title, c)); } catch (e) { errors++; console.warn(`${p.title}: ${e.message}`); }
  }
  if (i % 5000 === 0) console.log(`${i + batch.length}/${titles.length}`);
  await sleep(400);
}
console.log(`${entries.length} entries, ${errors} errors`);

// Refuse to replace good data with a broken scrape.
let previous = 0;
try { previous = JSON.parse(readFileSync(new URL('../src/data/manifest.json', import.meta.url))).count || 0; } catch {}
if (entries.length < previous * 0.9 || errors > entries.length * 0.02) {
  console.error(`Stopping: ${entries.length} entries now vs ${previous} nouns before, ${errors} errors.`);
  process.exit(1);
}
writeFileSync(out, JSON.stringify({ entries, meta: { source: 'ku.wiktionary.org', fetched: new Date().toISOString(), count: entries.length } }));
console.log(`→ ${out}`);
