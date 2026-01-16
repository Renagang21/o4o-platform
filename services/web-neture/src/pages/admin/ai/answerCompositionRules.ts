/**
 * AI Answer Composition Rules
 * WO-AI-ANSWER-COMPOSITION-RULES-V1
 *
 * AI 응답 + Context Asset 배치·톤·비율 규칙 정의
 *
 * 핵심 원칙:
 * - "무엇을 노출할지(Context Asset)"는 해결됨
 * - 이 파일은 "어떻게 섞을지"를 규칙으로 고정
 *
 * Perplexity형 UX 원칙:
 * - AI 응답이 항상 주인공
 * - Context Asset은 보조 정보
 * - 광고처럼 보이면 실패, 정보처럼 느껴지면 성공
 */

import type { PurposeTag } from './contextAssetTypes';

// ===== 질문 유형 분류 =====
export type QuestionType = 'generic' | 'professional' | 'exploratory';

export interface QuestionTypeInfo {
  type: QuestionType;
  label: string;
  description: string;
  examples: string[];
  characteristics: string[];
}

export const QUESTION_TYPE_INFO: QuestionTypeInfo[] = [
  {
    type: 'generic',
    label: '범용 질문',
    description: '일반적인 지식/정보 질문',
    examples: [
      '아스피린 임상에 대한 최신 동향을 알려줘',
      '화장품 성분 안정성 기준이 뭐야?',
      '비타민 C의 효능은?',
    ],
    characteristics: ['정보 신뢰가 최우선', '구매 의도 낮음', '중립적 답변 기대'],
  },
  {
    type: 'professional',
    label: '전문/업무 질문',
    description: '실무 판단 목적의 전문적 질문',
    examples: [
      '약국에서 아스피린 대체제 추천 기준은?',
      '매장 진열 시 주의점은?',
      '원료 수급 시 확인해야 할 사항은?',
    ],
    characteristics: ['실무 판단 목적', '도메인 자산 필요', '전문가 관점 기대'],
  },
  {
    type: 'exploratory',
    label: '탐색/비교 질문',
    description: '제품/브랜드 비교 탐색 질문',
    examples: [
      '이 제품이랑 저 제품 차이는?',
      '어떤 브랜드가 더 안정적이야?',
      'A 성분과 B 성분 중 어떤 게 나아?',
    ],
    characteristics: ['비교 맥락', 'Context Asset 가치 큼', '구매 의도 있을 수 있음'],
  },
];

export function getQuestionTypeInfo(type: QuestionType): QuestionTypeInfo | undefined {
  return QUESTION_TYPE_INFO.find((info) => info.type === type);
}

// ===== Context Asset 배치 위치 규칙 =====
export type AssetPlacement = 'bottom' | 'bottom_with_cards' | 'parallel_cards';

export interface PlacementRule {
  questionType: QuestionType;
  placement: AssetPlacement;
  description: string;
}

export const PLACEMENT_RULES: PlacementRule[] = [
  {
    questionType: 'generic',
    placement: 'bottom',
    description: '응답 하단에만 배치 (최소 침해)',
  },
  {
    questionType: 'professional',
    placement: 'bottom_with_cards',
    description: '응답 하단 + 병렬 카드 허용',
  },
  {
    questionType: 'exploratory',
    placement: 'parallel_cards',
    description: '병렬 카드 우선 배치',
  },
];

export function getPlacementRule(questionType: QuestionType): PlacementRule | undefined {
  return PLACEMENT_RULES.find((rule) => rule.questionType === questionType);
}

// ===== 중요: 응답 중간 삽입 금지 (V1 고정) =====
export const PLACEMENT_RESTRICTIONS = {
  noMidContentInsertion: true, // 응답 중간 삽입 금지
  version: 'V1',
} as const;

// ===== 목적 태그별 노출 비율 규칙 =====
export interface PurposeTagExposureRule {
  purposeTag: PurposeTag;
  maxCount: number;
  condition?: string;
}

