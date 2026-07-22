import { readFileSync, writeFileSync } from 'node:fs';
const rows = JSON.parse(readFileSync('C:\\tmp\\otc-b02.json', 'utf8'));
const num = (s) => (s == null ? null : Number(s));
const batch01 = new Set([
  '나프록센나트륨|275밀리그램|정', '클로닉신리시네이트|125밀리그램|정', '이부프로펜|200밀리그램|정',
  '아스피린|100밀리그램|정', '알파칼시돌|0.5마이크로그램|연질캡슐', '디펜히드라민염산염|50밀리그램|연질캡슐',
  '독시라민숙신산염|25밀리그램|정', '메코발라민|500마이크로그램|캡슐', '결정글루코사민황산염|250밀리그램|캡슐',
  '이부프로펜|200밀리그램|연질캡슐',
]);
const R = rows.map((r) => ({
  gk: r.gk, verdict: r.verdict, enum: num(r.enum_masters), koCanon: num(r.ko_store_canon),
  anyCanon: num(r.any_canon), noSpd: num(r.no_spd), rx: r.rx, mt: r.seed_master_total,
  form: r.form, ing: r.ing, str: r.str, caution: num(r.caution_len), usage: num(r.usage_len),
  eff: num(r.efficacy_len), has4: r.has4,
}));
const isSingle = (gk) => gk.includes('|') && !gk.includes('::');
const single = R.filter((r) => isSingle(r.gk));
const combo = R.filter((r) => !isSingle(r.gk));
const unprom = single.filter((r) => r.noSpd > 0);
const prom = single.filter((r) => r.noSpd === 0);
const cand = unprom.filter((r) => !batch01.has(r.gk) && r.rx === 0);
const rxMixed = unprom.filter((r) => !batch01.has(r.gk) && r.rx > 0);
const batch01Present = single.filter((r) => batch01.has(r.gk));
cand.sort((a, b) => b.noSpd - a.noSpd);
const out = {
  totals: { rows: R.length, single: single.length, combo: combo.length,
    unpromotedSingle: unprom.length, saturatedSingle: prom.length,
    batch01FoundInData: batch01Present.map((r) => r.gk),
    candidatesRx0: cand.length, rxMixedExcluded: rxMixed.length },
  candidates: cand,
  rxMixed: rxMixed.map((r) => ({ gk: r.gk, noSpd: r.noSpd, rx: r.rx, verdict: r.verdict })),
  comboGroups: combo.map((r) => ({ gk: r.gk, noSpd: r.noSpd, rx: r.rx, enum: r.enum })),
  saturatedSingle: prom.map((r) => ({ gk: r.gk, enum: r.enum, koCanon: r.koCanon, rx: r.rx })),
};
writeFileSync('C:\\tmp\\otc-b02-analysis.json', JSON.stringify(out, null, 2), 'utf8');
console.log('written');
