/** 결손 모집단 표본에서 상세 고시 표 확보율을 실측한다 (본 수집 착수 전 판단용). */
import fs from 'node:fs';
import { extractMusinsa } from '../../apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/extract-core.mjs';
import { fetchText, mapPool } from '../../apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/lib.mjs';

const gaps = JSON.parse(fs.readFileSync('tmp/cosmetics-guide-gap-enrichment/gap-population.json', 'utf8'));
const musinsa = gaps.filter((g) => g.sources.some((s) => s.source === 'MUSINSA_BEAUTY'));
const N = 30;
const picks = Array.from({ length: N }, (_, k) => musinsa[Math.floor((k * musinsa.length) / N)]);

let ok = 0;
let noTable = 0;
let dead = 0;
const fieldHits = {};
const rows = await mapPool(
  picks,
  4,
  async (g) => {
    const s = g.sources.find((x) => x.source === 'MUSINSA_BEAUTY');
    const html = await fetchText(`https://www.musinsa.com/products/${s.id}`, { Referer: 'https://www.musinsa.com/' });
    if (html == null) {
      dead += 1;
      return { id: s.id, status: 'DEAD' };
    }
    const f = extractMusinsa(html);
    if (!f) {
      noTable += 1;
      return { id: s.id, status: 'NO_TABLE' };
    }
    ok += 1;
    for (const k of Object.keys(f)) if (k !== '_labels') fieldHits[k] = (fieldHits[k] ?? 0) + 1;
    return { id: s.id, name: g.productName, status: 'OK', spec: f.spec, capacity: f.capacity, usage: f.usage?.slice(0, 60), functional: f.functional };
  },
  350,
);

console.log(JSON.stringify({ sampled: N, ok, noTable, dead, fieldHits }, null, 1));
console.log(JSON.stringify(rows.slice(0, 12), null, 1));
