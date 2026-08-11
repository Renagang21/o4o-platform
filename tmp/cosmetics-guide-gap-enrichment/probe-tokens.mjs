/** 특징 결손 11,681건의 판매명에서 실제로 무엇이 관측되는지 빈도로 확인한다(어휘를 상상하지 않는다). */
import fs from 'node:fs';

const gaps = JSON.parse(fs.readFileSync('tmp/cosmetics-guide-gap-enrichment/gap-population.json', 'utf8'));
const fl = gaps.filter((g) => g.missing.mainFeatures);

const freq = new Map();
for (const g of fl) {
  const names = new Set([g.productName, ...g.sources.map((s) => s.rawProductName)]);
  const toks = new Set();
  for (const n of names) {
    for (const t of String(n).split(/[\s\[\]()＋+,./·|]+/)) {
      const c = t.trim();
      if (c.length >= 2 && c.length <= 12) toks.add(c);
    }
  }
  for (const t of toks) freq.set(t, (freq.get(t) ?? 0) + 1);
}
const sorted = [...freq].sort((a, b) => b[1] - a[1]);
console.log('featureless =', fl.length);
console.log(sorted.slice(0, 160).map(([t, n]) => `${t}:${n}`).join('  '));
fs.writeFileSync('tmp/cosmetics-guide-gap-enrichment/token-freq.json', JSON.stringify(sorted.slice(0, 1200), null, 1));
