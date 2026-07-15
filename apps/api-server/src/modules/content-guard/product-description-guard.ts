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
import { computeBasis, ruleA, ruleB, ruleC, ruleD, ruleE, ruleF, ruleG, ruleH } from './product-description-guard.rules.js';

export * from './product-description-guard.types.js';
export { computeBasis } from './product-description-guard.rules.js';

/** 상태 병합: BLOCKED > REVIEW_REQUIRED > PASS > NOT_APPLICABLE */
export function mergeStatus(findings: GuardFinding[]): GuardStatus {
  if (findings.some((f) => f.status === 'BLOCKED')) return 'BLOCKED';
  if (findings.some((f) => f.status === 'REVIEW_REQUIRED')) return 'REVIEW_REQUIRED';
  if (findings.some((f) => f.status === 'PASS')) return 'PASS';
  return 'NOT_APPLICABLE';
}

/**
 * 작성 전 가드 (§6 pre): grounding 만 보고 "환산 허용 여부 / 생성 금지 목록" 을 확정한다.
 * 초안을 보지 않으므로 초안 작성 **전에** 실행할 수 있다.
 */
export function runPreGuard(input: GuardProductInput): GuardFinding[] {
  const basis = computeBasis(input);
  const findings: GuardFinding[] = [];

  findings.push({
    ruleId: 'PRE-A-BASIS-001',
    severity: basis.allowed ? 'INFO' : 'WARNING',
    status: basis.allowed ? 'PASS' : 'REVIEW_REQUIRED',
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
    status: hasAge ? 'PASS' : 'REVIEW_REQUIRED',
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
    ...ruleF(input),
    ...ruleG(input),
  ];
}

export function runBilingualGuard(input: GuardProductInput): GuardFinding[] {
  return ruleH(input);
}

/** 제품 1건 전체 실행 */
export function runGuard(input: GuardProductInput, opts: GuardOptions = {}): GuardProductResult {
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
    reviewCount: findings.filter((f) => f.status === 'REVIEW_REQUIRED').length,
    passCount: findings.filter((f) => f.status === 'PASS').length,
    findings,
  };
}

/** 배치 실행 (§18) */
export function runGuardBatch(inputs: GuardProductInput[], opts: GuardOptions = {}): GuardBatchResult {
  const products = inputs.map((i) => runGuard(i, opts));
  const findingsByRule: Record<string, number> = {};
  for (const p of products) {
    for (const f of p.findings) {
      if (f.status === 'PASS' || f.status === 'NOT_APPLICABLE') continue;
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
