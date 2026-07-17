/**
 * 비타민 D 생산 라인 — 종합 검증 + 프리로드 (read-only, DB write 0)
 *   npx tsx src/scripts/hff-vd-verify.ts
 * ① 50-게이트(파일럿 20 + 신규 30) ② 전체 417 Guard ③ ID/신고번호 유일·파일럿 무중복
 * ④ ko/en 완전성 ⑤ grounding ⑥ 반응형 프록시(style/script 0·sd-card·미분절 토큰)
 * ⑦ 사람검수 대상(IU·다회·코팅) ⑧ 프리로드 고정목록·HOLD 요약 저장.
 */
import fs from 'node:fs';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import type { GuardProductInput } from '../modules/content-guard/product-description-guard.types.js';

const DATA = 'C:/Users/sohae/o4o-platform/docs/checks/data/product-description-guard';
const SCR = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/2b5935f9-9c75-483f-8206-e3385235d4d4/scratchpad';
const rd = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8'));

const pilot20: GuardProductInput[] = rd(`${DATA}/hff-vitamin-d-20.json`);
const new30: GuardProductInput[] = rd(`${DATA}/hff-vitamin-d-new-30.json`);
const prod: GuardProductInput[] = rd(`${DATA}/hff-vitamin-d-production.json`);
const all417 = [...new30, ...prod];
const ok = (b: boolean) => (b ? '✅ PASS' : '❌ FAIL');

function guardSummary(items: GuardProductInput[]) {
  let blocked = 0, review = 0, pass = 0;
  const rules: Record<string, number> = {};
  const blk: string[] = [];
  for (const it of items) {
    const r = runGuard(it, { phase: 'all' });
    if (r.overallStatus === 'BLOCKED') { blocked++; blk.push(`${it.candidateId}:${r.findings.filter((f) => f.status === 'BLOCKED').map((f) => f.ruleId).join(',')}`); }
    else if (r.overallStatus === 'REVIEW_REQUIRED') review++;
    else pass++;
    for (const f of r.findings) if (f.status === 'BLOCKED' || f.status === 'REVIEW_REQUIRED') rules[`${f.ruleId}`] = (rules[`${f.ruleId}`] ?? 0) + 1;
  }
  return { blocked, review, pass, rules, blk };
}

console.log('═══ 비타민 D 생산 라인 종합 검증 ═══\n');

// ① 50-게이트
const gate = guardSummary([...pilot20, ...new30]);
console.log(`[1] 50-게이트 (파일럿 20 + 신규 30): PASS ${gate.pass} · REVIEW ${gate.review} · BLOCKED ${gate.blocked} · ${ok(gate.blocked === 0)}`);
console.log(`    위험 rule: ${JSON.stringify(gate.rules)}`);

// ② 전체 417
const full = guardSummary(all417);
console.log(`[2] 전체 417 (신규 30 + 생산 387): PASS ${full.pass} · REVIEW ${full.review} · BLOCKED ${full.blocked} · ${ok(full.blocked === 0)}`);
console.log(`    위험 rule: ${JSON.stringify(full.rules)}`);
if (full.blk.length) full.blk.forEach((l) => console.log(`      ❌ ${l}`));

// ③ ID/신고번호 유일 + 파일럿 무중복
const ids = all417.map((x) => x.candidateId);
const stmts = all417.map((x) => String(x.statementNo).trim());
const pilotStmts = new Set(pilot20.map((x) => String(x.statementNo).trim()));
const overlap = stmts.filter((s) => pilotStmts.has(s));
console.log(`[3] 유일성: candidateId 유일 ${new Set(ids).size}/${ids.length} · 신고번호 유일 ${new Set(stmts).size}/${stmts.length} · 파일럿 중복 ${overlap.length} · ${ok(new Set(ids).size === 417 && new Set(stmts).size === 417 && overlap.length === 0)}`);

// ④ ko/en 완전성
const missDraft = all417.filter((x) => !x.drafts?.ko?.trim() || !x.drafts?.en?.trim());
console.log(`[4] ko/en 완전성: 결손 ${missDraft.length} · ${ok(missDraft.length === 0)}`);

// ⑤ grounding
const missGround = all417.filter((x) => !x.grounding?.declaredAmount || !x.grounding?.serving);
console.log(`[5] grounding(표시량+섭취): 결손 ${missGround.length} · ${ok(missGround.length === 0)}`);

// ⑥ 반응형 프록시
let styleScript = 0, noCard = 0, longTok = 0;
for (const x of all417) {
  for (const html of [x.drafts.ko, x.drafts.en]) {
    if (/<style|<script/i.test(html)) styleScript++;
    if (!/sd-card/.test(html)) noCard++;
    const txt = html.replace(/<[^>]+>/g, ' ');
    if (txt.split(/\s+/).some((w) => w.length > 34)) longTok++;
  }
}
console.log(`[6] 반응형 프록시: style/script ${styleScript} · sd-card 누락 ${noCard} · 미분절 토큰>34 ${longTok} · ${ok(styleScript === 0 && noCard === 0 && longTok === 0)}`);

// ⑦ 사람검수 대상
const iu = all417.filter((x) => /\bIU\b/.test(x.drafts.ko)).length;
const multi = all417.filter((x) => (x.grounding.serving?.servingsPerDay ?? 1) > 1).length;
const osteo = all417.filter((x) => /골다공증/.test(x.drafts.ko)).length;
console.log(`[7] 사람검수 대상: IU ${iu} · 다회섭취 ${multi} · 골다공증 표현 ${osteo}/417`);

// ⑧ 프리로드 고정목록 + HOLD 요약 저장
const preload = all417.map((x) => ({ candidateId: x.candidateId, statementNo: String(x.statementNo).trim(), productName: x.productName, manufacturer: x.manufacturer }));
fs.writeFileSync(`${DATA}/hff-vitamin-d-preload-417.json`, JSON.stringify(preload, null, 1));

// HOLD 레지스트리(VD 관련 = 생산라인 이관 대상: 액상→Agent F, 복합→Agent D 등). generic multivitamin(MULTI) 은 카운트만.
const holdsRaw: Array<{ statementNo: string; productName: string; holdCode: string; reason: string }> = rd(`${SCR}/vd-hold.json`);
const holdCounts: Record<string, number> = {};
for (const h of holdsRaw) holdCounts[h.holdCode] = (holdCounts[h.holdCode] ?? 0) + 1;
const vdRelevant = holdsRaw.filter((h) => h.holdCode !== 'HOLD_MULTI_FUNCTIONAL');
fs.writeFileSync(`${DATA}/hff-vitamin-d-hold-registry.json`, JSON.stringify({ summary: holdCounts, transferNote: { HOLD_MULTI_FUNCTIONAL: 'Agent D (복합)', HOLD_UNSUPPORTED_DIMENSION: 'Agent F (액상)' }, items: vdRelevant }, null, 1));
console.log(`[8] 저장: preload-417.json (${preload.length}) · hold-registry.json (요약 + 비-MULTI ${vdRelevant.length})`);
console.log(`    HOLD 요약: ${JSON.stringify(holdCounts)}`);
console.log(`\n${ok(gate.blocked === 0 && full.blocked === 0 && overlap.length === 0 && missDraft.length === 0 && styleScript === 0)} 종합`);
