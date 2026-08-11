import fs from 'node:fs';
const t = JSON.parse(fs.readFileSync('tmp/cosmetics-guide-gap-enrichment/type-triage.json', 'utf8'));
const m = new Map();
for (const r of t.rows.filter((x) => x.newType)) {
  const k = `${r.categoryType} → ${r.newType}`;
  if (!m.has(k)) m.set(k, []);
  m.get(k).push(r.productName);
}
for (const [k, v] of [...m].sort((a, b) => b[1].length - a[1].length)) {
  console.log(String(v.length).padStart(4), k, '|', v.slice(0, 3).join(' / ').slice(0, 90));
}
