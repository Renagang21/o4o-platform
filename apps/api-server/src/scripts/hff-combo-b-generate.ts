/**
 * Agent B 소유 사본 — 공용 `hff-combo-generate.ts` 와 **import 한 줄만 다르다**(B compose 사용).
 * 공용 generate 는 compose 를 직접 import 하므로 B 전용 원료 meta 를 주입할 지점이 없다.
 *
 * HFF M2/M3 복합형 — 생성 드라이버 (composeCombo + G-MULTI + 표준 Guard, read-only DB)
 *   npx tsx src/scripts/hff-combo-b-generate.ts --pool <pool.json> --prefix unreg-b --out <json> --drafts <dir>
 * 개별 BLOCKED(G-MULTI 또는 표준) 자동 HOLD → 산출 json BLOCKED 0. DB write 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import { composeCombo, runComboGuard, toGuardInput, type ComboSeed } from './hff-combo-b-compose.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const POOL = arg('pool'); const PREFIX = arg('prefix', 'combo'); const PAD = parseInt(arg('pad', '3'), 10);
const OUT = arg('out'); const DRAFTS = arg('drafts'); const HTML = arg('html', '1') === '1';
const START = parseInt(arg('start', '0'), 10); const COUNT = parseInt(arg('count', '100000'), 10);
if (!POOL || !OUT) throw new Error('--pool --out 필요');
const pool = JSON.parse(fs.readFileSync(POOL, 'utf8')) as ComboSeed[];
const slice = pool.slice(START, START + COUNT);
if (HTML && DRAFTS) fs.mkdirSync(DRAFTS, { recursive: true });

const inputs: ReturnType<typeof toGuardInput>[] = [];
const heldOut: Array<{ statementNo: string; productName: string; holdCode: string; reason: string }> = [];
let pass = 0, review = 0, blocked = 0, idx = 0; const ruleHits: Record<string, number> = {}; const multiHits: Record<string, number> = {};
slice.forEach((seed) => {
  const { ko, en } = composeCombo(seed);
  const multi = runComboGuard(seed, ko, en);
  const gi0 = toGuardInput(seed, 'probe');
  const std = runGuard(gi0, { phase: 'all' });
  const stdBlocked = std.findings.filter((f) => f.status === 'BLOCKED');
  if (multi.length || stdBlocked.length) {
    blocked++;
    for (const m of multi) multiHits[m.rule] = (multiHits[m.rule] ?? 0) + 1;
    const rules = [...multi.map((m) => m.rule), ...stdBlocked.map((f) => f.ruleId)];
    const nameClaim = rules.includes('E-NAME-DERIVED-001') || rules.includes('F-KIDS-NAME-001');
    heldOut.push({ statementNo: String(seed.statementNo), productName: seed.productName, holdCode: multi.length ? 'HOLD_MULTI_GUARD' : nameClaim ? 'HOLD_NAME_UNGROUNDED_CLAIM' : 'HOLD_GUARD_BLOCKED', reason: rules.join(',') });
    return;
  }
  idx++;
  const slug = `${PREFIX}-${String(idx).padStart(PAD, '0')}`;
  inputs.push(toGuardInput(seed, slug));
  if (std.overallStatus === 'REVIEW_REQUIRED') review++; else pass++;
  for (const f of std.findings.filter((f) => f.status === 'REVIEW_REQUIRED')) ruleHits[f.ruleId] = (ruleHits[f.ruleId] ?? 0) + 1;
  if (HTML && DRAFTS) { fs.writeFileSync(path.join(DRAFTS, `${slug}.ko.html`), ko + '\n'); fs.writeFileSync(path.join(DRAFTS, `${slug}.en.html`), en + '\n'); }
});
fs.writeFileSync(OUT, JSON.stringify(inputs, null, 1));
if (heldOut.length) fs.writeFileSync(OUT.replace(/\.json$/, '.blocked-hold.json'), JSON.stringify(heldOut, null, 1));
console.log(`[${PREFIX}] 작성 ${inputs.length}: PASS ${pass} · REVIEW ${review} · BLOCKED 0 (자동HOLD ${blocked})`);
console.log(`G-MULTI HOLD: ${JSON.stringify(multiHits)} · REVIEW rule: ${JSON.stringify(ruleHits)}`);
console.log(`→ ${OUT} (${inputs.length}) · 자동HOLD ${heldOut.length}${HTML && DRAFTS ? ` · drafts ${DRAFTS}` : ''}`);
