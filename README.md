# ner-u-me-data

Zayenda navdêrên kurmancî (mê / nêr), wate û hevokên mînak — tenê bi kurmancî, ji bo sepana **Nêr û Mê**.

- `src/data/nouns.json` — hemû navdêr (forma ku sepan dixwîne): `[peyv, zayend, wate[], mînak[], id?]`
- `src/data/manifest.json` — guhertoya daneyan; sepan bi vê dizane ka daneyên nû hene
- `src/data/apps.json` — sepanên me yên din û guhertoya herî nû ya Nêr û Mêyê (ji bo agahdariya "guhertoyeke nû heye")

Her meh GitHub Actions daneyan ji [Wîkîferhengê](https://ku.wiktionary.org/wiki/Kategor%C3%AE:Navd%C3%AAr_bi_kurmanc%C3%AE) nû dike (`.github/workflows/update-nouns.yml`). Bi destan: `npm run fetch`.

Dema guhertoyeke nû ya sepanê derdikeve, `latest` di `src/data/apps.json` de biguherîne; sepan wê hingê agahdariyekê nîşan dide.

## Lîsans

Dane ji Wîkîferhengê ne û di bin lîsansa [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) de ne.
