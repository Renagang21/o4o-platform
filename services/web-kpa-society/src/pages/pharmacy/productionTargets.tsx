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
// WO-O4O-STORE-PRODUCTION-ROUTER-UTILS-COMMONIZATION-PHASE2-G-V1:
//   buildProductionState / composeSourceTextFromItems 공통화 → @o4o/store-ui-core.
//   본 모듈에서는 호환을 위해 re-export 유지.
import {
  buildProductionState as _buildProductionState,
  composeSourceTextFromItems as _composeSourceTextFromItems,
} from '@o4o/store-ui-core';

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

// WO-O4O-STORE-PRODUCTION-ROUTER-UTILS-COMMONIZATION-PHASE2-G-V1:
//   buildProductionState 정의는 @o4o/store-ui-core/productionUtils canonical.
//   기존 사용처 호환을 위해 re-export.
export const buildProductionState = _buildProductionState;

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

// WO-O4O-STORE-PRODUCTION-ROUTER-UTILS-COMMONIZATION-PHASE2-G-V1:
//   composeSourceTextFromItems 정의는 @o4o/store-ui-core/productionUtils canonical.
//   기존 사용처 호환을 위해 re-export.
export const composeSourceTextFromItems = _composeSourceTextFromItems;

export const PRODUCTION_TARGET_TO_AI_MODE: Record<ProductionTarget, AiModeForProduction> = {
  pop: 'pop',
  qr: 'store_qr',
  blog: 'blog',
  'product-description': 'customer_rewrite',
};
