/**
 * 유산균 생산 batch-001 (192건) DB write 프리로드 검사 — 파일 레벨 (read-only).
 *   npx tsx src/scripts/hff-preload-check-192.ts
 * DB write 0. 대상 고정 · HOLD/다기능 혼입 · ko/en 완전성 · grounding 연결 · 최신 Guard BLOCKED 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import type { GuardProductInput } from '../modules/content-guard/product-description-guard.types.js';

const D = 'C:/Users/sohae/o4o-platform/docs/checks/data/product-description-guard';
const batches = [...Array(10)].map((_, i) => `prod-a-cp${String(i + 1).padStart(2, '0')}`);

const written: GuardProductInput[] = [];
const holds: any[] = [];
for (const b of batches) {
  written.push(...JSON.parse(fs.readFileSync(path.join(D, `hff-probiotics-${b}.json`), 'utf8')));
  const hp = path.join(D, `hff-probiotics-${b}-hold.json`);
  if (fs.existsSync(hp)) holds.push(...JSON.parse(fs.readFileSync(hp, 'utf8')));
}

const ok = (b: boolean) => (b ? '✅ PASS' : '❌ FAIL');
console.log('═══ 유산균 batch-001 프리로드 검사 (192건, read-only) ═══\n');

// 1. 대상 192건 고정 + ID 유일성
const ids = written.map((x) => x.candidateId);
const uniq = new Set(ids);
console.log(`[1] 대상 고정: 작성 ${written.length}건 · candidateId 유일 ${uniq.size} · ${ok(written.length === 192 && uniq.size === 192)}`);

// 2. HOLD/다기능 혼입 0
const holdIds = new Set(holds.map((x) => x.candidateId));
const overlap = ids.filter((i) => holdIds.has(i));
const holdCodeLeak = written.filter((x: any) => x.holdCode);
// 다기능 신호: mainFunction/baseStandard 에 2번째 기능성분(식이섬유·비타민·아연·홍삼 등)
const MULTI = /식이섬유|난소화성|비타민|아연|홍삼|루테인|오메가|칼슘|마그네슘|프락토|프리바이오틱|이눌린|차전자/;
const multiHit = written.filter((x) => MULTI.test(String(x.source?.mainFunction ?? '') + String(x.source?.baseStandard ?? '')));
console.log(`[2] HOLD/다기능 혼입: HOLD중복 ${overlap.length} · holdCode누출 ${holdCodeLeak.length} · 다기능신호 ${multiHit.length} · ${ok(overlap.length === 0 && holdCodeLeak.length === 0 && multiHit.length === 0)}`);
if (multiHit.length) multiHit.slice(0, 5).forEach((x) => console.log(`     ⚠️ ${x.productName}: ${String(x.source?.mainFunction).slice(0, 40)}`));
console.log(`     HOLD 8건 코드: ${holds.map((h: any) => h.holdCode).join(', ')}`);

// 3. ko/en 쌍 완전성
const missDraft = written.filter((x) => !x.drafts?.ko?.trim() || !x.drafts?.en?.trim());
console.log(`[3] ko/en 완전성: 결손 ${missDraft.length} · ${ok(missDraft.length === 0)}`);
if (missDraft.length) missDraft.slice(0, 5).forEach((x) => console.log(`     ⚠️ ${x.candidateId}`));

// 5. grounding 연결
const missGround = written.filter((x: any) => {
  const g = x.grounding;
  return !g || !g.declaredCfu || !g.serving || !g.declaredAmount;
});
console.log(`[5] grounding 연결: 결손 ${missGround.length} · ${ok(missGround.length === 0)}`);
if (missGround.length) missGround.slice(0, 5).forEach((x) => console.log(`     ⚠️ ${x.candidateId}`));

// 6+7. 최신 Guard 전수 (물 규칙 포함) BLOCKED 0
let blocked = 0, review = 0;
const blockedList: string[] = [];
const ruleHits: Record<string, number> = {};
for (const it of written) {
  const r = runGuard(it, { phase: 'all' });
  if (r.overallStatus === 'BLOCKED') { blocked++; blockedList.push(`${it.candidateId}: ${r.findings.filter((f) => f.status === 'BLOCKED').map((f) => f.ruleId).join(',')}`); }
  if (r.overallStatus === 'REVIEW_REQUIRED') review++;
  for (const f of r.findings) if (f.status === 'BLOCKED') ruleHits[f.ruleId] = (ruleHits[f.ruleId] ?? 0) + 1;
}
const waterRulePresent = fs.readFileSync('C:/Users/sohae/o4o-platform/apps/api-server/src/modules/content-guard/product-description-guard.rules.ts', 'utf8').includes('G-WATER-UNGROUNDED-003');
console.log(`[6] 물 규칙 최신 적용: G-WATER-UNGROUNDED-003 존재 ${waterRulePresent} · ${ok(waterRulePresent)}`);
console.log(`[7] 최신 Guard 전수 192: BLOCKED ${blocked} · REVIEW ${review} · ${ok(blocked === 0)}`);
if (blocked) blockedList.forEach((l) => console.log(`     ❌ ${l}`));

// 대상 ID 목록 저장
fs.writeFileSync('C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/55e4dd9c-cf70-462e-8114-188f6c53d473/scratchpad/target-192-ids.json',
  JSON.stringify(written.map((x: any) => ({ candidateId: x.candidateId, statementNo: x.statementNo, productName: x.productName, manufacturer: x.manufacturer })), null, 2));
console.log('\n대상 192 ID → scratchpad/target-192-ids.json');
