/**
 * READ-ONLY(DB write 0) — 프로바이오틱스 고형 pure-single READY 선정 → compose + Guard → apply-ready target.
 *   npx tsx src/scripts/hff-probiotics-generate.ts --ready <ready.json> --out <target.json> --drafts <dir>
 *
 * composeProbiotic(결정적 grounded) → GuardProductInput → runGuard(phase:all).
 * PASS 만 target 편입. BLOCKED/REVIEW/compose-error 는 review-later.
 */
import fs from 'node:fs';
import path from 'node:path';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import { composeProbiotic, type ProbioticSeed } from './hff-probiotics-compose.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const READY = arg('ready'); const OUT = arg('out'); const DRAFTS = arg('drafts');
if (!READY || !OUT) throw new Error('--ready --out 필요');
const seeds = JSON.parse(fs.readFileSync(READY, 'utf8')) as ProbioticSeed[];
if (DRAFTS) fs.mkdirSync(DRAFTS, { recursive: true });

const target: unknown[] = []; const reviewLater: Array<{ statementNo: string; productName: string; reason: string }> = [];
let pass = 0, review = 0, blocked = 0, composeErr = 0; const reviewRules: Record<string, number> = {};
let idx = 0;
for (const seed of seeds) {
  const c = composeProbiotic(seed);
  if ('error' in c) { composeErr++; reviewLater.push({ statementNo: seed.statementNo, productName: seed.productName, reason: `COMPOSE_${c.error}` }); continue; }
  const gi = {
    candidateId: seed.candidateId, productName: seed.productName, productNameEn: seed.productName,
    manufacturer: seed.manufacturer, manufacturerEn: null, statementNo: seed.statementNo, category: 'hff',
    source: { mainFunction: seed.source.mainFunction, baseStandard: seed.source.baseStandard, intake: seed.source.intake, caution: seed.source.caution, dosageForm: seed.source.dosageForm, storage: seed.source.storage, shelfLife: seed.source.shelfLife },
    grounding: c.grounding, drafts: { ko: c.ko, en: c.en },
  };
  const r = runGuard(gi as never, { phase: 'all' });
  const stdBlocked = r.findings.filter((f) => f.status === 'BLOCKED');
  if (stdBlocked.length) { blocked++; reviewLater.push({ statementNo: seed.statementNo, productName: seed.productName, reason: `BLOCKED:${stdBlocked.map((f) => f.ruleId).join(',')}` }); continue; }
  if (r.overallStatus === 'REVIEW_REQUIRED') {
    review++; for (const f of r.findings.filter((f) => f.status === 'REVIEW_REQUIRED')) reviewRules[f.ruleId] = (reviewRules[f.ruleId] ?? 0) + 1;
    reviewLater.push({ statementNo: seed.statementNo, productName: seed.productName, reason: `REVIEW:${r.findings.filter((f) => f.status === 'REVIEW_REQUIRED').map((f) => f.ruleId).join(',')}` });
    continue;
  }
  idx++;
  target.push(gi);
  if (DRAFTS) { const slug = `prob-s1-${String(idx).padStart(3, '0')}`; fs.writeFileSync(path.join(DRAFTS, `${slug}.ko.html`), c.ko + '\n'); fs.writeFileSync(path.join(DRAFTS, `${slug}.en.html`), c.en + '\n'); }
  pass++;
}
fs.writeFileSync(OUT, JSON.stringify(target, null, 1));
fs.writeFileSync(OUT.replace(/\.json$/, '.review-later.json'), JSON.stringify(reviewLater, null, 1));
console.log('JSON_GEN_BEGIN');
console.log(JSON.stringify({ seeds: seeds.length, PASS: pass, REVIEW: review, BLOCKED: blocked, composeErr, reviewRules, targetOut: OUT }, null, 2));
console.log('JSON_GEN_END');
