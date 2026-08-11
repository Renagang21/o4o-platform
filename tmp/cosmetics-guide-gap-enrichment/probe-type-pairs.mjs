import fs from 'node:fs';
const t = JSON.parse(fs.readFileSync('tmp/cosmetics-guide-gap-enrichment/type-triage.json', 'utf8'));
const pairs = new Map();
for (const r of t.rows) {
  if (r.verdict !== 'DIFFERENT_AXIS') continue;
  const k = `${r.categoryType} → ${r.inferredStrict}`;
  if (!pairs.has(k)) pairs.set(k, { n: 0, ex: [] });
  const p = pairs.get(k);
  p.n += 1;
  if (p.ex.length < 2) p.ex.push(r.productName);
}
const sorted = [...pairs].sort((a, b) => b[1].n - a[1].n);
console.log('DIFFERENT_AXIS pairs:', sorted.length);
for (const [k, v] of sorted.slice(0, 45)) console.log(String(v.n).padStart(5), k, ' | ', v.ex.join(' / ').slice(0, 90));
