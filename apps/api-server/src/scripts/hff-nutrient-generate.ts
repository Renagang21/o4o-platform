/**
 * HFF 단일 영양소 — 생성 드라이버 (compose + Guard 전수, read-only DB)
 *   npx tsx src/scripts/hff-nutrient-generate.ts --pool <pool.json> --prefix zn --pad 3 --out <json> --drafts <dir>
 * DB write 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import { composeNutrient, toGuardInput, type NSeed } from './hff-nutrient-compose.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const POOL = arg('pool'); const PREFIX = arg('prefix', 'n'); const PAD = parseInt(arg('pad', '3'), 10);
const OUT = arg('out'); const DRAFTS = arg('drafts'); const HTML = arg('html', '1') === '1';
const START = parseInt(arg('start', '0'), 10); const COUNT = parseInt(arg('count', '100000'), 10);
if (!POOL || !OUT) throw new Error('--pool, --out 필요');

const pool = JSON.parse(fs.readFileSync(POOL, 'utf8')) as NSeed[];
const slice = pool.slice(START, START + COUNT);
if (HTML && DRAFTS) fs.mkdirSync(DRAFTS, { recursive: true });

const inputs: ReturnType<typeof toGuardInput>[] = [];
const heldOut: Array<{ statementNo: string; productName: string; holdCode: string; reason: string }> = [];
let pass = 0, review = 0, blocked = 0, idx = 0; const ruleHits: Record<string, number> = {}; const flagged: string[] = [];
slice.forEach((seed) => {
  const gi0 = toGuardInput(seed, 'probe');
  const r = runGuard(gi0, { phase: 'all' });
  // 개별 BLOCKED 는 자동 HOLD (WO §15) — 산출 json 에서 제외해 BLOCKED 0 보장
  if (r.overallStatus === 'BLOCKED') {
    blocked++;
    const rules = r.findings.filter((f) => f.status === 'BLOCKED').map((f) => f.ruleId);
    const nameClaim = rules.includes('E-NAME-DERIVED-001') || rules.includes('F-KIDS-NAME-001');
    heldOut.push({ statementNo: String((seed as unknown as { statementNo: string }).statementNo), productName: seed.productName, holdCode: nameClaim ? 'HOLD_NAME_UNGROUNDED_CLAIM' : 'HOLD_GUARD_BLOCKED', reason: rules.join(',') });
    return;
  }
  idx++;
  const slug = `${PREFIX}-${String(idx).padStart(PAD, '0')}`;
  const gi = toGuardInput(seed, slug); inputs.push(gi);
  if (r.overallStatus === 'REVIEW_REQUIRED') review++; else pass++;
  const risk = r.findings.filter((f) => f.status === 'REVIEW_REQUIRED');
  for (const f of risk) ruleHits[`${f.ruleId}:${f.status}`] = (ruleHits[`${f.ruleId}:${f.status}`] ?? 0) + 1;
  if (HTML && DRAFTS) { const { ko, en } = composeNutrient(seed); fs.writeFileSync(path.join(DRAFTS, `${slug}.ko.html`), ko + '\n'); fs.writeFileSync(path.join(DRAFTS, `${slug}.en.html`), en + '\n'); }
});
fs.writeFileSync(OUT, JSON.stringify(inputs, null, 1));
if (heldOut.length) fs.writeFileSync(OUT.replace(/\.json$/, '.blocked-hold.json'), JSON.stringify(heldOut, null, 1));
void flagged;
console.log(`[${PREFIX}] 작성 ${inputs.length}: PASS ${pass} · REVIEW ${review} · BLOCKED 0 (자동HOLD ${blocked})`);
console.log(`위험 rule(REVIEW): ${JSON.stringify(ruleHits)}`);
console.log(`→ ${OUT} (${inputs.length}) · 자동HOLD ${heldOut.length}${HTML && DRAFTS ? ` · drafts ${DRAFTS}` : ''}`);
