// Turns the wikitext of one Wîkîferheng page into Kurmanji noun entries:
//   { w, z, defs, ex, alt }   (Kurmanji only)
// z: "m" (mê), "n" (nêr), "mn" (both, by meaning) — from {{navdêr|ku|z=…}}
// ex: [sentence with **marked** forms, Kurmanji explanation, 1 if a quotation]
// Used by fetch-nouns.mjs (GitHub Actions) and its test.

export const splitArgs = s => {
  const out = []; let d = 0, cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if ((c === '{' && n === '{') || (c === '[' && n === '[')) { d++; cur += c + n; i++; continue; }
    if ((c === '}' && n === '}') || (c === ']' && n === ']')) { d--; cur += c + n; i++; continue; }
    if (c === '|' && d === 0) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
};

const tplAt = (s, i) => {
  let d = 0;
  for (let j = i; j < s.length - 1; j++) {
    if (s[j] === '{' && s[j + 1] === '{') { d++; j++; }
    else if (s[j] === '}' && s[j + 1] === '}') { d--; j++; if (d === 0) return [s.slice(i + 2, j - 1), j + 1]; }
  }
  return [s.slice(i + 2), s.length];
};

export const templates = s => {
  const out = []; let i = 0;
  while ((i = s.indexOf('{{', i)) !== -1) { const [inner, end] = tplAt(s, i); out.push({ inner, start: i, end }); i = end; }
  return out;
};

export const clean = (s, keepBold) => {
  let t = s;
  t = t.replace(/<ref[^>]*\/>/g, '').replace(/<ref[\s\S]*?<\/ref>/g, '').replace(/<\/?br\s*\/?>/gi, ' / ').replace(/<\/?[a-z][^>]*>/gi, '');
  for (let k = 0; k < 4; k++) {
    t = t.replace(/\{\{([^{}]*)\}\}/g, (_, inner) => {
      const a = inner.split('|'); const n = a[0].trim();
      if (n === 'w' || n === 'g' || n === 'q') return a[a.length - 1].includes('=') ? a[1] : a[a.length - 1];
      if (n === 'f' || n === 'e' || n === 'mijar') return '(' + a.slice(2).filter(x => !x.includes('=')).join(', ') + ') ';
      if (n === '...') return '…';
      return '';
    });
  }
  t = t.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/\[https?:\S+ ([^\]]*)\]/g, '$1');
  t = keepBold ? t.replace(/'''(.+?)'''/g, '**$1**') : t.replace(/'''/g, '');
  t = t.replace(/''/g, '').replace(/\(\s*\)/g, '').replace(/\s+/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();
  return t;
};

const ALT = /^\{\{(guharto|şaşnivîs|formeke din|navdêr-form|forma|pirjimar|nestandard)[^|]*\|ku\|([^|}]+)/;

export function parseNouns(title, text) {
  const m = text.match(/==\s*\{\{ziman\|ku\}\}\s*==([\s\S]*?)(?=\n==[^=]|$)/);
  if (!m) return [];
  const ku = m[1];
  const out = [];
  for (const sec of ku.split(/\n(?====[^=])/)) {
    if (!/^===\s*Navdêr/.test(sec)) continue;
    const nt = templates(sec).find(t => /^navdêr\|ku/.test(t.inner));
    if (!nt) continue;
    const z = (splitArgs(nt.inner).find(a => /^z=/.test(a)) || '').slice(2).trim();
    const body = sec.split(/\n====/)[0];
    const defs = [], ex = []; let alt = null;
    for (const line of body.split('\n')) {
      if (/^#\s/.test(line)) {
        const raw = line.slice(1).trim();
        const g = raw.match(ALT);
        if (g && defs.length === 0) { alt = g[2]; continue; }
        const d = clean(raw);
        if (d && d.length > 1) defs.push(d.length > 220 ? d.slice(0, 217).trimEnd() + '…' : d);
      } else if (/^#:\s*\{\{(mk|nm)\|ku\|/.test(line)) {
        const t = templates(line)[0];
        const a = splitArgs(t.inner).filter(x => !/^[a-zêîûç]+=/.test(x));
        const s = clean(a[2] || '', true), mean = clean(a[3] || '');
        if (s && s.length < 200) ex.push(mean ? [s, mean] : [s]);
      } else if (/^#\*/.test(line) && /jêgirtin=/.test(line)) {
        const t = templates(line)[0];
        if (!t) continue;
        const q = splitArgs(t.inner).find(x => /^\s*jêgirtin\s*=/.test(x));
        if (q) {
          const s = clean(q.replace(/^\s*jêgirtin\s*=/, ''), true);
          if (s && s.length >= 12 && s.length <= 170 && !s.includes(' / ')) ex.push([s, '', 1]);
        }
      }
    }
    out.push({ w: title, z, defs, ex, alt });
  }
  return out;
}
