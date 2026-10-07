/**
 * productionTemplates — K-Cosmetics 제작 자료 템플릿 레지스트리
 *
 * WO-O4O-PRODUCTION-TEMPLATE-REGISTRY-CROSSSERVICE-PHASE2-J-V1 (2026-05-27)
 *
 * K-Cosmetics 전용 POP / QR 제작 템플릿.
 * 화장품 매장 특성에 맞춘 systemPrompt 를 사용한다.
 * pharmacy / 약국 / 당뇨 관련 용어를 사용하지 않는다.
 *
 * 범위:
 *   - POP 2개 (뷰티 전문가형, 신제품 홍보형)
 *   - QR 2개 (제품 사용법형, 성분 안내형)
 *   - blog 은 K-Cosmetics 현재 미노출 (별도 WO 예정)
 *   - product-description: WO-O4O-MY-STORE-PRODUCT-DESCRIPTION-CROSSSERVICE-ALIGNMENT-V1 에서 추가
 *
 * 타입: @o4o/types/production-template (공통 canonical)
 * 사용처: StoreLibraryContentsPage → StartProductionModal → getTemplates prop
 */

import type { ProductionTemplate } from '@o4o/types/production-template';
import type { ProductionTarget } from '@o4o/types/production';

// ─── Registry ─────────────────────────────────────────────────────────────────

