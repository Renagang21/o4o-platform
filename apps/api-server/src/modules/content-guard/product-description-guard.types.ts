/**
 * Product Description Grounding Guard — 입력/결과 타입 (PURE, DB/AI 무관)
 *
 * WO-O4O-PRODUCT-DESCRIPTION-GROUNDING-GUARD-AUTOMATION-V1
 *
 * 수작업 체크리스트 `docs/guides/content-authoring/GROUNDING-GUARD-CHECKLIST.md` (CR-002·003·004·007)
 * 의 자동화. **전 제품군 공통**(건기식·의약품·의료기기·의약외품).
 *
 * ⚠️ 기존 `neture/drug-import/health-functional-food-description-guards.ts` 와 **중복 아님**:
 *   - 기존: HFF 전용 · AI 생성 파이프라인(seed → JSON draft) · sourceFidelityGuard(토큰 겹침)
 *           / medicineLikeWordingGuard / draftQualityGuard
 *   - 본건: 전 제품군 · **시맨틱 HTML ko/en 초안** · 기준량 환산(A) / 최상급(B) / 부재≠허용(C)
 *           / 근거없는 주장(D) / 제품명 유도(E) / 연령 범위(F) / 제형 일반화(G) / ko·en 대조(H)
 *   두 모듈은 상보적이며 서로를 재구현하지 않는다.
 *
 * 원칙(WO §6):
 *   - 가드는 작성 도구가 아니다. 생성·수정·보완을 하지 않는다.
 *   - 애매하면 자동 PASS 하지 않는다 → REVIEW_REQUIRED.
 *   - 오탐은 허용하되 미탐을 최소화한다(오탐은 사람이 해제 가능, 미탐은 잘못된 설명서가 통과).
 */

// ─── 결과 ────────────────────────────────────────────────────────────────────

export type GuardStatus = 'PASS' | 'REVIEW_REQUIRED' | 'BLOCKED' | 'NOT_APPLICABLE';
export type GuardSeverity = 'ERROR' | 'WARNING' | 'INFO';
export type GuardLanguage = 'ko' | 'en' | 'both' | 'n/a';
export type GuardPhase = 'pre' | 'post' | 'bilingual';

export interface GuardFinding {
  ruleId: string;
  severity: GuardSeverity;
  status: GuardStatus;
  language: GuardLanguage;
  /** 검사 대상 필드 (koDraft / enDraft / grounding.declaredAmount 등) */
  field: string;
  /** 검출된 원문 조각 (없으면 null) */
  matchedText: string | null;
  /** 판정 근거가 된 공식 원천 (BASE_STANDARD/SRV_USE 인용 등) */
  sourceEvidence: string | null;
  message: string;
  suggestedAction: string;
}

export interface GuardProductResult {
  candidateId: string;
  productName: string;
  guardVersion: string;
  preGuardStatus: GuardStatus;
  postGuardStatus: GuardStatus;
  koEnStatus: GuardStatus;
  /** 전체 종합 (BLOCKED > REVIEW_REQUIRED > PASS) */
  overallStatus: GuardStatus;
  blockedCount: number;
  reviewCount: number;
  passCount: number;
  findings: GuardFinding[];
}

export interface GuardBatchResult {
  guardVersion: string;
  totalProducts: number;
  pass: number;
  reviewRequired: number;
  blocked: number;
  /** ruleId → 검출 수 */
  findingsByRule: Record<string, number>;
  products: GuardProductResult[];
}

// ─── 입력 (WO §7) ────────────────────────────────────────────────────────────

/** 표시량 — 공식 원문의 "표시량(N 단위 / 기준량 단위)" */
export interface DeclaredAmount {
  /** 예: 100 (억 CFU 의 100) */
  value: number;
  /** 예: '억 CFU' | 'CFU' | 'mg' */
  unit: string;
  /** 표시 기준량 수치. 예: 900 */
  basisAmount: number;
  /** 표시 기준량 단위. 예: 'mg' | 'g' */
  basisUnit: string;
}

/** 섭취 단위 — 공식 원문 SRV_USE 에서만 채운다. 원문에 없으면 null 로 둔다(추정 금지). */
export interface ServingSpec {
  /** 'capsule' | 'tablet' | 'stick' | 'sachet' | 'bottle' 등 */
  unitType: string;
  /** 1개 단위 중량. **원문에 없으면 null** — 이 값이 null 이면 파생 수치 생성 금지 */
  unitWeight: number | null;
  unitWeightUnit: string | null;
  /** 1회 섭취 개수 */
  unitsPerServing: number | null;
  /** 1일 섭취 횟수. 범위면 최소값(servingsPerDayMax 에 최대) */
  servingsPerDay: number | null;
  servingsPerDayMax?: number | null;
}

export interface GroundingInput {
  declaredAmount: DeclaredAmount | null;
  serving: ServingSpec | null;
  /**
   * 작성자가 선언한 "환산 허용" 여부. 가드는 이 값을 신뢰하지 않고 **독립 재계산**하여
   * 실제 근거(A-1)와 불일치하면 BLOCKED 한다.
   */
  calculationAllowed?: boolean;
  /** 원문에 연령별 섭취량이 있으면 원문 문자열 그대로 */
  ageBandsRaw?: string | null;
}

export interface GuardSourceInput {
  mainFunction: string;
  baseStandard: string;
  intake: string;
  caution: string;
  dosageForm: string;
}

export interface GuardProductInput {
  candidateId: string;
  productName: string;
  manufacturer: string;
  statementNo: string;
  source: GuardSourceInput;
  grounding: GroundingInput;
  drafts: {
    ko: string;
    en: string;
  };
  /** 'hff' | 'drug' | 'medical-device' | 'quasi-drug' */
  category?: string;
}

export interface GuardOptions {
  phase?: GuardPhase | 'all';
  /** true 면 REVIEW_REQUIRED 도 실패로 간주(exit code 1) */
  strict?: boolean;
}

export const GUARD_VERSION = 'product-description-guard@1.0.0';
