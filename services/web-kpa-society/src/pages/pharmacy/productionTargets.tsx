/**
 * productionTargets — 제작 진입 카탈로그 (Single Source of Truth)
 *
 * WO-O4O-KPA-STORE-PRODUCTION-ENTRY-UNIFY-V1
 *
 * "내 자료함" 에서 시작하는 두 진입 흐름이 공유하는 카탈로그:
 *   1. StartProductionModal — 자료 선택 후 진입 (source.items 채워짐)
 *   2. ProductionTypeSelectorModal — 자료 없이 곧장 유형 선택 (source.items 비어 있음)
 *
 * 두 모달의 target/route 정의 중복을 제거하고, router state payload 를 표준화한다.
 *
 * 4유형 화이트리스트 고정: POP / QR 코드 / 블로그 / 상품 상세설명
 * 디지털 사이니지는 의도적 제외 (KPA Signage 구조 freeze 보호).
 *
 * Router state 표준:
 *   navigate(meta.route, { state: buildProductionState({ target, source?, selectedTemplateId? }) })
 *
 * 수신측(StorePopPage / StoreQRPage / StoreProductDescriptionsPage / PharmacyBlogPage)은
 * source.items.length === 0 일 때 메뉴 직접 진입과 동일하게 동작 (early return 처리됨).
 *
 * WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-AI-FLOW-V1:
 *   AiContentModal 진입용 default AiMode 매핑(productionTargetToAiMode) 추가.
 *   AiContentModal 의 MODE_CONFIG 와 동기 — 추가 시 양쪽 갱신 필요.
 *
 * WO-O4O-STORE-PRODUCTION-TEMPLATE-REGISTRY-V1:
 *   ProductionTargetMeta에 templateCategory, outputConstraints, supportsTemplates, defaultTemplateId 추가.
 *   ProductionRouterState에 selectedTemplateId 추가.
 *   buildProductionState()에 selectedTemplateId 인자 추가.
 */

import { Megaphone, QrCode, BookOpen, FileText, type LucideIcon } from 'lucide-react';
import type { ProductionOutputConstraints } from './productionTemplates';
// WO-O4O-STORE-PRODUCTION-TYPES-COMMONIZATION-PHASE2-F-V1:
//   4 개 router state 타입의 canonical 출처는 @o4o/types/production.
//   기존 사용처 (이 파일에서 import 하던 코드들) 호환을 위해 re-export 유지.
import type {
  ProductionTarget,
  ProductionSourceItem,
  ProductionSource,
  ProductionRouterState,
} from '@o4o/types/production';

// ─── Types ────────────────────────────────────────────────────────────────────

// WO-O4O-STORE-PRODUCTION-TYPES-COMMONIZATION-PHASE2-F-V1:
//   ProductionTarget / ProductionSourceItem / ProductionSource / ProductionRouterState
//   정의를 @o4o/types/production 으로 이동 (canonical). 본 모듈에서는 호환을 위해 re-export.
export type { ProductionTarget, ProductionSourceItem, ProductionSource, ProductionRouterState };

export interface ProductionTargetMeta {
  key: ProductionTarget;
  label: string;
  /** 1-line description (유형 선택 모달용) */
  description: string;
  Icon: LucideIcon;
  /** Hex color for icon tint */
  iconColor: string;
  route: string;
  /**
   * WO-O4O-STORE-PRODUCTION-TEMPLATE-REGISTRY-V1:
   * template registry에서 이 target에 해당하는 category 키.
   * getTemplatesForTarget(templateCategory) 로 template 목록을 가져온다.
   */
  templateCategory: ProductionTarget;
  /**
   * template 선택 흐름 지원 여부.
   * true: StartProductionModal에서 template picker step 표시
   * false: template 선택 없이 바로 진입 (기존 동작 유지)
   */
  supportsTemplates: boolean;
  /**
   * 기본 template id (registry 첫 번째 항목과 동기).
   * template-less fallback에서 AiContentModal에 전달되는 기본값.
   */
  defaultTemplateId: string;
  /**
   * target 수준 출력 제약 (template 미선택 시 적용되는 기본값).
   * template 선택 시 template.outputConstraints가 우선한다.
   */
  outputConstraints?: ProductionOutputConstraints;
}

// ─── Catalog ──────────────────────────────────────────────────────────────────

