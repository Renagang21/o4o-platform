/**
 * queue delta (원본 큐 미수정) + 후속 P1 적용 규칙집 생성.
 */
import fs from 'node:fs';
import { D } from './hff-ko-function-review-pilot-47-lib.mjs';

const DEC = JSON.parse(fs.readFileSync(`${D}/hff-ko-function-review-pilot-47-manual-decisions-v1.json`, 'utf8'));
const RB = JSON.parse(fs.readFileSync(`${D}/hff-ko-function-review-pilot-47-rollback-manifest-v1.json`, 'utf8'));
const AUDIT = JSON.parse(fs.readFileSync(`${D}/hff-ko-function-review-pilot-47-current-db-audit-v1.json`, 'utf8'));
const QUEUE = `${D}/hff-ko-function-human-review-queue-v1.jsonl`;
const OUT_DELTA = `${D}/hff-ko-function-review-pilot-47-queue-delta-v1.jsonl`;
const OUT_RULE = `${D}/hff-ko-function-review-pilot-47-rulebook-v1.json`;

const rbByPilot = new Map((RB.targets ?? []).map((t) => [t.pilotIndex, t]));
const auditByPilot = new Map(AUDIT.rows.map((r) => [r.pilotIndex, r]));

const STATUS = {
  SAFE_CANONICAL_PATCH: 'RESOLVED_UPDATED',
  RESOLVED_NO_CHANGE: 'RESOLVED_NO_CHANGE',
  BLOCKED_SOURCE_DATA: 'BLOCKED_SOURCE_DATA',
  BLOCKED_AMBIGUOUS_BOUNDARY: 'BLOCKED_STRUCTURE',
  BLOCKED_RENDERER_STRUCTURE: 'BLOCKED_STRUCTURE',
};
const NEXT = {
  SAFE_CANONICAL_PATCH: 'NONE — canonical 갱신 완료',
  RESOLVED_NO_CHANGE: 'NONE — 현재 canonical 이 공식 기능성 전량 보유',
  BLOCKED_SOURCE_DATA: 'SOURCE_REPAIR_WO — 공식 원천(MAIN_FNCTN) 대괄호/파편 정비 후 재생산',
  BLOCKED_AMBIGUOUS_BOUNDARY: 'HUMAN_BOUNDARY_DECISION — 원료/기능성 경계를 사람이 확정한 뒤 재생산',
  BLOCKED_RENDERER_STRUCTURE: 'RENDERER_STRUCTURE_WO — 기능성 블록 재구성(템플릿 부재/블록 결손)',
};

const lines = [];
for (const d of DEC.decisions) {
  const t = rbByPilot.get(d.pilotIndex);
  const a = auditByPilot.get(d.pilotIndex);
  const updated = d.decision === 'SAFE_CANONICAL_PATCH' && t?.applyStatus === 'APPLIED';
  lines.push(JSON.stringify({
    queueIndex: d.queueIndex,
    candidateId: d.candidateId,
    previousReviewStatus: 'PENDING',
    pilotDecision: d.decision,
    proposedReviewStatus: STATUS[d.decision] ?? 'PENDING',
    canonicalUpdated: updated,
    canonicalId: d.canonicalId,
    oldContentHash: t?.oldContentHash ?? a?.currentHash ?? null,
    newContentHash: updated ? t.newContentHash : (a?.currentHash ?? null),
    decisionReasons: d.decisionReasons,
    blockedReason: d.blockedReason ?? null,
    repairClass: d.repairClass,
    nextAction: NEXT[d.decision] ?? 'PENDING',
    reviewNotes: updated
      ? `INSERT_MISSING_GROUP: 그룹 ${t.insertedGroups.length}개 · 공식 기능성 ${t.insertedClauseCount}절 복원(원문 verbatim)`
      : (d.decision === 'RESOLVED_NO_CHANGE' ? '표시 결함 없음 — 감사 신호는 원문 표시 파편에 기인'
        : `차단: ${d.blockedReason ?? d.decision}`),
  }));
}
fs.writeFileSync(OUT_DELTA, lines.join('\n') + '\n');

const statusTally = {};
for (const l of lines) { const s = JSON.parse(l).proposedReviewStatus; statusTally[s] = (statusTally[s] ?? 0) + 1; }

