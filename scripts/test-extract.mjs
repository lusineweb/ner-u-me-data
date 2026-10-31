// Checks the Wîkîferheng extraction on a small hand-made page: node scripts/test-extract.mjs
import assert from 'node:assert/strict';
import { parseNouns } from './wiki-nouns.mjs';

const page = `== {{ziman|ku}} ==
=== Navdêr ===
{{navdêr|ku|z=m}}
# [[vexwarin|Vexwarina]] bê[[reng]] û bêtam.
#: {{mk|ku|'''Ava''' zelal.}}
#: {{mk|ku|'''Avek''' li xwe kirin.|Dûş kirin.|birêz=1}}
#* {{jêder|ku|jêgirtin=Weku lebe û leyzok e</br>Çi zanin}}
==== Werger ====
{{werger-ser|av|1}}
* {{Z|en}}: {{W+|en|water}}
* {{Z|tr}}: {{W+|tr|su}}, {{W|tr|ab|guman=erê}}
{{werger-bin}}
=== Navdêr 2 ===
{{navdêr|ku|z=n}}
# {{f|ku|devok}} [[gund]]
== {{ziman|en}} ==
=== Navdêr ===
{{navdêr|en}}
# English entry, not ours`;

const r = parseNouns('av', page);
assert.equal(r.length, 2);
assert.equal(r[0].z, 'm');
assert.deepEqual(r[0].defs, ['Vexwarina bêreng û bêtam.']);
assert.deepEqual(r[0].ex, [['**Ava** zelal.'], ['**Avek** li xwe kirin.', 'Dûş kirin.']]);
assert.equal(r[0].tr, undefined);
assert.equal(r[1].z, 'n');
assert.deepEqual(r[1].defs, ['(devok) gund']);
console.log('extract ok');
