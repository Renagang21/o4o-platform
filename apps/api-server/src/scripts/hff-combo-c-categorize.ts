/**
 * Agent C 완결 배치 — gen 결과를 READY / REVIEW_LATER 로 분류하고 최종 target 을 조립.
 *   npx tsx src/scripts/hff-combo-c-categorize.ts --gens "f1,f2,..." --dir <S> --out <target.json> --review <review.json>
 *
 * 정책(WO 운영원칙):
 *  - 기능성 원료 귀속은 select 에서 이미 통과(HOLD_GROUNDING 제외). 여기서는 표준 Guard 재판정만.
 *  - BLOCKED → 있으면 즉시 오류(중지 후보). generate 에서 이미 0.
 *  - PRE-SRC-BASIS-UNVERIFIABLE-003 (표시량 비율 원문 자동검증 실패, "사람이 원문 확정") → REVIEW_LATER 분리.
 *  - 그 외 REVIEW(D-CLAIM-GROUNDED-002 등 원문 근거 있는 WARNING) → READY 유지.
 */
import '../env-loader.js';
import fs from 'node:fs';
import path from 'node:path';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import type { GuardProductInput } from '../modules/content-guard/product-description-guard.types.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const GENS = arg('gens').split(',').filter(Boolean); const DIR = arg('dir'); const OUT = arg('out'); const REVIEW_OUT = arg('review');
const REVIEW_LATER_RULES = new Set(['PRE-SRC-BASIS-UNVERIFIABLE-003']);

const ready: GuardProductInput[] = [];
const reviewLater: Array<{ statementNo: string; productName: string; group: string; rules: string[] }> = [];
let blocked = 0; const ruleTally: Record<string, number> = {};

for (const g of GENS) {
  const items: GuardProductInput[] = JSON.parse(fs.readFileSync(path.join(DIR, `${g}.gen.json`), 'utf8'));
  for (const it of items) {
    const r = runGuard(it, { phase: 'all' });
    const reviewRules = [...new Set(r.findings.filter((f) => f.status === 'REVIEW_REQUIRED').map((f) => f.ruleId))];
    const blk = r.findings.filter((f) => f.status === 'BLOCKED');
    if (blk.length) { blocked++; reviewLater.push({ statementNo: String((it as unknown as { statementNo: string }).statementNo), productName: it.productName, group: g, rules: [...new Set(blk.map((f) => f.ruleId))] }); continue; }
    for (const rr of reviewRules) ruleTally[rr] = (ruleTally[rr] ?? 0) + 1;
    if (reviewRules.some((rr) => REVIEW_LATER_RULES.has(rr))) {
      reviewLater.push({ statementNo: String((it as unknown as { statementNo: string }).statementNo), productName: it.productName, group: g, rules: reviewRules });
    } else {
      ready.push(it);
    }
  }
}
// READY statementNo 유일성
const stmts = ready.map((it) => String((it as unknown as { statementNo: string }).statementNo).trim());
const uniq = new Set(stmts);
fs.writeFileSync(OUT, JSON.stringify(ready, null, 1));
if (REVIEW_OUT) fs.writeFileSync(REVIEW_OUT, JSON.stringify(reviewLater, null, 1));
console.log(JSON.stringify({ inputTotal: ready.length + reviewLater.length, READY: ready.length, REVIEW_LATER: reviewLater.length, blocked, readyUniqueStmts: uniq.size, reviewRuleTally: ruleTally }, null, 1));
