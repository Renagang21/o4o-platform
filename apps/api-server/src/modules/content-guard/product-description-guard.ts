/**
 * Product Description Grounding Guard — 엔진 (PURE, DB/AI 무관)
 *
 * WO-O4O-PRODUCT-DESCRIPTION-GROUNDING-GUARD-AUTOMATION-V1
 *
 * 수작업 SSOT: docs/guides/content-authoring/GROUNDING-GUARD-CHECKLIST.md (CR-002·003·004·007)
 *
 * 가드는 **작성 도구가 아니다**(WO §6.1·§20·§27):
 *   생성·수정·보완·자동 삭제·수치 재작성을 하지 않는다. 검출 → 보고 → 차단/리뷰만 한다.
 *
 * phase (WO §19):
 *   pre       — grounding 만으로 판정(작성 전 "쓰면 안 되는 수치" 확정). 초안 불필요.
 *   post      — 초안 본문 검사 (A~G)
 *   bilingual — ko/en 대조 + 기능성 강화 (H)
 */

import type {
  GuardBatchResult,
  GuardFinding,
  GuardOptions,
  GuardPhase,
  GuardProductInput,
  GuardProductResult,
  GuardStatus,
} from './product-description-guard.types.js';
import { GUARD_VERSION } from './product-description-guard.types.js';
import { computeBasis, ruleA, ruleB, ruleC, ruleD, ruleE, ruleENameClaim, ruleF, ruleG, ruleH, ruleQ } from './product-description-guard.rules.js';
import { runLiquidGroundingRules, runLiquidBodyRules, runLiquidBilingualRules } from './product-description-guard.rules.js';
import { crossCheckNumber, isBulkMaterial, parseBasis, parseCfu } from './source-grounding-parser.js';
import type { ParseOutcome } from './source-grounding-parser.js';

export * from './product-description-guard.types.js';
export * from './source-grounding-parser.js';
export { computeBasis } from './product-description-guard.rules.js';

/**
 * 상태 병합: BLOCKED > REVIEW_REQUIRED > PASS/INFO > PRECHECK_INFO > NOT_APPLICABLE
 *
 * V1.1: `PRECHECK_INFO`(작성 전 상태 고지)와 `INFO`(근거 확인된 정보성)는 **위험 신호가 아니다**.
 *       최종 판정을 REVIEW 로 끌어올리지 않는다 — 검수자가 실제 위험에 집중하도록.
 */
export function mergeStatus(findings: GuardFinding[]): GuardStatus {
  if (findings.some((f) => f.status === 'BLOCKED')) return 'BLOCKED';
  if (findings.some((f) => f.status === 'REVIEW_REQUIRED')) return 'REVIEW_REQUIRED';
  if (findings.some((f) => f.status === 'PASS' || f.status === 'INFO')) return 'PASS';
  if (findings.some((f) => f.status === 'PRECHECK_INFO')) return 'PASS';
  return 'NOT_APPLICABLE';
}

/** 최종 REVIEW 집계에 포함되는 것만 (PRECHECK_INFO·INFO 제외) */
export function isRiskSignal(f: GuardFinding): boolean {
  return f.status === 'BLOCKED' || f.status === 'REVIEW_REQUIRED';
}

/**
 * 작성 전 가드 (§6 pre): grounding 만 보고 "환산 허용 여부 / 생성 금지 목록" 을 확정한다.
 * 초안을 보지 않으므로 초안 작성 **전에** 실행할 수 있다.
 */
/**
 * PRE-SRC (V1.2) — 손으로 채운 grounding 이 **공식 원문과 일치하는가**.
 *
 * 이 검사가 없으면 파서·작성자의 오독이 그대로 초안 수치가 된다(실측: 1.5억 → 5억, 3.3배).
 * 판정 원칙(WO):
 *   정상 파싱 + 타당성 통과      → 작성 가능 (PASS)
 *   파싱 결과가 원문 숫자와 불일치 → BLOCKED
 *   원문 형식이 비정상            → REVIEW_REQUIRED (HOLD 후보)
 *   파싱 실패                     → **값 없음으로 단정하지 않음** → REVIEW_REQUIRED (원문 수동 확인)
 */