export const PRODUCTION_TARGET_CATALOG: ProductionTargetMeta[] = [
  {
    key: 'pop',
    label: 'POP',
    description: '매장 내 게시용 인쇄물 (PDF)',
    Icon: Megaphone,
    iconColor: '#f59e0b',
    route: '/store/marketing/pop',
    templateCategory: 'pop',
    supportsTemplates: true,
    defaultTemplateId: 'pop-modern',
    outputConstraints: {
      maxBodyLength: 300,
      allowedLengths: ['short', 'medium'],
      requiredFields: ['title', 'bullets', 'shortText'],
    },
  },
  {
    key: 'qr',
    label: 'QR 코드',
    description: '매장 입구·제품 옆 부착용 QR',
    Icon: QrCode,
    iconColor: '#0ea5e9',
    route: '/store/marketing/qr',
    templateCategory: 'qr',
    supportsTemplates: true,
    defaultTemplateId: 'qr-product-intro',
    outputConstraints: {
      maxBodyLength: 150,
      allowedLengths: ['short'],
      requiredFields: ['title', 'shortText'],
    },
  },
  {
    key: 'blog',
    label: '블로그',
    description: '공개 콘텐츠 게시물',
    Icon: BookOpen,
    iconColor: '#16a34a',
    route: '/store/content/blog',
    templateCategory: 'blog',
    supportsTemplates: true,
    defaultTemplateId: 'blog-health-professional',
    outputConstraints: {
      requiredFields: ['html', 'title', 'summary'],
    },
  },
  {
    key: 'product-description',
    label: '상품 상세설명',
    description: '상품 카드/상세 페이지용 본문',
    Icon: FileText,
    iconColor: '#2563EB',
    route: '/store/marketing/product-descriptions',
    templateCategory: 'product-description',
    supportsTemplates: true,
    defaultTemplateId: 'desc-b2c-persuasion',
    outputConstraints: {
      requiredFields: ['html', 'title', 'bullets'],
    },
  },
];

export function findProductionTarget(key: ProductionTarget): ProductionTargetMeta | undefined {
  return PRODUCTION_TARGET_CATALOG.find((t) => t.key === key);
}

// ─── Router state helper ─────────────────────────────────────────────────────

// WO-O4O-STORE-PRODUCTION-TYPES-COMMONIZATION-PHASE2-F-V1:
//   ProductionRouterState 정의는 @o4o/types/production canonical. 본 모듈 상단에서 re-export.
//   selectedTemplateId 의 의미 (수신측이 findTemplate(selectedTemplateId) 로 조회 후 적용) 는 변경 없음.

/**
 * 표준 router state payload 빌더.
 * source 미지정 시 빈 items 로 진입 (메뉴 직접 진입과 동등).
 * selectedTemplateId 미지정 시 undefined (수신측에서 defaultTemplateId fallback).
 */
export function buildProductionState(opts: {
  target: ProductionTarget;
  source?: ProductionSource;
  selectedTemplateId?: string;
}): ProductionRouterState {
  return {
    production: {
      source: opts.source ?? { fromLibrary: 'contents', items: [] },
      target: opts.target,
      selectedTemplateId: opts.selectedTemplateId,
    },
  };
}

// ─── AiContentModal 진입용 매핑 ─────────────────────────────────────────────

/**
 * AiContentModal 의 MODE_CONFIG 와 1:1 대응되는 AiMode 키.
 * AiContentModal 내부 type AiMode 와 동일 (모달이 내부 type 만 export 하지 않으므로 string literal 로 정의).
 *
 * MODE_CONFIG 변경 시 동기 갱신 필요:
 *   packages/content-editor/src/components/AiContentModal.tsx:MODE_CONFIG
 */
export type AiModeForProduction =
  | 'customer_rewrite'
  | 'pop'
  | 'blog'
  | 'store_qr';

/**
 * 4유형 카드 → AiContentModal 초기 모드 매핑.
 *  pop                 → 'pop'           (outputType=pop)
 *  qr                  → 'store_qr'      (outputType=store_qr)
 *  blog                → 'blog'          (outputType=blog)
 *  product-description → 'customer_rewrite' (outputType=product_detail)
 */
// ─── composeSourceTextFromItems ─────────────────────────────────────────────

/**
 * ProductionSourceItem[] → AI 입력용 텍스트 변환.
 *
 * WO-O4O-STORE-PRODUCTION-MATERIALS-FLOW-REALIGN-V1
 *
 * 콘텐츠 화면에서 선택된 항목을 AiContentModal(initialText=...)에 자동 주입하는 용도.
 * CreateContentFromResourcesModal.composeSourceText() 패턴 참고.
 *
 * 권장 시작 문구: "다음 콘텐츠를 참고하여 매장 제작 자료 형태로 정리해 주세요."
 */
export function composeSourceTextFromItems(items: ProductionSourceItem[]): string {
  if (items.length === 0) return '';
  const lines: string[] = [
    '다음 콘텐츠를 참고하여 매장 제작 자료 형태로 정리해 주세요.',
    '',
  ];
  items.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.title}`);
    if (it.description) lines.push(`   설명: ${it.description}`);
    const originLabel =
      it.origin === 'direct' ? '매장 직접 작성'
      : it.origin === 'snapshot' ? '커뮤니티 콘텐츠'
      : '자료함';
    lines.push(`   출처: ${originLabel}`);
    lines.push('');
  });
  return lines.join('\n').trim();
}

export const PRODUCTION_TARGET_TO_AI_MODE: Record<ProductionTarget, AiModeForProduction> = {
  pop: 'pop',
  qr: 'store_qr',
  blog: 'blog',
  'product-description': 'customer_rewrite',
};
