/**
 * READ-ONLY(DB write 0) — Agent B 소유 단일 기능성 ready → composeSf + Guard → apply-ready target.
 *   PROXY_PORT 불요. npx tsx src/scripts/hff-sf-b-generate.ts --ingredient 차전자피식이섬유 --dir <sfdir>
 *
 * 공용 hff-sf-generate.ts 는 Agent C 미커밋 WIP → 편집 금지. 동일 로직을 B 소유 신규 파일로 두고
 * 원료 config 만 B_INGREDIENTS 에서 주입. composeSf/runGuard 는 CLEAN 모듈 read-only import.
 */
import fs from 'node:fs';
import path from 'node:path';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import { B_INGREDIENTS as SF_INGREDIENTS } from './hff-sf-b-registry.js';
import { composeSf, type SfSeed } from './hff-sf-compose.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const ING = arg('ingredient'); const DIR = arg('dir'); const SHARD = arg('shard');
// B basis-unlock: 공식 KO 기능성에 근거가 확인된 네임토큰(E-NAME-DERIVED-GROUNDED-002)만이 유일한 비-PASS 사유인 항목을
// target 으로 승격한다. composeSf 본문은 **공식 기능성만** 나열하므로(제품명 토큰과 공식 기능성이 우연히 겹쳐 flag),
// grounded 네임토큰=공식 기능성 근거 확인됨. BLOCKED·D-CLAIM·PRE-SRC-BASIS·Q-TRUNCATED 등은 절대 승격 안 함(REVIEW 유지).
// Agent C hff-sf-generate 의 --accept-grounded-name 과 동일 semantics(명시적 opt-in, 타 에이전트 무영향).
const ACCEPT_GROUNDED_NAME = process.argv.includes('--accept-grounded-name');
const GROUNDED_NAME_RULE = 'E-NAME-DERIVED-GROUNDED-002';
if (!ING || !SF_INGREDIENTS[ING]) throw new Error('--ingredient 필요'); if (!DIR) throw new Error('--dir 필요');
const ing = SF_INGREDIENTS[ING];
const allReady = JSON.parse(fs.readFileSync(path.join(DIR, `${ing.slug}-ready.json`), 'utf8')) as Array<SfSeed & { shard: number }>;
const ready: SfSeed[] = SHARD !== '' ? allReady.filter((r) => r.shard === parseInt(SHARD, 10)) : allReady;
const outSuffix = SHARD !== '' ? `-shard-${SHARD}-target` : '-target';
const target: unknown[] = []; const reviewLater: Array<{ statementNo: string; reason: string }> = [];
let pass = 0, review = 0, blocked = 0, composeErr = 0; const reviewRules: Record<string, number> = {};
for (const seed of ready) {
  const c = composeSf(ing, seed);
  if ('error' in c) { composeErr++; reviewLater.push({ statementNo: seed.statementNo, reason: `COMPOSE_${c.error}` }); continue; }
  const gi = { candidateId: seed.candidateId, productName: seed.productName, productNameEn: seed.productName, manufacturer: seed.manufacturer, manufacturerEn: null, statementNo: seed.statementNo, category: 'hff',
    source: { mainFunction: seed.source.mainFunction, baseStandard: seed.source.baseStandard, intake: seed.source.intake, caution: seed.source.caution, dosageForm: seed.source.dosageForm, storage: seed.source.storage, shelfLife: seed.source.shelfLife },
    grounding: { declaredAmount: null, serving: null, calculationAllowed: false, ageBandsRaw: null }, drafts: { ko: c.ko, en: c.en } };
  const r = runGuard(gi as never, { phase: 'all' });
  const b = r.findings.filter((f) => f.status === 'BLOCKED');
  if (b.length) { blocked++; reviewLater.push({ statementNo: seed.statementNo, reason: `BLOCKED:${b.map((f) => f.ruleId).join(',')}` }); continue; }
  if (r.overallStatus === 'REVIEW_REQUIRED') {
    const revFindings = r.findings.filter((f) => f.status === 'REVIEW_REQUIRED');
    const onlyGroundedName = ACCEPT_GROUNDED_NAME && revFindings.length > 0 && revFindings.every((f) => f.ruleId === GROUNDED_NAME_RULE);
    if (!onlyGroundedName) {
      review++; for (const f of revFindings) reviewRules[f.ruleId] = (reviewRules[f.ruleId] ?? 0) + 1; reviewLater.push({ statementNo: seed.statementNo, reason: `REVIEW:${revFindings.map((f) => f.ruleId).join(',')}` }); continue;
    }
    // GROUNDED-002(근거 있는 네임토큰)만 → 공식 기능성 근거 확인됨 → target 승격
  }
  pass++; target.push(gi);
}
fs.writeFileSync(path.join(DIR, `${ing.slug}${outSuffix}.json`), JSON.stringify(target, null, 1));
fs.writeFileSync(path.join(DIR, `${ing.slug}${outSuffix.replace('-target','')}-gen-reviewlater.json`), JSON.stringify(reviewLater, null, 1));
console.log('JSON_SF_GEN_BEGIN');
console.log(JSON.stringify({ ingredient: ing.key, shard: SHARD || 'all', ready: ready.length, PASS: pass, REVIEW: review, BLOCKED: blocked, composeErr, reviewRules }, null, 2));
console.log('JSON_SF_GEN_END');