export const COSMETICS_TEMPLATE_REGISTRY: ProductionTemplate[] = [

  // ─── POP (2개) ──────────────────────────────────────────────────────────────

  {
    id: 'kcos-pop-beauty-expert',
    target: 'pop',
    name: '뷰티 전문가형',
    description: '피부 타입별 제품 추천과 전문 효능을 신뢰감 있게 전달하는 스타일',
    style: '전문형',
    tags: ['A4', 'beauty', 'skincare', 'professional'],
    layout: 'A4',
    forcedOptions: { length: 'medium', tone: 'professional' },
    outputConstraints: {
      maxBodyLength: 250,
      allowedLengths: ['short', 'medium'],
      requiredFields: ['title', 'bullets', 'shortText'],
      layout: 'A4',
    },
    systemPromptOverride:
      '화장품 매장의 뷰티 전문가 관점에서 POP 안내문을 작성합니다. ' +
      '피부 타입, 제품 효능, 주요 성분을 고객이 이해하기 쉽게 안내하세요. ' +
      '제목은 20자 이내로 제품의 핵심 가치를 전달하고, ' +
      '핵심 포인트는 3개 이하의 간결한 불릿으로 정리합니다. ' +
      '과장된 효능 표현이나 의학적 효과를 암시하는 표현은 사용하지 마세요.',
    starterHtml:
      '<h2>제목을 입력하세요</h2>' +
      '<ul><li>제품 특징 1</li><li>제품 특징 2</li><li>제품 특징 3</li></ul>' +
      '<p>고객 안내 메시지 (30자 이내)</p>',
  },

  {
    id: 'kcos-pop-new-product',
    target: 'pop',
    name: '신제품 홍보형',
    description: '신제품 출시·시즌 이벤트를 친근하게 알리는 프로모션 스타일',
    style: '홍보형',
    tags: ['A4', 'new-product', 'promotion', 'season'],
    layout: 'A4',
    forcedOptions: { length: 'short', tone: 'friendly' },
    outputConstraints: {
      maxBodyLength: 200,
      allowedLengths: ['short', 'medium'],
      requiredFields: ['title', 'bullets', 'shortText'],
      layout: 'A4',
    },
    systemPromptOverride:
      '화장품 매장의 신제품 출시 또는 프로모션을 알리는 POP 안내문을 작성합니다. ' +
      '제목에 신제품이나 이벤트의 핵심 메시지를 담고, ' +
      '고객의 호기심과 구매 욕구를 자극하는 친근한 어조로 작성하세요. ' +
      '혜택, 기간, 구매 방법을 명확하게 안내하며, ' +
      '허위·과장 표현은 사용하지 마세요.',
    starterHtml:
      '<h2>신제품 / 이벤트 제목</h2>' +
      '<ul><li>혜택 1</li><li>혜택 2</li></ul>' +
      '<p>이벤트 기간 또는 안내 메시지</p>',
  },

  // ─── QR (2개) ──────────────────────────────────────────────────────────────

  {
    id: 'kcos-qr-usage-guide',
    target: 'qr',
    name: '제품 사용법형',
    description: 'QR 스캔 후 올바른 제품 사용 순서와 팁을 안내하는 스타일',
    style: '안내형',
    tags: ['qr', 'usage', 'skincare', 'how-to'],
    forcedOptions: { length: 'short', tone: 'friendly' },
    outputConstraints: {
      maxBodyLength: 150,
      allowedLengths: ['short'],
      requiredFields: ['title', 'shortText', 'summary'],
    },
    systemPromptOverride:
      'QR 코드 스캔 후 화장품 제품의 올바른 사용법을 안내하는 안내문을 작성합니다. ' +
      '제목은 20자 이내, 설명은 50자 이내로 핵심 사용 순서를 전달하세요. ' +
      '친근하고 이해하기 쉬운 어조로 작성하며, ' +
      '제품명과 주요 사용 단계를 간결하게 포함합니다.',
  },

  {
    id: 'kcos-qr-ingredient-info',
    target: 'qr',
    name: '성분 안내형',
    description: 'QR 스캔 후 주요 성분과 기대 효과를 신뢰감 있게 설명하는 스타일',
    style: '정보형',
    tags: ['qr', 'ingredient', 'skincare', 'info'],
    forcedOptions: { length: 'short', tone: 'professional' },
    outputConstraints: {
      maxBodyLength: 150,
      allowedLengths: ['short'],
      requiredFields: ['title', 'shortText', 'summary'],
    },
    systemPromptOverride:
      'QR 코드 스캔 후 화장품 제품의 주요 성분과 기대 효과를 안내하는 안내문을 작성합니다. ' +
      '제목은 20자 이내, 설명은 50자 이내로 핵심 성분의 역할을 전달하세요. ' +
      '성분명과 기대 효과를 정확하게 안내하되, ' +
      '의학적 효과를 보장하는 표현은 사용하지 마세요.',
  },

  // ─── Product Description (2개) ─────────────────────────────────────────────
  // WO-O4O-MY-STORE-PRODUCT-DESCRIPTION-CROSSSERVICE-ALIGNMENT-V1
  // K-Cosmetics 사용자-facing 문구는 "내 매장" 표현 사용 (매장 서비스)
  // ⚠️ "내 약국" 또는 약국 전용 문구 사용 금지

  {
    id: 'kcos-product-desc-skincare',
    target: 'product-description',
    name: '스킨케어 상품',
    description: '세럼·크림·토너 등 기초 스킨케어 제품의 매장 상세설명',
    style: '스킨케어형',
    tags: ['cosmetics', 'skincare', 'serum', 'cream', 'product'],
    forcedOptions: { length: 'medium', tone: 'professional' },
    outputConstraints: {
      maxBodyLength: 500,
      allowedLengths: ['short', 'medium', 'long'],
      requiredFields: ['title', 'body'],
    },
    systemPromptOverride:
      '화장품 매장에서 판매하는 스킨케어 제품의 상세설명을 작성합니다. ' +
      '제품명, 주요 성분, 기대 효과, 사용 방법, 추천 피부 타입을 명확하고 매력적으로 안내하세요. ' +
      '고객이 제품을 신뢰하고 구매 결정을 내리도록 돕는 전문적인 어조를 사용합니다. ' +
      '의학적 치료 효과를 보장하는 표현은 사용하지 마세요.',
    starterHtml:
      '<h2>상품명</h2>' +
      '<p>제품의 핵심 가치를 소개합니다.</p>' +
      '<h3>주요 성분 및 기대 효과</h3>' +
      '<ul><li>성분/효과 1</li><li>성분/효과 2</li><li>성분/효과 3</li></ul>' +
      '<h3>사용 방법</h3>' +
      '<p>사용 순서와 방법을 안내합니다.</p>' +
      '<h3>추천 피부 타입</h3>' +
      '<p>적합한 피부 타입을 안내합니다.</p>',
  },

  {
    id: 'kcos-product-desc-general',
    target: 'product-description',
    name: '일반 화장품',
    description: '메이크업·바디케어·헤어 등 화장품 매장 범용 상세설명',
    style: '범용형',
    tags: ['cosmetics', 'makeup', 'body', 'hair', 'product'],
    forcedOptions: { length: 'medium', tone: 'friendly' },
    outputConstraints: {
      maxBodyLength: 500,
      allowedLengths: ['short', 'medium', 'long'],
      requiredFields: ['title', 'body'],
    },
    systemPromptOverride:
      '화장품 매장에서 판매하는 다양한 뷰티 제품의 상세설명을 작성합니다. ' +
      '제품의 특징, 주요 기능, 사용 방법을 친근하고 이해하기 쉽게 안내하세요. ' +
      '고객의 뷰티 니즈를 충족할 수 있도록 제품의 매력을 자연스럽게 전달합니다. ' +
      '허위·과장 표현 없이 정직하게 작성합니다.',
    starterHtml:
      '<h2>상품명</h2>' +
      '<p>제품을 간략히 소개합니다.</p>' +
      '<h3>제품 특징</h3>' +
      '<ul><li>특징 1</li><li>특징 2</li></ul>' +
      '<h3>사용 방법</h3>' +
      '<p>사용 방법을 안내합니다.</p>',
  },

];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getTemplatesForTarget(target: ProductionTarget): ProductionTemplate[] {
  return COSMETICS_TEMPLATE_REGISTRY.filter((t) => t.target === target);
}

export function findTemplate(id: string): ProductionTemplate | undefined {
  return COSMETICS_TEMPLATE_REGISTRY.find((t) => t.id === id);
}