export const BASE_EXPOSURE_RULES: PurposeTagExposureRule[] = [
  { purposeTag: 'information', maxCount: 2 },
  { purposeTag: 'branding', maxCount: 1 },
  { purposeTag: 'conversion', maxCount: 1, condition: '구매/비교 질문에서만 허용' },
  { purposeTag: 'engagement', maxCount: 1 },
];

export const MAX_CARDS_PER_RESPONSE = 3;

// ===== 질문 유형별 목적 태그 허용 규칙 =====
export interface QuestionTypePurposeAllowance {
  questionType: QuestionType;
  allowedPurposeTags: PurposeTag[];
  disallowedPurposeTags: PurposeTag[];
  reason: string;
}

export const QUESTION_TYPE_PURPOSE_ALLOWANCE: QuestionTypePurposeAllowance[] = [
  {
    questionType: 'generic',
    allowedPurposeTags: ['information'],
    disallowedPurposeTags: ['branding', 'conversion', 'engagement'],
    reason: '범용 질문에서는 광고처럼 느껴질 요소 전부 배제',
  },
  {
    questionType: 'professional',
    allowedPurposeTags: ['information', 'branding'],
    disallowedPurposeTags: ['conversion'],
    reason: '전문 질문에서는 브랜드 정보까지 허용, 전환 유도는 금지',
  },
  {
    questionType: 'exploratory',
    allowedPurposeTags: ['information', 'branding', 'conversion', 'engagement'],
    disallowedPurposeTags: [],
    reason: '탐색/비교 질문에서는 모든 목적 태그 허용 (구매 의도 존재)',
  },
];

export function getAllowedPurposeTags(questionType: QuestionType): PurposeTag[] {
  const allowance = QUESTION_TYPE_PURPOSE_ALLOWANCE.find((a) => a.questionType === questionType);
  return allowance?.allowedPurposeTags || ['information'];
}

export function isTagAllowedForQuestion(questionType: QuestionType, tag: PurposeTag): boolean {
  const allowance = QUESTION_TYPE_PURPOSE_ALLOWANCE.find((a) => a.questionType === questionType);
  return allowance?.allowedPurposeTags.includes(tag) || false;
}

// ===== 톤 & 문구 규칙 =====
export interface ToneRule {
  type: 'forbidden' | 'allowed';
  expressions: string[];
  reason: string;
}

export const TONE_RULES: ToneRule[] = [
  {
    type: 'forbidden',
    expressions: [
      '지금 구매하세요',
      '특가',
      '추천드립니다',
      '최고의 선택',
      '놓치지 마세요',
      '한정 수량',
      '베스트셀러',
      '인기 상품',
      '지금 바로',
      '클릭하세요',
    ],
    reason: '광고성 문구로 신뢰 저하 유발',
  },
  {
    type: 'allowed',
    expressions: [
      '관련 자료',
      '추가로 참고할 수 있는 정보',
      '이와 관련된 자료로는…',
      '도움이 될 수 있는 내용',
      '참고할 만한 정보',
      '관련하여 확인할 수 있는 내용',
      '추가 정보',
      '함께 살펴볼 내용',
    ],
    reason: 'Perplexity형 톤 - 정보 제공 맥락 유지',
  },
];

export function getForbiddenExpressions(): string[] {
  return TONE_RULES.find((rule) => rule.type === 'forbidden')?.expressions || [];
}

export function getAllowedExpressions(): string[] {
  return TONE_RULES.find((rule) => rule.type === 'allowed')?.expressions || [];
}

// ===== 카드 UI 규칙 =====
export interface CardUIRule {
  rule: string;
  allowed: boolean;
  exception?: string;
}

export const CARD_UI_RULES: CardUIRule[] = [
  { rule: '배너 스타일', allowed: false },
  { rule: '강조 색 사용', allowed: false },
  { rule: '가격 노출', allowed: false, exception: 'conversion 질문에서만 허용' },
  { rule: '"광고" 라벨', allowed: false },
  { rule: '"관련 정보" 라벨', allowed: true },
  { rule: '"참고 자료" 라벨', allowed: true },
  { rule: '클릭 유도 CTA', allowed: false },
  { rule: '이미지 노출', allowed: true },
  { rule: '링크 제공', allowed: true },
];

