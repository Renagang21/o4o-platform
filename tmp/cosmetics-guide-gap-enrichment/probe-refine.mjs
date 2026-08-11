import fs from 'node:fs';
const t = JSON.parse(fs.readFileSync('tmp/cosmetics-guide-gap-enrichment/type-triage.json', 'utf8'));
const rows = t.rows.filter((x) => x.verdict === 'NODE_REFINEMENT');
const pairs = new Map();
for (const r of rows) {
  const k = `${r.categoryType} → ${r.newType}`;
  if (!pairs.has(k)) pairs.set(k, []);
  pairs.get(k).push(r.productName);
}
for (const [k, v] of [...pairs].sort((a, b) => b[1].length - a[1].length)) {
  console.log(String(v.length).padStart(4), k, '|', v.slice(0, 2).join(' / ').slice(0, 80));
}