function runSourceCrossCheck(input: GuardProductInput): GuardFinding[] {
  const out: GuardFinding[] = [];
  const base = input.source.baseStandard ?? '';

  // ① 벌크 원료 — 소비자 설명서 대상이 아니다
  const bulk = isBulkMaterial(input.source.intake ?? '');
  if (bulk.bulk) {
    out.push({
      ruleId: 'PRE-SRC-BULK-004', severity: 'ERROR', status: 'BLOCKED', language: 'n/a',
      field: 'source.intake', matchedText: trunc(input.source.intake, 60),
      sourceEvidence: `SRV_USE: ${trunc(input.source.intake, 70)}`,
      message: `벌크 원료로 판정됩니다(${bulk.reason}) — 소비자 설명서 작성 대상이 아닙니다.`,
      suggestedAction: '대상에서 제외하십시오.',
    });
  }

  // ② 표시 CFU 교차 검증 — **프로바이오틱스 제품에만** (2026-07-17 범위화).
  //   비타민·미네랄 등 비프로바이오틱 제품의 BASE_STANDARD 에 있는 `세균수 100 cfu/ml` 등은
  //   **미생물 한도 품질규격**이지 효능 CFU 표시량이 아니다. 전 제품에 CFU 교차검증을 돌리면
  //   그 미생물 한도를 효능 CFU 로 오인해 PRE-SRC-CFU-UNVERIFIABLE-003 오탐(비타민 C 100·비타민 D 파일럿).
  //   판정: declaredCfu 를 채웠거나(프로바이오틱스 작성 규약) mainFunction 이 프로바이오틱스/유산균이면 프로바이오틱스.
  const isProbioticProduct =
    input.grounding.declaredCfu !== undefined || /프로바이오틱스|유산균/.test(input.source.mainFunction ?? '');
  if (isProbioticProduct) {
    const cfu = parseCfu(base);
    // `?? null` 로 뭉개면 미제공이 "없음 단언" 이 된다 → undefined 를 그대로 넘긴다
    const declaredCfu = input.grounding.declaredCfu === undefined ? undefined : (input.grounding.declaredCfu?.absolute ?? null);
    const c = crossCheckNumber('표시량(CFU)', declaredCfu, cfu);
    out.push(
      c.status === 'NOT_DECLARED'
        ? { ruleId: 'PRE-SRC-CFU-NOT-DECLARED-005', severity: 'INFO', status: 'PRECHECK_INFO', language: 'n/a', field: 'grounding.declaredCfu', matchedText: null, sourceEvidence: `BASE_STANDARD: ${trunc(base, 70)}`, message: c.message, suggestedAction: '원문 파싱값을 확인하고 초안 수치를 여기에 맞추십시오.' }
      : c.status === 'MATCH'
        ? { ruleId: 'PRE-SRC-CFU-001', severity: 'INFO', status: 'PASS', language: 'n/a', field: 'grounding.declaredCfu', matchedText: null, sourceEvidence: `BASE_STANDARD: ${trunc(base, 70)}`, message: c.message, suggestedAction: '조치 불요.' }
        : c.status === 'MISMATCH'
          ? { ruleId: 'PRE-SRC-CFU-MISMATCH-002', severity: 'ERROR', status: 'BLOCKED', language: 'n/a', field: 'grounding.declaredCfu', matchedText: String(declaredCfu ?? ''), sourceEvidence: `BASE_STANDARD: ${trunc(base, 90)}`, message: c.message, suggestedAction: '원문 수치를 그대로 사용하십시오. 임의 값 금지.' }
          : { ruleId: 'PRE-SRC-CFU-UNVERIFIABLE-003', severity: 'WARNING', status: 'REVIEW_REQUIRED', language: 'n/a', field: 'grounding.declaredCfu', matchedText: null, sourceEvidence: `BASE_STANDARD: ${trunc(base, 90)}`, message: c.message, suggestedAction: '사람이 원문을 직접 읽고 확정하십시오. **파싱 실패를 근거 부재로 해석하지 마십시오.**' },
    );
  }

  // ③ 표시 기준량 교차 검증
  const pb = parseBasis(base);
  const declaredBasis = input.grounding.declaredAmount
    ? input.grounding.declaredAmount.basisUnit === 'g'
      ? input.grounding.declaredAmount.basisAmount * 1000
      : input.grounding.declaredAmount.basisAmount
    : undefined; // 미제공 — "없음 단언" 이 아니다
  const parsedBasisMg: ParseOutcome<number> =
    pb.kind === 'PARSED'
      ? { kind: 'PARSED', value: pb.value.unit === 'g' ? pb.value.amount * 1000 : pb.value.amount, evidence: pb.evidence }
      : pb;
  const cb = crossCheckNumber('표시 기준량(mg 환산)', declaredBasis, parsedBasisMg);
  out.push(
    cb.status === 'NOT_DECLARED'
      ? { ruleId: 'PRE-SRC-BASIS-NOT-DECLARED-005', severity: 'INFO', status: 'PRECHECK_INFO', language: 'n/a', field: 'grounding.declaredAmount', matchedText: null, sourceEvidence: `BASE_STANDARD: ${trunc(base, 70)}`, message: cb.message, suggestedAction: '원문 파싱값을 확인하십시오.' }
    : cb.status === 'MATCH'
      ? { ruleId: 'PRE-SRC-BASIS-001', severity: 'INFO', status: 'PASS', language: 'n/a', field: 'grounding.declaredAmount', matchedText: null, sourceEvidence: `BASE_STANDARD: ${trunc(base, 70)}`, message: cb.message, suggestedAction: '조치 불요.' }
      : cb.status === 'MISMATCH'
        ? { ruleId: 'PRE-SRC-BASIS-MISMATCH-002', severity: 'ERROR', status: 'BLOCKED', language: 'n/a', field: 'grounding.declaredAmount', matchedText: String(declaredBasis ?? ''), sourceEvidence: `BASE_STANDARD: ${trunc(base, 90)}`, message: cb.message, suggestedAction: '원문 기준량을 그대로 사용하십시오.' }
        : { ruleId: 'PRE-SRC-BASIS-UNVERIFIABLE-003', severity: 'WARNING', status: 'REVIEW_REQUIRED', language: 'n/a', field: 'grounding.declaredAmount', matchedText: null, sourceEvidence: `BASE_STANDARD: ${trunc(base, 90)}`, message: cb.message, suggestedAction: '사람이 원문을 직접 읽고 확정하십시오.' },
  );

  return out;
}