// ===== 실험과의 관계 규칙 =====
export const EXPERIMENT_COMPOSITION_RULES = {
  // 실험에서 변경 가능한 것
  canVary: ['엔진 선택', '표현 방식', '카드 순서'],
  // 실험에서 변경 불가능한 것 (규칙 위에 고정)
  cannotVary: ['배치 위치', '톤 규칙', '목적 태그 허용 기준', '최대 카드 수'],
  principle: '규칙은 실험 위에 고정, 실험으로 규칙 변경 불가',
} as const;

// ===== 품질 루프 연결 - 규칙 위반 탐지 조건 =====
export interface ViolationCondition {
  id: string;
  name: string;
  description: string;
  severity: 'warning' | 'error';
}

export const VIOLATION_CONDITIONS: ViolationCondition[] = [
  {
    id: 'fallback_with_branding',
    name: 'Fallback + Branding 동시 발생',
    description: 'fallback_high 상태에서 branding 태그 카드가 노출됨',
    severity: 'warning',
  },
  {
    id: 'conversion_on_generic',
    name: 'Conversion on Generic',
    description: 'conversion 카드가 범용 질문에 노출됨',
    severity: 'error',
  },
  {
    id: 'excessive_cards',
    name: '과다 카드 노출',
    description: '평균 카드 수가 2개를 초과하여 지속됨',
    severity: 'warning',
  },
  {
    id: 'forbidden_expression',
    name: '금지 문구 사용',
    description: '금지된 광고성 문구가 응답에 포함됨',
    severity: 'error',
  },
  {
    id: 'mid_content_insertion',
    name: '응답 중간 삽입',
    description: 'Context Asset이 응답 중간에 삽입됨',
    severity: 'error',
  },
];

// ===== 응답 구성 기본 원칙 (고정) =====
export const COMPOSITION_PRINCIPLES = {
  // AI 응답 본문 규칙
  aiResponse: {
    mustBeComplete: true, // 항상 완결된 답변
    noAssetDependency: true, // Context Asset을 전제로 쓰지 않음
    noReferenceToAds: true, // "아래 광고 참고" 같은 문구 금지
  },
  // Context Asset 역할
  contextAsset: {
    role: 'supplementary', // 보조 정보
    notMainContent: true, // 주요 콘텐츠가 아님
  },
  // 성공 기준
  successCriteria: {
    looksLikeAd: false, // 광고처럼 보이면 실패
    feelsLikeInfo: true, // 정보처럼 느껴지면 성공
  },
} as const;

// ===== 금지 사항 명시 (V1 고정) =====
export const PROHIBITED_ACTIONS = [
  '질문별 규칙 자동 변경',
  '사용자 프로필 기반 조정',
  '광고주 문구 직접 노출',
  '클릭 유도 CTA',
  '응답 중간 Context Asset 삽입',
  '실험을 통한 규칙 변경',
] as const;

// ===== 전체 규칙 요약 타입 =====
export interface CompositionRulesSummary {
  version: string;
  lastUpdated: string;
  questionTypes: QuestionTypeInfo[];
  placementRules: PlacementRule[];
  exposureRules: PurposeTagExposureRule[];
  toneRules: ToneRule[];
  cardUIRules: CardUIRule[];
  violationConditions: ViolationCondition[];
  principles: typeof COMPOSITION_PRINCIPLES;
  prohibited: readonly string[];
}

export function getCompositionRulesSummary(): CompositionRulesSummary {
  return {
    version: 'V1',
    lastUpdated: '2026-01-17',
    questionTypes: QUESTION_TYPE_INFO,
    placementRules: PLACEMENT_RULES,
    exposureRules: BASE_EXPOSURE_RULES,
    toneRules: TONE_RULES,
    cardUIRules: CARD_UI_RULES,
    violationConditions: VIOLATION_CONDITIONS,
    principles: COMPOSITION_PRINCIPLES,
    prohibited: PROHIBITED_ACTIONS,
  };
}
