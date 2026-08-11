/** 판정 규칙의 실제 분포를 본다(적용 전). */
import fs from 'node:fs';
import { judgeCautions, judgeUsage } from '../../apps/api-server/src/scripts/cosmetics-mfds-usage-caution/enrich-core.mjs';

const pop = JSON.parse(fs.readFileSync('tmp/cosmetics-mfds-usage-caution/population.json', 'utf8'));
const u = {};
const c = {};
const replaceSamples = [];
const keepSamples = new Map();
for (const p of pop) {
  const ju = judgeUsage(p);
  const jc = judgeCautions(p);
  u[ju.verdict] = (u[ju.verdict] ?? 0) + 1;
  c[jc.verdict] = (jc.verdict ? (c[jc.verdict] ?? 0) : 0) + 1;
  if (ju.verdict === 'REPLACE' && replaceSamples.length < 10) {
    replaceSamples.push({ name: p.productName, type: p.productType, from: p.currentUsage?.slice(0, 45), to: ju.text.slice(0, 110) });
  }
  if (ju.verdict === 'KEEP_GENERIC') {
    const k = ju.text ?? String(p.mfdsUsage).replace(/\s+/g, ' ').trim();
    keepSamples.set(k, (keepSamples.get(k) ?? 0) + 1);
  }
}
console.log('usage:', JSON.stringify(u), '\ncautions:', JSON.stringify(c));
console.log('\n--- REPLACE 표본 ---');
for (const s of replaceSamples) console.log(`[${s.type}] ${s.name}\n  기존: ${s.from}…\n  공식: ${s.to}`);
console.log('\n--- KEEP_GENERIC 상위 문장 ---');
for (const [k, n] of [...keepSamples].sort((a, b) => b[1] - a[1]).slice(0, 5)) console.log(String(n).padStart(4), k.slice(0, 90));
