/**
 * G-WATER-UNGROUNDED-003 전수 검증 (read-only)
 *   npx tsx src/scripts/hff-water-guard-scan.ts
 * non-hold hff-probiotics-*.json 전체를 실제 가드로 돌려 물-근거 위반과 전체 BLOCKED 를 집계.
 */
import fs from 'node:fs';
import path from 'node:path';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import type { GuardProductInput } from '../modules/content-guard/product-description-guard.types.js';

const D = 'C:/Users/sohae/o4o-platform/docs/checks/data/product-description-guard';
const files = fs
  .readdirSync(D)
  .filter((f) => /^hff-probiotics-(25|30a|30b|30c|cp[1-5]|prod-a-cp\d+)\.json$/.test(f))
  .sort();

let total = 0;
let water = 0;
const blockedRules: Record<string, number> = {};
const waterHits: string[] = [];
const otherBlocked: string[] = [];

for (const f of files) {
  const items = JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')) as GuardProductInput[];
  for (const it of items) {
    total++;
    const r = runGuard(it, { phase: 'all' });
    const blocked = r.findings.filter((x) => x.status === 'BLOCKED');
    for (const b of blocked) blockedRules[b.ruleId] = (blockedRules[b.ruleId] ?? 0) + 1;
    const w = blocked.filter((b) => b.ruleId === 'G-WATER-UNGROUNDED-003');
    if (w.length) {
      water++;
      waterHits.push(`${f} | ${String(it.productName).slice(0, 22)} | src="${String(it.source.intake).slice(0, 34)}"`);
    }
    const nonWater = blocked.filter((b) => b.ruleId !== 'G-WATER-UNGROUNDED-003');
    if (nonWater.length) {
      otherBlocked.push(`${f} | ${String(it.productName).slice(0, 22)} | ${nonWater.map((b) => b.ruleId).join(',')}`);
    }
  }
}

console.log(`전수 ${total}건 (파일 ${files.length}개)\n`);
console.log(`G-WATER-UNGROUNDED-003 위반: ${water}건`);
console.log(`BLOCKED rule 분포:`, blockedRules, '\n');
console.log('=== 물-근거 위반 목록 ===');
for (const h of waterHits) console.log('  ' + h);
if (otherBlocked.length) {
  console.log('\n=== 물 외 BLOCKED (별도 확인 필요) ===');
  for (const h of otherBlocked) console.log('  ' + h);
} else {
  console.log('\n물 외 BLOCKED: 0');
}
