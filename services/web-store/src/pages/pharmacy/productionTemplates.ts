/**
 * productionTemplates — 제작 자료 템플릿 레지스트리 (Single Source of Truth)
 *
 * WO-O4O-STORE-PRODUCTION-TEMPLATE-REGISTRY-V1
 *
 * 목적:
 *   모든 제작 target(POP/QR/블로그/상품설명)은 template 기반으로 생성된다.
 *   - AI는 빈 상태 생성기가 아니라 template를 채우는 역할
 *   - template = 콘텐츠 구조 + 문장 구조 + 레이아웃 + 출력 제약
 *   - 모든 후속 WO(POP/QR/Blog/ProductDesc)는 이 registry를 기준으로 확장
 *
 * 이번 WO 범위:
 *   - Registry 구조 SSOT 확립
 *   - 10개 seed template 등록 (구조 검증 목적, 디자인 완성 단계 아님)
 *   - target별 outputConstraints 정의
 *   - AiContentModal templateId 연결 준비
 *   - RichTextEditor starterHtml 연결 준비
 *
 * 후속 WO:
 *   WO-O4O-POP-TEMPLATE-WORKFLOW-V1 — A4/A5/카드 layout template + PDF renderer 반영
 *   WO-O4O-BLOG-TEMPLATE-WORKFLOW-V1 — blog starter HTML + RichTextEditor 자동 주입
 *   WO-O4O-QR-TEMPLATE-WORKFLOW-V1   — QR landing template + output constraint 강제
 *   WO-O4O-PRODUCT-DESCRIPTION-TEMPLATE-WORKFLOW-V1 — 상품설명 RichTextEditor 교체
 */

import type { ProductionTarget } from './productionTargets';
// WO-O4O-PRODUCTION-TEMPLATE-REGISTRY-CROSSSERVICE-PHASE2-J-V1:
//   타입 정의를 @o4o/types/production-template 으로 이동 (canonical).
//   local import: 함수 시그니처에서 사용. re-export: 기존 사용처 호환.
import type {
  LengthOption,
  ToneOption,
  ProductionOutputConstraints,
  ProductionTemplate,
} from '@o4o/types/production-template';
export type { LengthOption, ToneOption, ProductionOutputConstraints, ProductionTemplate };

// ─── Registry ─────────────────────────────────────────────────────────────────

/**
 * 제작 자료 템플릿 레지스트리 (SSOT).
 *
 * 등록 규칙:
 *   - id는 전역 유일, '{target}-{style}' 패턴
 *   - 각 target에 반드시 1개 이상 등록
 *   - 첫 번째 항목이 해당 target의 defaultTemplate
 *   - seed 단계: 구조/연결 검증 목적 (디자인/프롬프트 완성 단계 아님)
 */