export function runPreGuard(input: GuardProductInput): GuardFinding[] {
  const basis = computeBasis(input);
  const findings: GuardFinding[] = [...runSourceCrossCheck(input)];

  findings.push({
    ruleId: 'PRE-A-BASIS-001',
    severity: 'INFO',
    // V1.1: 작성 전 가드는 위반 검출이 아니라 **상태 고지** → 최종 REVIEW 집계에서 제외
    status: 'PRECHECK_INFO',
    language: 'n/a',
    field: 'grounding',
    matchedText: null,
    sourceEvidence: `BASE_STANDARD: ${trunc(input.source.baseStandard, 80)} | SRV_USE: ${trunc(input.source.intake, 60)}`,
    message: basis.allowed
      ? `환산 허용 — 1단위 ${basis.perUnitCount?.toLocaleString()} / 1일 총 ${basis.dailyCount?.toLocaleString()} (기준량=${basis.basisEquals})`
      : `환산 불가(${basis.reason}) → **작성 전 생성 금지 목록**: per serving · per stick · per capsule · daily total`,
    suggestedAction: basis.allowed
      ? '계산값과 다른 수치를 쓰지 마십시오.'
      : '표시 기준량만 기술하십시오. 1단위당·1일 총량 수치는 만들지 마십시오.',
  });

  // 연령: 원문 연령별 유무 → 대상 소구 허용 여부 사전 고지
  const ageRaw = input.grounding.ageBandsRaw ?? '';
  const hasAge = ageRaw.trim().length > 0;
  findings.push({
    ruleId: 'PRE-F-AGE-001',
    severity: 'INFO',
    status: 'PRECHECK_INFO',
    language: 'n/a',
    field: 'grounding.ageBandsRaw',
    matchedText: hasAge ? trunc(ageRaw, 70) : null,
    sourceEvidence: `SRV_USE: ${trunc(input.source.intake, 70)}`,
    message: hasAge
      ? '원문에 연령별 섭취량 있음 → 연령 구간을 **원문 표기 그대로** 서술 가능'
      : '원문에 연령별 섭취량 없음 → **어린이·가족 대상 소구 금지**(제품명에 키즈가 있어도)',
    suggestedAction: hasAge
      ? '경계를 "이상/미만"으로 확정하지 마십시오(원문이 명시할 때만).'
      : '대상 연령 주장을 쓰지 마십시오.',
  });

  return findings;
}

export function runPostGuard(input: GuardProductInput): GuardFinding[] {
  return [
    ...ruleA(input),
    ...ruleB(input),
    ...ruleC(input),
    ...ruleD(input),
    ...ruleE(input),
    ...ruleENameClaim(input),
    ...ruleF(input),
    ...ruleG(input),
    ...ruleQ(input), // 콘텐츠 품질(CP3) — 문장 파손·중복·잔여 구두점
  ];
}

export function runBilingualGuard(input: GuardProductInput): GuardFinding[] {
  return ruleH(input);
}

/**
 * 액상(드롭·병) 전용 실행 — `liquidGrounding` 이 있을 때만.
 * 고형 PRE-SRC/A~H 는 `grounding.declaredAmount`(mg 기준)를 전제로 하므로 액상엔 부적합·예외.
 * G-LIQUID 6규칙만 실행한다: grounding 정합(pre) / 본문 주장(post) / ko·en 대조(bilingual).
 */
