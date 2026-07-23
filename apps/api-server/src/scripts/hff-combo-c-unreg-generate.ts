/**
 * Agent C — 미등록 라벨 Combo 생성 드라이버 (composeCombo + G-MULTI(C) + 표준 Guard, read-only DB).
 * WO-O4O-HFF-COMBO-UNREGISTERED-C-EYE-CIRCULATION-V1.
 *   npx tsx src/scripts/hff-combo-c-unreg-generate.ts --pool <pool.json> --prefix <p> --out <json> --drafts <dir>
 *
 * 공용 hff-combo-generate 와 동일하되:
 *  - injectC() 로 C 미등록 원료를 런타임 additive 주입(composeCombo 의 meta 조회가 C 표시명 반환).
 *  - G-MULTI 가드는 runComboGuardC(SRC_LABEL 에 C 라벨 병합) — 공용 runComboGuard 는 C 라벨 미보유로 전량 BLOCK.
 *  - 표준 runGuard(grounding 기반)는 공용 그대로 재사용(combo meta 비의존).
 * 개별 BLOCKED(G-MULTI(C) 또는 표준) 자동 HOLD → 산출 json BLOCKED 0. DB write 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import { composeCombo, toGuardInput, type ComboSeed } from './hff-combo-compose.js';
import { injectC } from './hff-combo-c-unreg-registry.js';
import { runComboGuardC } from './hff-combo-c-guard.js';

injectC(); // ⚠️ composeCombo/meta 조회 전 필수

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const POOL = arg('pool'); const PREFIX = arg('prefix', 'combo-c'); const PAD = parseInt(arg('pad', '3'), 10);
const OUT = arg('out'); const DRAFTS = arg('drafts'); const HTML = arg('html', '1') === '1';
const START = parseInt(arg('start', '0'), 10); const COUNT = parseInt(arg('count', '100000'), 10);
if (!POOL || !OUT) throw new Error('--pool --out 필요');
const pool = JSON.parse(fs.readFileSync(POOL, 'utf8')) as ComboSeed[];
const slice = pool.slice(START, START + COUNT);
if (HTML && DRAFTS) fs.mkdirSync(DRAFTS, { recursive: true });

const inputs: ReturnType<typeof toGuardInput>[] = [];
const heldOut: Array<{ statementNo: string; productName: string; holdCode: string; reason: string }> = [];
let pass = 0, review = 0, blocked = 0; const ruleHits: Record<string, number> = {}; const multiHits: Record<string, number> = {};
let idx = 0;
slice.forEach((seed) => {
  const { ko, en } = composeCombo(seed);
  const multi = runComboGuardC(seed, ko, en);
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
console.log(`G-MULTI(C) HOLD: ${JSON.stringify(multiHits)} · REVIEW rule: ${JSON.stringify(ruleHits)}`);
console.log(`→ ${OUT} (${inputs.length}) · 자동HOLD ${heldOut.length}${HTML && DRAFTS ? ` · drafts ${DRAFTS}` : ''}`);