export const PRODUCTION_TEMPLATE_REGISTRY: ProductionTemplate[] = [

  // ──────────────────────────────────────────────────────────────────────────
  // POP (3개)
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: 'pop-modern',
    target: 'pop',
    name: '현대적',
    description: '깔끔한 레이아웃에 핵심 메시지를 굵게 강조하는 현대적 스타일',
    style: '현대형',
    tags: ['A4', 'modern', 'bold'],
    layout: 'A4',
    forcedOptions: { length: 'short', tone: 'concise' },
    outputConstraints: {
      maxBodyLength: 200,
      allowedLengths: ['short', 'medium'],
      requiredFields: ['title', 'bullets', 'shortText'],
      layout: 'A4',
    },
    systemPromptOverride:
      '현대적이고 깔끔한 약국 POP 인쇄물을 작성합니다. ' +
      '제목은 15자 이내로 굵고 임팩트 있게, 핵심 포인트는 3개 이하의 짧은 불릿으로, ' +
      '하단 본문은 30자 이내 한 문장으로 마무리하세요. ' +
      '불필요한 수식어 없이 핵심만 전달합니다.',
    starterHtml:
      '<h2>제목을 입력하세요</h2>' +
      '<ul><li>핵심 포인트 1</li><li>핵심 포인트 2</li><li>핵심 포인트 3</li></ul>' +
      '<p>짧은 본문 메시지 (30자 이내)</p>',
  },

  {
    id: 'pop-soft',
    target: 'pop',
    name: '부드러운 스타일',
    description: '친근하고 따뜻한 톤으로 고객에게 다가가는 스타일',
    style: '친근형',
    tags: ['A4', 'friendly', 'warm'],
    layout: 'A4',
    forcedOptions: { length: 'medium', tone: 'friendly' },
    outputConstraints: {
      maxBodyLength: 250,
      allowedLengths: ['short', 'medium'],
      requiredFields: ['title', 'bullets', 'longText'],
      layout: 'A4',
    },
    systemPromptOverride:
      '고객에게 친근하게 다가가는 약국 POP 인쇄물을 작성합니다. ' +
      '제목은 친근한 어투로 20자 이내, 설명은 쉬운 말로 풀어쓰고, ' +
      '전문 용어는 최소화합니다. 고객이 한눈에 이해할 수 있도록 구성하세요.',
    starterHtml:
      '<h2>친근한 제목을 입력하세요</h2>' +
      '<p>고객을 위한 안내 메시지를 여기에 작성합니다.</p>' +
      '<ul><li>혜택 1</li><li>혜택 2</li></ul>',
  },

  {
    id: 'pop-pharmacy-pro',
    target: 'pop',
    name: '전문 약국형',
    description: '약사의 전문성을 강조하는 신뢰 중심 스타일',
    style: '전문형',
    tags: ['A4', 'professional', 'pharmacist', 'trust'],
    layout: 'A4',
    forcedOptions: { length: 'medium', tone: 'professional' },
    outputConstraints: {
      maxBodyLength: 300,
      allowedLengths: ['short', 'medium'],
      requiredFields: ['title', 'bullets', 'shortText', 'longText'],
      layout: 'A4',
    },
    systemPromptOverride:
      '약사의 전문성과 신뢰를 전달하는 약국 POP 인쇄물을 작성합니다. ' +
      '제목에 전문성을 담고, 효능/효과/주의사항을 구조적으로 안내하세요. ' +
      '과장 표현 없이 정확한 정보를 전달하며, 복약지도 관점을 유지합니다.',
    starterHtml:
      '<h2>전문 약국 안내</h2>' +
      '<p><strong>효능·효과:</strong> 여기에 효능을 입력하세요.</p>' +
      '<p><strong>복용 방법:</strong> 복용 방법을 입력하세요.</p>' +
      '<p><strong>주의사항:</strong> 주의사항을 입력하세요.</p>',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 블로그 (3개)
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: 'blog-health-professional',
    target: 'blog',
    name: '전문 정보형',
    description: '전문적인 건강·의약 정보를 체계적으로 전달하는 블로그 스타일',
    style: '전문형',
    tags: ['blog', 'health', 'professional', 'structured'],
    forcedOptions: { length: 'long', tone: 'professional' },
    outputConstraints: {
      requiredFields: ['html', 'title', 'summary'],
    },
    systemPromptOverride:
      '전문적인 건강·의약 정보를 체계적으로 전달하는 약국 블로그 글을 작성합니다. ' +
      '도입부(개요) → 핵심 내용(h2 섹션 2-3개) → 실천 방법 → 마무리 구조를 따르세요. ' +
      '출처 근거를 명시하고, 과장된 효능 표현을 피합니다. ' +
      '독자가 신뢰할 수 있는 전문가 관점의 글을 작성하세요.',
    starterHtml:
      '<h2>개요</h2>' +
      '<p>이 글에서 다룰 내용을 간단히 소개합니다.</p>' +
      '<h2>주요 내용</h2>' +
      '<p>핵심 정보를 여기에 작성합니다.</p>' +
      '<h2>실천 방법</h2>' +
      '<p>독자가 실천할 수 있는 구체적인 방법을 안내합니다.</p>' +
      '<h2>마무리</h2>' +
      '<p>핵심 내용을 요약하고 마무리합니다.</p>',
  },

  {
    id: 'blog-consumer-friendly',
    target: 'blog',
    name: '소비자 친화형',
    description: '일반 소비자가 쉽게 읽을 수 있는 친근한 블로그 스타일',
    style: '친근형',
    tags: ['blog', 'consumer', 'friendly', 'easy-read'],
    forcedOptions: { length: 'medium', tone: 'friendly' },
    outputConstraints: {
      requiredFields: ['html', 'title', 'summary'],
    },
    systemPromptOverride:
      '일반 소비자가 쉽게 읽고 공감할 수 있는 약국 블로그 글을 작성합니다. ' +
      '전문 용어는 쉬운 말로 풀어쓰고, 실생활과 연결되는 예시를 활용하세요. ' +
      '친근한 어투(~세요, ~합니다)를 유지하며, 독자가 행동으로 이어질 수 있도록 ' +
      '마지막에 간단한 실천 팁을 포함하세요.',
    starterHtml:
      '<h2>안녕하세요, 약사입니다 😊</h2>' +
      '<p>오늘은 여러분이 궁금해하셨던 내용을 쉽게 설명해 드리겠습니다.</p>' +
      '<h2>이런 경우에 도움이 돼요</h2>' +
      '<p>여기에 내용을 입력하세요.</p>' +
      '<h2>이렇게 해보세요</h2>' +
      '<ul><li>실천 팁 1</li><li>실천 팁 2</li></ul>',
  },

  {
    id: 'blog-pharmacist-column',
    target: 'blog',
    name: '약사 칼럼형',
    description: '약사의 경험과 관점을 담은 전문 칼럼 스타일',
    style: '칼럼형',
    tags: ['blog', 'column', 'pharmacist', 'opinion'],
    forcedOptions: { length: 'long', tone: 'professional' },
    outputConstraints: {
      requiredFields: ['html', 'title', 'summary'],
    },
    systemPromptOverride:
      '약사의 전문 지식과 현장 경험을 담은 칼럼 형식의 블로그 글을 작성합니다. ' +
      '서론(문제 제기 또는 현장 이야기) → 전문가 관점 → 독자에게 전하는 메시지 구조를 따르세요. ' +
      '1인칭 관점을 활용하여 신뢰감을 높이고, 독자가 공감할 수 있는 사례를 포함하세요.',
    starterHtml:
      '<h2>약사로서 자주 받는 질문이 있습니다</h2>' +
      '<p>칼럼 도입부를 여기에 작성합니다.</p>' +
      '<h2>전문가로서의 관점</h2>' +
      '<p>전문적인 내용을 여기에 작성합니다.</p>' +
      '<h2>여러분께 전하고 싶은 말</h2>' +
      '<p>마무리 메시지를 여기에 작성합니다.</p>',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // QR (2개)
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: 'qr-product-intro',
    target: 'qr',
    name: '제품 소개형',
    description: 'QR 스캔 후 제품 정보를 간결하게 소개하는 랜딩 스타일',
    style: '정보형',
    tags: ['qr', 'product', 'intro'],
    forcedOptions: { length: 'short', tone: 'professional' },
    outputConstraints: {
      maxBodyLength: 150,
      allowedLengths: ['short'],
      requiredFields: ['title', 'shortText', 'summary'],
    },
    systemPromptOverride:
      'QR 코드 스캔 직후 보여줄 제품 소개 안내문을 작성합니다. ' +
      '제목은 20자 이내, 스캔 직후 첫 문장(shortText)은 50자 이내로 핵심만 전달하세요. ' +
      '제품명, 주요 효능, 구매/상담 안내를 간결하게 포함합니다.',
  },

  {
    id: 'qr-event-cta',
    target: 'qr',
    name: '행동 유도형',
    description: '이벤트·프로모션 참여를 유도하는 CTA 중심 스타일',
    style: 'CTA형',
    tags: ['qr', 'event', 'cta', 'promotion'],
    forcedOptions: { length: 'short', tone: 'friendly' },
    outputConstraints: {
      maxBodyLength: 150,
      allowedLengths: ['short'],
      requiredFields: ['title', 'shortText', 'summary'],
    },
    systemPromptOverride:
      'QR 코드 스캔 직후 이벤트·프로모션 참여를 유도하는 안내문을 작성합니다. ' +
      '제목에 혜택/기간을 포함하고, 첫 문장(shortText)은 50자 이내 행동 유도 문구로 작성하세요. ' +
      '"지금 바로", "오늘만" 등 긴박감을 부여하는 표현을 적절히 활용합니다.',
  },

  {
    id: 'qr-health-info',
    target: 'qr',
    name: '건강정보형',
    description: '건강·의약 정보를 연결하는 신뢰 중심 안내 스타일',
    style: '건강형',
    tags: ['qr', 'health', 'info', 'pharmacist', 'trust'],
    forcedOptions: { length: 'short', tone: 'professional' },
    outputConstraints: {
      maxBodyLength: 150,
      allowedLengths: ['short'],
      requiredFields: ['title', 'shortText', 'summary'],
    },
    systemPromptOverride:
      'QR 코드 스캔 후 건강·의약 정보를 안내하는 신뢰감 있는 안내문을 작성합니다. ' +
      '제목은 20자 이내, 설명은 50자 이내로 핵심 건강 정보를 간결하게 전달하세요. ' +
      '"약사가 직접 안내합니다", "전문 건강 정보" 등 신뢰감을 주는 표현을 포함하고, ' +
      '과장 없이 정확한 정보를 제공합니다.',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 상품설명 (2개)
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: 'desc-b2c-persuasion',
    target: 'product-description',
    name: 'B2C 설득형',
    description: '소비자의 구매 결정을 돕는 설득력 있는 상품 상세설명',
    style: '설득형',
    tags: ['product', 'b2c', 'consumer', 'persuasion'],
    forcedOptions: { length: 'medium', tone: 'friendly' },
    outputConstraints: {
      requiredFields: ['html', 'title', 'bullets'],
    },
    systemPromptOverride:
      '소비자의 구매 결정을 돕는 상품 상세설명을 작성합니다. ' +
      '상품의 핵심 효능·특징을 소비자 관점에서 설명하고, ' +
      '주요 성분·용법·용량을 쉬운 말로 정리하세요. ' +
      '마지막에 "이런 분께 추천합니다" 항목을 포함하면 좋습니다. ' +
      '과장 표현과 허위 광고성 문구는 절대 사용하지 마세요.',
    starterHtml:
      '<h2>상품 소개</h2>' +
      '<p>상품에 대한 간단한 소개를 여기에 작성합니다.</p>' +
      '<h2>주요 효능·특징</h2>' +
      '<ul><li>효능/특징 1</li><li>효능/특징 2</li><li>효능/특징 3</li></ul>' +
      '<h2>용법·용량</h2>' +
      '<p>복용 방법을 여기에 작성합니다.</p>' +
      '<h2>이런 분께 추천합니다</h2>' +
      '<ul><li>추천 대상 1</li><li>추천 대상 2</li></ul>',
  },

  {
    id: 'desc-professional-spec',
    target: 'product-description',
    name: '전문 설명형',
    description: '전문가(약사·의료인)를 위한 성분·규격 중심의 상세설명',
    style: '전문형',
    tags: ['product', 'professional', 'spec', 'pharmacist'],
    forcedOptions: { length: 'long', tone: 'professional' },
    outputConstraints: {
      requiredFields: ['html', 'title', 'bullets'],
    },
    systemPromptOverride:
      '전문가(약사·의료인) 대상 의약품/건강기능식품 상세설명을 작성합니다. ' +
      '성분·함량, 효능·효과, 용법·용량, 주의사항, 금기사항, 보관방법을 ' +
      '구조화된 섹션으로 정리하세요. ' +
      '전문 용어를 정확하게 사용하고, 공식 허가 내용 기반으로 작성합니다.',
    starterHtml:
      '<h2>성분·함량</h2>' +
      '<p>주성분과 함량을 여기에 입력합니다.</p>' +
      '<h2>효능·효과</h2>' +
      '<p>공식 허가된 효능·효과를 여기에 입력합니다.</p>' +
      '<h2>용법·용량</h2>' +
      '<p>용법·용량을 여기에 입력합니다.</p>' +
      '<h2>주의사항</h2>' +
      '<p>주요 주의사항을 여기에 입력합니다.</p>' +
      '<h2>금기사항</h2>' +
      '<p>금기사항을 여기에 입력합니다.</p>' +
      '<h2>보관방법</h2>' +
      '<p>보관방법을 여기에 입력합니다.</p>',
  },
];

// ─── Helper functions ─────────────────────────────────────────────────────────

/**
 * target별 template 목록 반환.
 * StartProductionModal template picker에서 사용.
 */
export function getTemplatesForTarget(target: ProductionTarget): ProductionTemplate[] {
  return PRODUCTION_TEMPLATE_REGISTRY.filter((t) => t.target === target);
}

/**
 * templateId로 template 조회.
 * AiContentModal / ProductionMaterialEditorPage에서 사용.
 */
export function findTemplate(id: string): ProductionTemplate | undefined {
  return PRODUCTION_TEMPLATE_REGISTRY.find((t) => t.id === id);
}

/**
 * target의 기본 template 반환 (registry 첫 번째 항목).
 * template-less fallback에서 사용.
 */
export function getDefaultTemplate(target: ProductionTarget): ProductionTemplate | undefined {
  return PRODUCTION_TEMPLATE_REGISTRY.find((t) => t.target === target);
}