export function runLiquidGuard(input: GuardProductInput, opts: GuardOptions = {}): GuardProductResult {
  const phase = opts.phase ?? 'all';
  const want = (p: GuardPhase) => phase === 'all' || phase === p;

  const pre = want('pre') ? runLiquidGroundingRules(input) : [];
  const post = want('post') ? runLiquidBodyRules(input) : [];
  const bi = want('bilingual') ? runLiquidBilingualRules(input) : [];
  const findings = [...pre, ...post, ...bi];

  return {
    candidateId: input.candidateId,
    productName: input.productName,
    guardVersion: GUARD_VERSION,
    preGuardStatus: pre.length ? mergeStatus(pre) : 'NOT_APPLICABLE',
    postGuardStatus: post.length ? mergeStatus(post) : 'NOT_APPLICABLE',
    koEnStatus: bi.length ? mergeStatus(bi) : 'NOT_APPLICABLE',
    overallStatus: mergeStatus(findings),
    blockedCount: findings.filter((f) => f.status === 'BLOCKED').length,
    reviewCount: findings.filter((f) => f.status === 'REVIEW_REQUIRED').length,
    passCount: findings.filter((f) => f.status === 'PASS' || f.status === 'INFO').length,
    precheckInfoCount: findings.filter((f) => f.status === 'PRECHECK_INFO').length,
    findings,
  };
}

/** 제품 1건 전체 실행 */
export function runGuard(input: GuardProductInput, opts: GuardOptions = {}): GuardProductResult {
  // 액상 grounding 이 있으면 액상 경로로 분리(고형 규칙 미실행 → 고형 판정 불변).
  if (input.liquidGrounding) return runLiquidGuard(input, opts);

  const phase = opts.phase ?? 'all';
  const want = (p: GuardPhase) => phase === 'all' || phase === p;

  const pre = want('pre') ? runPreGuard(input) : [];
  const post = want('post') ? runPostGuard(input) : [];
  const bi = want('bilingual') ? runBilingualGuard(input) : [];
  const findings = [...pre, ...post, ...bi];

  const preGuardStatus = pre.length ? mergeStatus(pre) : 'NOT_APPLICABLE';
  const postGuardStatus = post.length ? mergeStatus(post) : 'NOT_APPLICABLE';
  const koEnStatus = bi.length ? mergeStatus(bi) : 'NOT_APPLICABLE';

  return {
    candidateId: input.candidateId,
    productName: input.productName,
    guardVersion: GUARD_VERSION,
    preGuardStatus,
    postGuardStatus,
    koEnStatus,
    overallStatus: mergeStatus(findings),
    blockedCount: findings.filter((f) => f.status === 'BLOCKED').length,
    // V1.1: REVIEW 집계 = **사람 판정이 필요한 것만**. PRECHECK_INFO·INFO 는 제외.
    reviewCount: findings.filter((f) => f.status === 'REVIEW_REQUIRED').length,
    passCount: findings.filter((f) => f.status === 'PASS' || f.status === 'INFO').length,
    precheckInfoCount: findings.filter((f) => f.status === 'PRECHECK_INFO').length,
    findings,
  };
}

/** 배치 실행 (§18) */
export function runGuardBatch(inputs: GuardProductInput[], opts: GuardOptions = {}): GuardBatchResult {
  const products = inputs.map((i) => runGuard(i, opts));
  const findingsByRule: Record<string, number> = {};
  for (const p of products) {
    for (const f of p.findings) {
      if (!isRiskSignal(f)) continue; // V1.1: 위험 신호만 집계(PRECHECK_INFO·INFO·PASS 제외)
      findingsByRule[f.ruleId] = (findingsByRule[f.ruleId] ?? 0) + 1;
    }
  }
  return {
    guardVersion: GUARD_VERSION,
    totalProducts: products.length,
    pass: products.filter((p) => p.overallStatus === 'PASS').length,
    reviewRequired: products.filter((p) => p.overallStatus === 'REVIEW_REQUIRED').length,
    blocked: products.filter((p) => p.overallStatus === 'BLOCKED').length,
    findingsByRule,
    products,
  };
}

/** exit code (§22): 0 PASS / 1 REVIEW_REQUIRED / 2 BLOCKED */
export function exitCodeFor(batch: GuardBatchResult, strict = false): 0 | 1 | 2 {
  if (batch.blocked > 0) return 2;
  if (batch.reviewRequired > 0) return strict ? 1 : 1;
  return 0;
}

function trunc(s: string, n: number): string {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
}
