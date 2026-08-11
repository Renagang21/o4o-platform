/** A축(판매명 사실값) 보완 여유분 실측. */
import fs from 'node:fs';
import { extractCapacityV2, extractComposition } from '../../apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/enrich-core.mjs';

const gaps = JSON.parse(fs.readFileSync('tmp/cosmetics-guide-gap-enrichment/gap-population.json', 'utf8'));
const fl = gaps.filter((g) => g.missing.mainFeatures);

let cap = 0;
let comp = 0;
let any = 0;
const byFrom = {};
const samples = [];
for (const g of fl) {
  const names = [g.productName, ...g.sources.map((s) => s.rawProductName)];
  let c = null;
  for (const n of names) {
    c = extractCapacityV2(n);
    if (c) break;
  }
  const k = names.map(extractComposition).find(Boolean) ?? null;
  if (c) {
    cap += 1;
    byFrom[c.from] = (byFrom[c.from] ?? 0) + 1;
  }
  if (k) comp += 1;
  if (c || k) {
    any += 1;
    if (samples.length < 15) samples.push({ name: g.sources[0]?.rawProductName ?? g.productName, cap: c?.value, from: c?.from, comp: k });
  }
}
console.log(JSON.stringify({ featureless: fl.length, cap, comp, any, byFrom }, null, 1));
console.log(JSON.stringify(samples, null, 1));
