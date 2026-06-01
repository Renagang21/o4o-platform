/**
 * productionTemplates — GlycoPharm 제작 자료 템플릿 레지스트리
 *
 * WO-O4O-PRODUCTION-TEMPLATE-REGISTRY-CROSSSERVICE-PHASE2-J-V1 (2026-05-27)
 *
 * GlycoPharm 전용 POP / QR 제작 템플릿.
 * 당뇨 약국 서비스 특성에 맞춘 systemPrompt 를 사용한다.
 *
 * 범위:
 *   - POP 2개 (당뇨 정보형, 일반형)
 *   - QR 2개 (혈당 관리형, 제품 안내형)
 *   - blog 은 GlycoPharm 현재 미노출 (별도 WO 예정)
 *   - product-description: WO-O4O-MY-STORE-PRODUCT-DESCRIPTION-CROSSSERVICE-ALIGNMENT-V1 에서 추가
 *
 * 타입: @o4o/types/production-template (공통 canonical)
 * 사용처: StoreLibraryContentsPage → StartProductionModal → getTemplates prop
 */

import type { ProductionTemplate } from '@o4o/types/production-template';
import type { ProductionTarget } from '@o4o/types/production';

// ─── Registry ─────────────────────────────────────────────────────────────────

export const GLYCOPHARM_TEMPLATE_REGISTRY: ProductionTemplate[] = [

  // ─── POP (2개) ──────────────────────────────────────────────────────────────

  {
    id: 'glyco-pop-diabetes-info',
    target: 'pop',
    name: '당뇨 정보형',
    description: '혈당 관리·당뇨 식이 정보를 환자 눈높이에서 안내하는 스타일',
    style: '정보형',
    tags: ['A4', 'diabetes', 'patient', 'info'],
    layout: 'A4',
    forcedOptions: { length: 'medium', tone: 'friendly' },
    outputConstraints: {
      maxBodyLength: 250,
      allowedLengths: ['short', 'medium'],
      requiredFields: ['title', 'bullets', 'shortText'],
      layout: 'A4',
    },
    systemPromptOverride:
      '당뇨 환자를 위한 약국 POP 안내문을 작성합니다. ' +
      '혈당 관리, 식이 조절, 약 복용 등 당뇨 관련 정보를 ' +
      '환자가 이해하기 쉬운 말로 간결하게 안내하세요. ' +
      '전문 의학 용어는 최소화하고, 일상 생활과 연결되는 실천 팁을 포함합니다. ' +
      '과장된 효능 표현과 진단·처방 행위로 오해될 표현은 사용하지 마세요.',
    starterHtml:
      '<h2>제목을 입력하세요</h2>' +
      '<ul><li>핵심 정보 1</li><li>핵심 정보 2</li><li>핵심 정보 3</li></ul>' +
      '<p>안내 메시지 (30자 이내)</p>',
  },

  {
    id: 'glyco-pop-general',
    target: 'pop',
    name: '일반형',
    description: '당뇨 약국의 다양한 안내·홍보에 활용할 수 있는 범용 스타일',
    style: '범용형',
    tags: ['A4', 'general', 'pharmacy'],
    layout: 'A4',
    forcedOptions: { length: 'short', tone: 'concise' },
    outputConstraints: {
      maxBodyLength: 200,
      allowedLengths: ['short', 'medium'],
      requiredFields: ['title', 'bullets', 'shortText'],
      layout: 'A4',
    },
    systemPromptOverride:
      '약국 매장 안내용 POP 인쇄물을 작성합니다. ' +
      '제목은 15자 이내로 핵심 메시지를 간결하게 전달하고, ' +
      '핵심 포인트는 3개 이하의 짧은 불릿으로 정리하세요. ' +
      '고객이 한눈에 파악할 수 있도록 간결하고 명확하게 작성합니다.',
    starterHtml:
      '<h2>제목을 입력하세요</h2>' +
      '<ul><li>포인트 1</li><li>포인트 2</li><li>포인트 3</li></ul>' +
      '<p>본문 메시지 (30자 이내)</p>',
  },

  // ─── QR (2개) ──────────────────────────────────────────────────────────────

  {
    id: 'glyco-qr-glucose-management',
    target: 'qr',
    name: '혈당 관리형',
    description: 'QR 스캔 후 혈당 관리 정보를 연결하는 신뢰 중심 스타일',
    style: '정보형',
    tags: ['qr', 'glucose', 'diabetes', 'health'],
    forcedOptions: { length: 'short', tone: 'professional' },
    outputConstraints: {
      maxBodyLength: 150,
      allowedLengths: ['short'],
      requiredFields: ['title', 'shortText', 'summary'],
    },
    systemPromptOverride:
      'QR 코드 스캔 후 혈당 관리 정보를 안내하는 신뢰감 있는 안내문을 작성합니다. ' +
      '제목은 20자 이내, 설명은 50자 이내로 혈당 관리의 핵심 정보를 전달하세요. ' +
      '당뇨 관리의 중요성을 강조하되, 진단·처방으로 오해될 표현은 사용하지 마세요. ' +
      '약사가 직접 안내하는 신뢰감 있는 어조를 유지합니다.',
  },

  {
    id: 'glyco-qr-product-guide',
    target: 'qr',
    name: '제품 안내형',
    description: 'QR 스캔 후 혈당 측정기·건강 보조 제품을 소개하는 스타일',
    style: '제품형',
    tags: ['qr', 'product', 'glucometer', 'supplement'],
    forcedOptions: { length: 'short', tone: 'professional' },
    outputConstraints: {
      maxBodyLength: 150,
      allowedLengths: ['short'],
      requiredFields: ['title', 'shortText', 'summary'],
    },
    systemPromptOverride:
      'QR 코드 스캔 후 혈당 측정기 또는 당뇨 관련 제품을 소개하는 안내문을 작성합니다. ' +
      '제목은 20자 이내, 설명은 50자 이내로 제품의 주요 특징과 사용 방법을 안내하세요. ' +
      '제품명, 주요 기능, 상담 안내를 간결하게 포함하며, ' +
      '과장된 효능 표현은 사용하지 마세요.',
  },

  // ─── Product Description (2개) ─────────────────────────────────────────────
  // WO-O4O-MY-STORE-PRODUCT-DESCRIPTION-CROSSSERVICE-ALIGNMENT-V1
  // GlycoPharm 사용자-facing 문구는 "내 약국" 표현 유지 (약국 전용 서비스)
  // ⚠️ "내 매장"으로 일괄 치환 금지

  {
    id: 'glyco-product-desc-diabetes',
    target: 'product-description',
    name: '당뇨 관련 상품',
    description: '혈당 측정기·당뇨 관련 건강기능식품·CGM 등 약국 상품 상세설명',
    style: '약국 상품형',
    tags: ['pharmacy', 'diabetes', 'glucometer', 'product'],
    forcedOptions: { length: 'medium', tone: 'professional' },
    outputConstraints: {
      maxBodyLength: 500,
      allowedLengths: ['short', 'medium', 'long'],
      requiredFields: ['title', 'body'],
    },
    systemPromptOverride:
      '약국에서 판매하는 혈당 측정기, 당뇨 관련 건강기능식품, CGM 등 상품의 상세설명을 작성합니다. ' +
      '제품명, 주요 기능, 사용 대상, 복용/사용 방법을 명확하고 신뢰감 있게 안내하세요. ' +
      '과장된 효능 표현과 진단·처방 행위로 오해될 표현은 사용하지 마세요. ' +
      '약사가 환자에게 직접 설명하는 전문적이고 친근한 어조를 유지합니다.',
    starterHtml:
      '<h2>상품명</h2>' +
      '<p>주요 특징과 대상 고객을 간략히 소개합니다.</p>' +
      '<h3>제품 특징</h3>' +
      '<ul><li>특징 1</li><li>특징 2</li><li>특징 3</li></ul>' +
      '<h3>사용 방법</h3>' +
      '<p>사용 방법을 안내합니다.</p>',
  },

  {
    id: 'glyco-product-desc-general',
    target: 'product-description',
    name: '일반 약국 상품',
    description: '약국 취급 일반 의약품·건강식품·의료기기 범용 상세설명',
    style: '범용형',
    tags: ['pharmacy', 'general', 'health', 'product'],
    forcedOptions: { length: 'medium', tone: 'professional' },
    outputConstraints: {
      maxBodyLength: 500,
      allowedLengths: ['short', 'medium', 'long'],
      requiredFields: ['title', 'body'],
    },
    systemPromptOverride:
      '약국에서 취급하는 일반 의약품, 건강기능식품, 의료기기 등 상품의 상세설명을 작성합니다. ' +
      '제품의 주요 성분·기능·용도를 고객이 이해하기 쉽게 안내하세요. ' +
      '효능 과대 표현 없이 정확한 정보를 전달하며, ' +
      '복용 시 주의사항이나 약사 상담 안내를 포함합니다.',
    starterHtml:
      '<h2>상품명</h2>' +
      '<p>상품 소개를 작성합니다.</p>' +
      '<h3>주요 성분 및 기능</h3>' +
      '<ul><li>성분/기능 1</li><li>성분/기능 2</li></ul>' +
      '<h3>주의사항</h3>' +
      '<p>주의사항을 안내합니다.</p>',
  },

];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getTemplatesForTarget(target: ProductionTarget): ProductionTemplate[] {
  return GLYCOPHARM_TEMPLATE_REGISTRY.filter((t) => t.target === target);
}

export function findTemplate(id: string): ProductionTemplate | undefined {
  return GLYCOPHARM_TEMPLATE_REGISTRY.find((t) => t.id === id);
}