/* ── 규칙집 ─────────────────────────────────────────── */
const rulebook = {
  builtAt: new Date().toISOString(),
  pilotScope: { total: 47, SOURCE_LINE_BREAK_FRAGMENTED: 2, MALFORMED_BRACKET: 45 },
  outcome: DEC.tally,
  generalizableRules: [
    {
      id: 'R1-SAFE-UNCLOSED-LABEL-UNIQUE-MARKER',
      applicability: 'P1 자동 후보',
      condition: '원문 라인이 `[<라벨><열거마커><기능성>` 형태이고 닫는 대괄호만 없으며, 라벨에 [ ] 가 없고, 첫 열거 마커(①~⑮ / (가)(나)(다) / 1. 2. 3.)가 라벨/기능성 분리점을 **유일하게** 확정하며, 해당 라인의 기능성이 현재 canonical 에서 **전량 누락**된 경우',
      action: 'RENDER_ONLY_REPAIR — 동일 문서 형제 그룹 마크업을 verbatim 복제하여 INSERT_MISSING_GROUP. 원문 순서 유지. 그룹 ≥2 면 sd-core 로 감쌈',
      guards: ['원문 dense 부분문자열만 사용', '기능성 블록 외부 byte 동일', 'renderer family·class 집합 불변', '기존 그룹 HTML 은 substring 그대로 재사용(재생성 금지)'],
      pilotEvidence: { matched: 6, applied: 6, clausesRestored: 11 },
    },
    {
      id: 'R2-NOCHANGE-LINE-BREAK-ARTIFACT',
      applicability: 'P1 자동 판정(무변경)',
      condition: '대괄호는 균형이고 원문에 어절 중간 줄바꿈(`…도\\n움을 줌`)이 있으나, 현재 canonical 이 결합된 완전한 문장을 이미 보유',
      action: 'RESOLVED_NO_CHANGE',
      guards: ['grounding 판정은 공백 제거(dense) 키로 해야 함 — 공백 유지 비교는 정상 결합을 허위 위반으로 잡는다'],
      pilotEvidence: { matched: 2 },
    },
  ],
  humanReviewRequiredRules: [
    { id: 'H1-UNMATCHED-CLOSING-BRACKET', condition: '여는 대괄호 없이 `]` 존재 — 라벨 시작점 불확정', count: 7, note: '#4 자몽추출물 사례: 공식 기능성 1절이 렌더에서 누락돼 있으나 라벨 시작점을 확정할 수 없어 자동 복구 금지' },
    { id: 'H2-NO-MARKER', condition: '닫는 대괄호 누락 + 열거 마커 부재 — 라벨/기능성 분리 불가', count: 9 },
    { id: 'H3-LABEL-HAS-BRACKET', condition: '라벨 내부에 대괄호 중첩', count: 2 },
    { id: 'H4-NO-IDENTIFIABLE-BROKEN-LINE', condition: '대괄호 불균형이나 원인 라인을 유일 특정 불가', count: 4 },
  ],
  sourceRepairRules: [
    { id: 'S1-RAW-BRACKET-FRAGMENT-RENDERED', condition: '기능성 손실은 없으나 원문 대괄호 파편이 라벨/기능성과 함께 한 항목으로 노출', count: 5, action: '원천 정비 후 재생산 (canonical 자동 수정 금지)' },
  ],
  rendererStructureRules: [
    { id: 'T1-NO-SIBLING-TEMPLATE', condition: '기능성 블록에 라벨+목록 형제 그룹 마크업이 없어 verbatim 복제 템플릿 부재', count: 10 },
    { id: 'T2-FUNCTION-BLOCK-ABSENT', condition: '기능성 섹션 자체가 canonical 에 없음(#35 프로바이오틱스우먼 — 공식 기능성 3절 전량 미노출)', count: 1, note: '최우선 후속 처리 권장' },
  ],
  doNotGeneralize: [
    { id: 'X1-NO-DEDUPE-ON-SD-WHY', rule: '원료 경계가 원문에 없는 sd-why 평면 목록에는 dedupe 를 적용하지 않는다. 서로 다른 원료가 각각 공식 보유한 동일 문장을 병합하면 특정 원료의 공식 기능성이 삭제된다.' },
    { id: 'X2-NO-LABEL-NORMALIZATION', rule: '라벨에 원문 유래 불균형 괄호가 있어도(예: `밀크씨슬(카르두스 마리아누스)추출물)`) 임의로 정규화하지 않는다. 삭제도 원문 변경이다.' },
    { id: 'X3-NO-BRACKET-INSERTION-INTO-SOURCE', rule: '닫는 대괄호를 원문에 임의 삽입하지 않는다. 렌더 복구는 원문 수정 없이 수행한다.' },
    { id: 'X4-LATIN-INGREDIENT-NOT-LITERAL', rule: '`[EPA…` `[NAG…` 처럼 라틴문자로 시작하는 정상 원료명을 영문 리터럴 괄호로 오판하지 말 것. 리터럴 판정은 영문 기능성 문장·고시번호·마침표 종결 괄호로 한정한다.' },
  ],
  p1Projection: {
    p1Total: 2252,
    pilotConsumed: 47,
    p1Remaining: 2205,
    note: '파일럿 47건에서 R1 자동 후보 비율 6/47 ≈ 12.8%, 무변경 2/47 ≈ 4.3%, 사람검토/원천정비 39/47 ≈ 83%. 단 파일럿은 FRAGMENTED·MALFORMED_BRACKET 편중 표본이므로 P1 전체 분포와 동일하지 않다.',
    estimatedAutoRuleApplicable: Math.round(2205 * (6 / 47)),
    estimatedHumanReviewRetained: 2205 - Math.round(2205 * (6 / 47)),
    caveat: '추정치는 동일 사유 분포 가정 하의 산술 외삽이며, P1 잔여의 실제 사유 구성(INGREDIENT_FUNCTION_BOUNDARY_UNCLEAR 등)이 다르면 크게 달라진다. 후속 WO 에서 사유별 재표본 필요.',
  },
  queueDeltaStatusTally: statusTally,
};
fs.writeFileSync(OUT_RULE, JSON.stringify(rulebook, null, 1));

console.log(JSON.stringify({ delta: OUT_DELTA, deltaRows: lines.length, statusTally, rulebook: OUT_RULE,
  generalizable: rulebook.generalizableRules.length, humanRules: rulebook.humanReviewRequiredRules.length,
  doNotGeneralize: rulebook.doNotGeneralize.length, p1: rulebook.p1Projection }, null, 2));
