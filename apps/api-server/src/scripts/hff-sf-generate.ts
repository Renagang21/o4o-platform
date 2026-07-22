/**
 * READ-ONLY(DB write 0) — 단일 기능성 ready → composeSf + Guard → apply-ready target. generate only(apply 없음).
 *   PROXY_PORT 불요. npx tsx src/scripts/hff-sf-generate.ts --ingredient 바나바잎추출물 --dir <sfdir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import { SF_INGREDIENTS } from './hff-sf-registry.js';
import { composeSf, type SfSeed } from './hff-sf-compose.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const ING = arg('ingredient'); const DIR = arg('dir'); const SHARD = arg('shard');
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
  if (r.overallStatus === 'REVIEW_REQUIRED') { review++; for (const f of r.findings.filter((f) => f.status === 'REVIEW_REQUIRED')) reviewRules[f.ruleId] = (reviewRules[f.ruleId] ?? 0) + 1; reviewLater.push({ statementNo: seed.statementNo, reason: `REVIEW:${r.findings.filter((f) => f.status === 'REVIEW_REQUIRED').map((f) => f.ruleId).join(',')}` }); continue; }
  pass++; target.push(gi);
}
fs.writeFileSync(path.join(DIR, `${ing.slug}${outSuffix}.json`), JSON.stringify(target, null, 1));
console.log('JSON_SF_GEN_BEGIN');
console.log(JSON.stringify({ ingredient: ing.key, shard: SHARD || 'all', ready: ready.length, PASS: pass, REVIEW: review, BLOCKED: blocked, composeErr, reviewRules }, null, 2));
console.log('JSON_SF_GEN_END');
