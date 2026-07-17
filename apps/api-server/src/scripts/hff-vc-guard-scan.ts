/**
 * 비타민 C 파일럿 20건 — 최신 Guard 전수 소급검사 (read-only)
 *   npx tsx src/scripts/hff-vc-guard-scan.ts
 * 물 규칙(G-WATER) 포함 최신 가드로 재판정. DB write 0.
 */
import fs from 'node:fs';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import type { GuardProductInput } from '../modules/content-guard/product-description-guard.types.js';

const F = 'C:/Users/sohae/o4o-platform/docs/checks/data/product-description-guard/hff-vitamin-c-20.json';
const items = JSON.parse(fs.readFileSync(F, 'utf8')) as GuardProductInput[];

let blocked = 0, review = 0, pass = 0;
const ruleHits: Record<string, number> = {};
const flagged: string[] = [];
for (const it of items) {
  const r = runGuard(it, { phase: 'all' });
  if (r.overallStatus === 'BLOCKED') blocked++;
  else if (r.overallStatus === 'REVIEW_REQUIRED') review++;
  else pass++;
  for (const f of r.findings) {
    if (f.status === 'BLOCKED' || f.status === 'REVIEW_REQUIRED') {
      ruleHits[`${f.ruleId}:${f.status}`] = (ruleHits[`${f.ruleId}:${f.status}`] ?? 0) + 1;
    }
  }
  const risk = r.findings.filter((f) => f.status === 'BLOCKED' || f.status === 'REVIEW_REQUIRED');
  if (risk.length) {
    flagged.push(`${it.candidateId} | ${String(it.productName).slice(0, 22)} | ${r.overallStatus}`);
    for (const f of risk.slice(0, 4)) flagged.push(`     ${f.status} ${f.ruleId} [${f.language ?? '-'}] "${String(f.matchedText ?? '').slice(0, 40)}"`);
  }
}
console.log(`비타민 C 20건 최신 Guard 재검\n`);
console.log(`PASS ${pass} · REVIEW ${review} · BLOCKED ${blocked}`);
console.log(`위험 rule 분포:`, JSON.stringify(ruleHits, null, 0), '\n');
if (flagged.length) { console.log('=== 위험 신호 상세 ==='); flagged.forEach((l) => console.log(l)); }
else console.log('위험 신호 없음(BLOCKED·REVIEW 0)');
