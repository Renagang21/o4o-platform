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

/**
 * PRECHECK_INFO (V1.1) — **작성 전 가드의 상태 고지**.
 *   작성 전 가드는 위반을 검출하는 단계가 아니라 "작성자가 반드시 확인해야 할 상태"를 알리는 단계다.
 *   따라서 **최종 REVIEW 집계에 합산하지 않는다**(검수자가 실제 위험에 집중하도록).
 *   위험도 순: BLOCKED > REVIEW_REQUIRED > PASS/INFO > PRECHECK_INFO > NOT_APPLICABLE
 */
export type GuardStatus =
  | 'PASS'
  | 'INFO'
  | 'PRECHECK_INFO'
  | 'REVIEW_REQUIRED'
  | 'BLOCKED'
  | 'NOT_APPLICABLE';
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
  /** 작성 전 상태 고지 수 — 최종 REVIEW 집계에 포함되지 않음 */
  precheckInfoCount: number;
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

/**
 * 섭취 규격 — 공식 원문 SRV_USE 에서만 채운다. **원문에 없으면 null**(추정·역산 금지).
 *
 * V1.3 (100건 대량작업 진입 전 보강) — 세 층위를 **구분**한다.
 * 이전 모델은 `unitWeight` 만 있어 "1회 2캡슐(900mg)" 처럼 **1회 총중량만 주어진 원문**을
 * 표현할 수 없었다(실측: Lacto Bloom). 그 결과 근거가 있는데도 환산 불가로 처리했다.
 *
 * ```text
 * unitWeight          1개 단위 중량   ← 원문 명시 시에만. 없으면 per-capsule 역산 금지
 * unitsPerServing     1회 개수
 * servingTotalWeight  1회 총중량      ← 원문 명시 시에만
 * servingsPerDay      1일 횟수
 * dailyTotalWeight    1일 총중량      ← 원문 명시 시에만
 * ```
 *
 * **불변 원칙**: 세 중량은 서로에게서 **역산하지 않는다**.
 *   - `servingTotalWeight` 만 있고 `unitWeight` 가 없으면 → 1회 수치는 가능, **1단위당 수치는 금지**
 *     ("1회 2캡슐(900mg)" 에서 1캡슐=450mg 을 유도하려면 캡슐 균등 가정이 필요한데 원문에 없다)
 *   - 1일 총량은 **원문에 있거나**, 1회 총중량 × 1일 횟수가 **모두 원문 근거**일 때만 생성한다
 */
export interface ServingSpec {
  /** 'capsule' | 'tablet' | 'stick' | 'sachet' | 'bottle' 등 */
  unitType: string;
  /** 1개 단위 중량. **원문에 없으면 null** — null 이면 1단위당(per-capsule) 수치 생성 금지 */
  unitWeight: number | null;
  unitWeightUnit: string | null;
  /** 1회 섭취 개수 */
  unitsPerServing: number | null;
  /** 1회 총중량. **원문이 명시할 때만**(예: "1회 2캡슐(900mg)"). 역산 금지 */
  servingTotalWeight?: number | null;
  servingTotalWeightUnit?: string | null;
  /** 1일 섭취 횟수. 범위면 최소값(servingsPerDayMax 에 최대) */
  servingsPerDay: number | null;
  servingsPerDayMax?: number | null;
  /** 1일 총중량. **원문이 명시할 때만**. 역산 금지 */
  dailyTotalWeight?: number | null;
  dailyTotalWeightUnit?: string | null;
}

export interface GroundingInput {
  declaredAmount: DeclaredAmount | null;
  /** 표시 CFU 절대값 — 원문 파싱값과 교차 검증됨(PRE-SRC-CFU-*) */
  declaredCfu?: DeclaredCfu | null;
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
  /**
   * 보관 조건 원문(PRSRV_PD). **30-B 에서 발견된 구멍**: 이 필드가 없어서 초안의 보관 서술
   * ("실온 보관", "냉장 보관", "냉장 불필요")을 가드가 검증할 수 없었다.
   * 실측: `생생락 유산균` 은 원문이 **냉장(0~10도)** 을 지시한다 — 실온이라 단정하면 위반이다.
   */
  storage?: string;
  /** 유통기한 원문(DISTB_PD) */
  shelfLife?: string;
}

/** 표시 CFU 절대값. 작성 전 가드가 **원문 파싱값과 교차 검증**한다(불일치 = BLOCKED). */
export interface DeclaredCfu {
  /** 예: 1e10 (100억) */
  absolute: number;
}

export interface GuardProductInput {
  candidateId: string;
  productName: string;
  /**
   * 영문 제품명(음역). 공식 영문명은 원천에 없으므로 **작성자가 정한 표기**를 그대로 받는다.
   * 가드는 이 값을 **창작하지 않고**, 제품명 표기를 최상급 주장으로 오인하지 않는 데만 쓴다.
   * 실측(CP3): "Premium Lactic Acid Bacteria 17" 의 Premium 은 제품명이지 주장이 아니다.
   */
  productNameEn?: string;
  /** 공식 제조사명(ENTRPS, 한국어 법인명) */
  manufacturer: string;
  /**
   * 공식 영문 제조사명. **없으면 생략/null** — 가드는 영문명을 **창작하지 않는다**.
   * 있으면 en 초안과 정확히 대조. 없으면 en 에 제조사 표기 존재 여부만 확인(INFO).
   */
  manufacturerEn?: string | null;
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

/**
 * 1.1.0 — REVIEW 튜닝(WO-O4O-PRODUCT-DESCRIPTION-GROUNDING-GUARD-REVIEW-TUNING-V1).
 *   위험 신호(BLOCKED/REVIEW_REQUIRED)와 정보성·형식성 신호(INFO/PRECHECK_INFO)를 분리.
 *   **검출을 약화한 것이 아니라** 사람이 실제 위험에 집중하도록 분류를 바꾼 것이다.
 */
export const GUARD_VERSION = 'product-description-guard@1.1.0';
