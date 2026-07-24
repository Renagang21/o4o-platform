/**
 * READ-ONLY(DB write 0) — 액상 pool 을 Guard overallStatus 기준 PASS/REVIEW 분리 (C 전용).
 *   npx tsx src/scripts/hff-liquid-c-passfilter.ts --pool <pool.json> --out <dir>
 *
 * WO-O4O-HFF-LIQUID-BULK-PRODUCTION-C-V1. PRE-SRC-BASIS-UNVERIFIABLE-003 등 REVIEW_REQUIRED 는
 * "사람이 원문 확정" 계약(hff-combo-c-categorize 관례)에 따라 **자동 apply 대상에서 제외**한다.
 * PASS(overallStatus==PASS) 만 pool-pass.json 편입 → 기존 composeNutrient+Guard+apply 재사용.
 * 공용 parser/registry/composer/Guard **무수정** — 본 필터만 C 전용.
 */
import fs from 'node:fs';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import { toGuardInput, type NSeed } from './hff-nutrient-compose.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const POOL = arg('pool'); const OUTDIR = arg('out');
if (!POOL || !OUTDIR) throw new Error('--pool, --out 필요');
fs.mkdirSync(OUTDIR, { recursive: true });

const pool = JSON.parse(fs.readFileSync(POOL, 'utf8')) as Array<NSeed & { statementNo: string }>;
const pass: unknown[] = []; const review: Array<{ statementNo: string; productName: string; status: string; rules: string[] }> = [];
const ruleHits: Record<string, number> = {};
for (const seed of pool) {
  const r = runGuard(toGuardInput(seed, 'probe') as Parameters<typeof runGuard>[0], { phase: 'all' });
  if (r.overallStatus === 'PASS') { pass.push(seed); continue; }
  const rules = r.findings.filter((f) => f.status !== 'PASS').map((f) => f.ruleId);
  for (const x of rules) ruleHits[x] = (ruleHits[x] ?? 0) + 1;
  review.push({ statementNo: seed.statementNo, productName: seed.productName, status: r.overallStatus, rules });
}
fs.writeFileSync(`${OUTDIR}/pool-pass.json`, JSON.stringify(pass, null, 1));
fs.writeFileSync(`${OUTDIR}/pool-review.json`, JSON.stringify(review, null, 1));
console.log(JSON.stringify({ total: pool.length, PASS: pass.length, REVIEW_or_BLOCKED: review.length, reviewRuleHist: ruleHits }, null, 2));
