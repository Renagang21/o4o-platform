/**
 * 비타민 C 100건 DB write 프리로드 검사 — 파일 레벨 (read-only, 최신 파서).
 *   npx tsx src/scripts/hff-vc-preload-check-100.ts
 * DB write 0. 대상 고정 · HOLD 혼입 · ko/en 완전성 · grounding 연결 · 최신 Guard BLOCKED 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import type { GuardProductInput } from '../modules/content-guard/product-description-guard.types.js';

const D = 'C:/Users/sohae/o4o-platform/docs/checks/data/product-description-guard';
const parts = ['20', '30', '60', '100'];

const written: GuardProductInput[] = [];
const heldOut: any[] = [];
for (const p of parts) {
  written.push(...JSON.parse(fs.readFileSync(path.join(D, `hff-vitamin-c-${p}.json`), 'utf8')));
  const hp = path.join(D, `hff-vitamin-c-${p}-hold.json`);
  if (fs.existsSync(hp)) {
    const h = JSON.parse(fs.readFileSync(hp, 'utf8'));
    if (Array.isArray(h)) heldOut.push(...h);
    else if (h.heldOut) heldOut.push(...h.heldOut);
  }
}

const ok = (b: boolean) => (b ? '✅ PASS' : '❌ FAIL');
console.log('═══ 비타민 C 100 프리로드 검사 (read-only, 최신 파서) ═══\n');

// 1. 대상 100 고정 + ID 유일
const ids = written.map((x) => x.candidateId);
const stmts = written.map((x: any) => String(x.statementNo).trim());
console.log(`[1] 대상 고정: 작성 ${written.length} · candidateId 유일 ${new Set(ids).size} · 신고번호 유일 ${new Set(stmts).size} · ${ok(written.length === 100 && new Set(ids).size === 100 && new Set(stmts).size === 100)}`);

// 2. HOLD/heldOut 혼입 0
const heldStmts = new Set(heldOut.map((x: any) => String(x.statementNo).trim()));
const holdLeak = written.filter((x: any) => x.holdCode);
const heldMix = stmts.filter((s) => heldStmts.has(s));
console.log(`[2] HOLD/heldOut 혼입: holdCode누출 ${holdLeak.length} · heldOut중복 ${heldMix.length} · ${ok(holdLeak.length === 0 && heldMix.length === 0)} (heldOut ${heldOut.length}건: ${heldOut.map((x: any) => String(x.statementNo)).join(',') || '없음'})`);

// 3. ko/en 완전성
const missDraft = written.filter((x) => !x.drafts?.ko?.trim() || !x.drafts?.en?.trim());
console.log(`[3] ko/en 완전성: 결손 ${missDraft.length} · ${ok(missDraft.length === 0)}`);

// 4. grounding 연결 (비타민 C = declaredAmount + serving)
const missGround = written.filter((x: any) => !x.grounding?.declaredAmount || !x.grounding?.serving);
console.log(`[4] grounding 연결: 결손 ${missGround.length} · ${ok(missGround.length === 0)}`);
if (missGround.length) missGround.slice(0, 5).forEach((x: any) => console.log(`     ⚠️ ${x.candidateId}`));

// 5. 최신 Guard 전수 BLOCKED 0
let blocked = 0, review = 0;
const blkList: string[] = [];
for (const it of written) {
  const r = runGuard(it, { phase: 'all' });
  if (r.overallStatus === 'BLOCKED') { blocked++; blkList.push(`${it.candidateId}: ${r.findings.filter((f) => f.status === 'BLOCKED').map((f) => f.ruleId).join(',')}`); }
  if (r.overallStatus === 'REVIEW_REQUIRED') review++;
}
console.log(`[5] 최신 Guard 전수 100: BLOCKED ${blocked} · REVIEW ${review} · ${ok(blocked === 0)}`);
if (blocked) blkList.forEach((l) => console.log(`     ❌ ${l}`));

// 대상 ID 저장 (DB 검사용)
fs.writeFileSync('C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/55e4dd9c-cf70-462e-8114-188f6c53d473/scratchpad/vc-target-100-ids.json',
  JSON.stringify(written.map((x: any) => ({ candidateId: x.candidateId, statementNo: String(x.statementNo).trim(), productName: x.productName, manufacturer: x.manufacturer })), null, 1));
console.log('\n대상 100 ID → scratchpad/vc-target-100-ids.json');
